/**
 * SOC Detection Rules
 * Enhanced with behavioral baselines, risk scoring, and correlation engine.
 * All existing checks preserved and upgraded.
 */

import prisma from '../../lib/prisma';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { addRiskScore, getRiskScore } from './riskScoring';
import { correlateAlerts } from './correlationEngine';
import { enrichIpIntelligence } from './ipIntelligence';
import { isInternalIp } from '../../lib/ipUtils';

// ── Brute Force ──────────────────────────────────────────────────────────────

export const checkBruteForce = async (ip: string) => {
  if (!ip) return;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const failedCount = await prisma.securityEvent.count({
    where: { eventType: 'LOGIN_FAILURE', ip, createdAt: { gte: fiveMinutesAgo } },
  });

  console.log(`[SOC] IP ${ip} — ${failedCount} failed logins in 5m`);

  if (failedCount >= 5) {
    const score = addRiskScore(ip, 'BRUTE_FORCE');
    await createAlert(
      'BRUTE_FORCE',
      AlertSeverity.HIGH,
      `${failedCount} failed logins from IP ${ip} in the last 5 minutes.`,
      { ip, failedCount, riskScore: score },
      score
    );
    await correlateAlerts(undefined, ip);
  }
};

// ── Multiple IP Login ─────────────────────────────────────────────────────────

export const checkMultiIpLogin = async (userId: string) => {
  if (!userId) return;

  const lastHour = new Date(Date.now() - 60 * 60 * 1000);

  const events = await prisma.securityEvent.findMany({
    where: { eventType: 'LOGIN_SUCCESS', userId, createdAt: { gte: lastHour } },
    select: { ip: true },
    distinct: ['ip'],
  });

  const ips = events
    .map(e => e.ip)
    .filter((ip): ip is string => !!ip && !isInternalIp(ip));

  if (ips.length >= 3) {
    const score = addRiskScore(userId, 'MULTI_IP_LOGIN');
    await createAlert(
      'MULTIPLE_IPS',
      AlertSeverity.MEDIUM,
      `User ${userId} logged in from ${ips.length} distinct IPs in the last hour.`,
      { userId, ips, riskScore: score },
      score
    );
    await correlateAlerts(userId, undefined);
  }
};

// ── API Rate Spikes ───────────────────────────────────────────────────────────

export const checkApiSpikes = async (userId: string) => {
  if (!userId) return;

  const lastMinute = new Date(Date.now() - 60 * 1000);
  const rateLimitEvents = await prisma.securityEvent.count({
    where: { eventType: 'RATE_LIMIT', userId, createdAt: { gte: lastMinute } },
  });

  if (rateLimitEvents > 10) {
    const score = addRiskScore(userId, 'API_SPIKE');
    await createAlert(
      'API_SPIKE',
      AlertSeverity.HIGH,
      `User ${userId} triggered rate limits ${rateLimitEvents}× in 1 minute.`,
      { userId, rateLimitEvents, riskScore: score },
      score
    );
  }
};

// ── Unusual Geolocation ───────────────────────────────────────────────────────

