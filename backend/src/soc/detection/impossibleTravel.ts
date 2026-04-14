/**
 * Impossible Travel Detection
 * Uses Haversine formula to compute distance between two geo coordinates.
 * If a user logs in from two locations that are physically impossible to
 * travel between in the observed time window, fire a CRITICAL alert.
 */

import prisma from '../../lib/prisma';
import { enrichIpIntelligence } from './ipIntelligence';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { addRiskScore } from './riskScoring';

const MAX_SPEED_KMH = 900;   // ~commercial aircraft speed
const MIN_DISTANCE_KM = 500; // Ignore short hops (same city, VPN handoff)

/** Haversine formula — returns distance in km between two lat/lon pairs */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkImpossibleTravel(userId: string, ip: string): Promise<void> {
  if (!userId || !ip) return;

  const currentGeo = await enrichIpIntelligence(ip);
  if (!currentGeo || !currentGeo.lat || !currentGeo.lon) {
    console.log(`[SOC] ImpossibleTravel skipped: No geo for current IP ${ip}`);
    return;
  }

  // Find the most recent successful login from a DIFFERENT IP, with geo data
  const prevLogin = await prisma.securityEvent.findFirst({
    where: {
      eventType: 'LOGIN_SUCCESS',
      userId,
      ip: { not: ip },
    },
    orderBy: { createdAt: 'desc' },
    select: { ip: true, createdAt: true, metadata: true },
  });

  if (!prevLogin) {
    console.log(`[SOC] ImpossibleTravel skipped: No previous login with geo found for user ${userId}`);
    return;
  }

  const prevMeta = prevLogin.metadata as any;
  const prevLat: number | undefined = prevMeta?.geo?.lat;
  const prevLon: number | undefined = prevMeta?.geo?.lon;
  const prevCountry: string | undefined = prevMeta?.geo?.country;
  const prevCity: string | undefined = prevMeta?.geo?.city;

  if (prevLat === undefined || prevLon === undefined) {
    console.log(`[SOC] ImpossibleTravel skipped: Previous login meta missing coordinates for user ${userId}`);
    return;
  }

  const distanceKm = haversineKm(prevLat, prevLon, currentGeo.lat, currentGeo.lon);
  
  const timeDeltaMs = Date.now() - new Date(prevLogin.createdAt).getTime();
  const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);
  const requiredHours = distanceKm / MAX_SPEED_KMH;

  console.log(`[SOC] ImpossibleTravel check: ${userId} moved ${Math.round(distanceKm)}km (${prevCountry} -> ${currentGeo.country}) in ${Math.round(timeDeltaHours * 60)}min. Speed req: ${Math.round(distanceKm / timeDeltaHours)}km/h. Max: ${MAX_SPEED_KMH}`);

  if (distanceKm < MIN_DISTANCE_KM) {
    console.log(`[SOC] ImpossibleTravel: Distance ${Math.round(distanceKm)}km < ${MIN_DISTANCE_KM}km. Skipping.`);
    return;
  }

  if (timeDeltaHours < requiredHours) {
    const timeDeltaMinutes = Math.round(timeDeltaMs / 60000);
    const score = addRiskScore(userId, 'IMPOSSIBLE_TRAVEL');

    await createAlert(
      'IMPOSSIBLE_TRAVEL',
      AlertSeverity.CRITICAL,
      `Impossible travel detected for user ${userId}. ` +
        `${Math.round(distanceKm)} km in ${timeDeltaMinutes} min ` +
        `(${prevCity ?? '?'}, ${prevCountry ?? '?'} → ${currentGeo.city}, ${currentGeo.country}).`,
      {
        userId,
        distanceKm: Math.round(distanceKm),
        timeDeltaMinutes,
        from: { ip: prevLogin.ip, country: prevCountry, city: prevCity, lat: prevLat, lon: prevLon },
        to: { ip, country: currentGeo.country, city: currentGeo.city, lat: currentGeo.lat, lon: currentGeo.lon },
        riskScore: score,
      },
      score
    );
  }
}
