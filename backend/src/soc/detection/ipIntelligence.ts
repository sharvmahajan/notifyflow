/**
 * IP Intelligence Module
 * Enriches IP metadata via ip-api.com (free, no API key needed).
 * Detects VPN, hosting providers, and TOR exit nodes.
 */

import { addRiskScore } from './riskScoring';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { isInternalIp } from '../../lib/ipUtils';

export interface IpGeoData {
  status: string;
  message?: string;
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lon: number;
  isp: string;
  proxy: boolean;    // VPN / proxy
  hosting: boolean;  // Datacenter / cloud / TOR exit
  query?: string;
}

// Simple in-memory cache to avoid hammering the free API
const geoCache = new Map<string, { data: IpGeoData; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Fetch and cache geo+intelligence data for an IP */
export async function enrichIpIntelligence(ip: string): Promise<IpGeoData | null> {
  // Skip private/loopback IPs (including Docker networks and APIPA)
  if (isInternalIp(ip)) {
    return null;
  }

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      // ip-api free tier supports HTTP only (HTTPS requires a paid key).
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,lat,lon,isp,proxy,hosting,query`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const data = await response.json() as IpGeoData;
    if (data.status !== 'success') {
      console.warn(
        `[SOC] Geo lookup failed for IP ${ip}: status=${data.status}${data.message ? ` message=${data.message}` : ''}`
      );
      return null;
    }

    geoCache.set(ip, { data, cachedAt: Date.now() });
    console.log(`[SOC] Geo lookup for ${ip}: ${data.country} (${data.city}) - ISP: ${data.isp}`);
    return data;
  } catch (err: any) {
    console.warn(`[SOC] Geo lookup error for IP ${ip}: ${err.message}`);
    return null; // Non-blocking — geo failure should never break auth
  }
}

/** Check if IP is a VPN/proxy/hosting datacenter and fire alert if so */
export async function checkIpReputation(ip: string, userId?: string): Promise<void> {
  if (!ip) return;

  const geo = await enrichIpIntelligence(ip);
  if (!geo) return;

  if (geo.proxy || geo.hosting) {
    const key = userId || ip;
    const score = addRiskScore(key, 'VPN_TOR_DETECTED');
    const type = geo.proxy ? 'VPN/Proxy' : 'Hosting/Datacenter';

    await createAlert(
      'VPN_TOR_DETECTED',
      AlertSeverity.MEDIUM,
      `IP ${ip} detected as ${type} (ISP: ${geo.isp}, ${geo.city}, ${geo.country}). Risk score: ${score}.`,
      {
        ip,
        userId,
        ipType: type,
        isp: geo.isp,
        country: geo.country,
        city: geo.city,
        riskScore: score,
      },
      score
    );
  }
}