export const checkUnusualGeolocation = async (ip: string, userId: string) => {
  if (!ip || !userId) return;

  try {
    const geo = await enrichIpIntelligence(ip);
    if (!geo) return;

    const { country, city, lat, lon } = geo;

    // Find a previous login that actually has geo metadata.
    // This avoids missing alerts when the prior login was from localhost/private IP
    // (no geo enrichment) and the next login is public/VPN.
    const prevLogins = await prisma.securityEvent.findMany({
      where: { eventType: 'LOGIN_SUCCESS', userId, ip: { not: ip } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { metadata: true },
    });
    const prevWithGeo = prevLogins.find(e => {
      const m: any = e.metadata;
      return m?.geo?.country && m?.geo?.lat !== undefined && m?.geo?.lon !== undefined;
    });

    // Find the latest login event for this user/IP and update it with geo data
    const latestEvent = await prisma.securityEvent.findFirst({
      where: { eventType: 'LOGIN_SUCCESS', userId, ip },
      orderBy: { createdAt: 'desc' },
    });

    if (latestEvent) {
      await prisma.securityEvent.update({
        where: { id: latestEvent.id },
        data: { 
          metadata: { 
            ...(latestEvent.metadata as any || {}),
            geo: { country, city, lat, lon, ip } 
          } 
        },
      });
    }

    if (!prevWithGeo) return;

    const prevMeta = prevWithGeo.metadata as any;
    if (prevMeta?.geo?.country && prevMeta.geo.country !== country) {
      const score = addRiskScore(userId, 'UNUSUAL_GEO');
      await createAlert(
        'UNUSUAL_GEO',
        AlertSeverity.MEDIUM,
        `User ${userId} logged in from ${country} (${city}). Previous country: ${prevMeta.geo.country}.`,
        {
          userId,
          currentLoc: { country, city, ip, lat, lon },
          previousLoc: { country: prevMeta.geo.country },
          riskScore: score,
        },
        score
      );
      await correlateAlerts(userId, ip);
    }
  } catch (error) {
    console.error('[SOC] Geolocation check failed:', error);
  }
};

// ── Internal → External Login Signal ──────────────────────────────────────────
// A pragmatic dev-friendly alert: if a user previously logged in from an internal IP
// (no geo), then later logs in from a public IP, raise a low/medium signal.
export const checkInternalToExternalLogin = async (ip: string, userId: string) => {
  if (!ip || !userId) return;
  if (isInternalIp(ip)) return;

  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.securityEvent.findMany({
    where: {
      eventType: 'LOGIN_SUCCESS',
      userId,
      createdAt: { gte: lastHour },
      ip: { not: ip },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { ip: true },
  });

  const priorInternal = recent.find(e => e.ip && isInternalIp(e.ip));
  if (!priorInternal?.ip) return;

  const score = addRiskScore(userId, 'MULTI_IP_LOGIN');
  await createAlert(
    'MULTIPLE_IPS',
    AlertSeverity.LOW,
    `User ${userId} logged in from an internal IP and then from a public IP (${ip}) within the last hour.`,
    { userId, from: priorInternal.ip, to: ip, riskScore: score },
    score
  );
};

// ── Credential Stuffing ───────────────────────────────────────────────────────

export const checkCredentialStuffing = async (ip: string) => {
  if (!ip) return;

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const failedEvents = await prisma.securityEvent.findMany({
    where: { eventType: 'LOGIN_FAILURE', ip, createdAt: { gte: tenMinutesAgo } },
    select: { metadata: true },
  });

  const uniqueEmails = new Set(
    failedEvents.map(e => (e.metadata as any)?.email).filter(Boolean)
  );

  console.log(`[SOC] IP ${ip} — ${uniqueEmails.size} unique emails in 10m`);

  if (uniqueEmails.size >= 5) {
    const score = addRiskScore(ip, 'CREDENTIAL_STUFFING');
    await createAlert(
      'CREDENTIAL_STUFFING',
      AlertSeverity.CRITICAL,
      `Credential stuffing: ${uniqueEmails.size} different emails tried from IP ${ip} in 10 minutes.`,
      { ip, emailCount: uniqueEmails.size, emails: Array.from(uniqueEmails), riskScore: score },
      score
    );
    await correlateAlerts(undefined, ip);
  }
};

// ── API Key Leakage ───────────────────────────────────────────────────────────

export const checkApiKeyLeakage = async (apiKeyId: string) => {
  if (!apiKeyId) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const usageEvents = await prisma.securityEvent.findMany({
    where: {
      eventType: 'API_KEY_USAGE',
      metadata: { path: ['apiKeyId'], equals: apiKeyId },
      createdAt: { gte: oneHourAgo },
    },
    select: { ip: true },
    distinct: ['ip'],
  });

  if (usageEvents.length >= 3) {
    const score = addRiskScore(apiKeyId, 'API_KEY_LEAKAGE');
    await createAlert(
      'API_KEY_LEAKAGE',
      AlertSeverity.CRITICAL,
      `API Key ${apiKeyId} used from ${usageEvents.length} different IPs in the last hour.`,
      { apiKeyId, ipCount: usageEvents.length, ips: usageEvents.map(e => e.ip), riskScore: score },
      score
    );
  }
};

// ── Suspicious User Agent ─────────────────────────────────────────────────────

export const checkSuspiciousUA = async (userId: string, currentUA: string) => {
  if (!userId || !currentUA) return;

  const lastLogins = await prisma.securityEvent.findMany({
    where: { eventType: 'LOGIN_SUCCESS', userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { userAgent: true },
  });

  if (lastLogins.length >= 3 && !lastLogins.some(l => l.userAgent === currentUA)) {
    const isBot = /curl|python|postman|insomnia|go-http|wget|java\//i.test(currentUA);
    const score = addRiskScore(userId, isBot ? 'SUSPICIOUS_UA_BOT' : 'SUSPICIOUS_UA_NEW');

    await createAlert(
      'SUSPICIOUS_UA',
      isBot ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
      `Unusual device for user ${userId}. UA: "${currentUA}".${isBot ? ' Detected as automated tool.' : ''}`,
      { userId, currentUA, isBot, riskScore: score },
      score
    );
    await correlateAlerts(userId, undefined);
  }
};
