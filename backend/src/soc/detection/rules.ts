import prisma from '../../lib/prisma';
import { AlertSeverity, createAlert } from '../alerts/alertService';

export const checkBruteForce = async (ip: string) => {
  if (!ip) return;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const failedCount = await prisma.securityEvent.count({
    where: {
      eventType: 'LOGIN_FAILURE',
      ip,
      createdAt: { gte: fiveMinutesAgo }
    }
  });

  console.log(`[SOC Debug] IP ${ip} has ${failedCount} total failed logins in 5m`);

  if (failedCount >= 5) {
    await createAlert(
      'BRUTE_FORCE', 
      AlertSeverity.HIGH, 
      `More than ${failedCount} failed logins from IP: ${ip} in the last 5 minutes.`, 
      { ip, failedCount }
    );
  }
};

export const checkMultiIpLogin = async (userId: string) => {
  if (!userId) return;

  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  
  const events = await prisma.securityEvent.findMany({
    where: {
      eventType: 'LOGIN_SUCCESS',
      userId,
      createdAt: { gte: lastHour }
    },
    select: { ip: true },
    distinct: ['ip']
  });

  // Filter out local IPs
  const ips = events.map(e => e.ip).filter(ip => ip && !ip.includes('127.0.0.1') && ip !== '::1');

  if (ips.length >= 3) {
    await createAlert(
      'MULTIPLE_IPS', 
      AlertSeverity.MEDIUM, 
      `User ${userId} logged in from >= 3 distinct IPs in the last hour.`, 
      { userId, ips }
    );
  }
};

export const checkApiSpikes = async (userId: string) => {
  if (!userId) return;

  const lastMinute = new Date(Date.now() - 60 * 1000);
  const rateLimitEvents = await prisma.securityEvent.count({
    where: {
      eventType: 'RATE_LIMIT',
      userId,
      createdAt: { gte: lastMinute }
    }
  });

  if (rateLimitEvents > 10) {
    await createAlert(
      'API_SPIKE', 
      AlertSeverity.HIGH, 
      `User ${userId} hit rate limit constraints ${rateLimitEvents} times in 1 minute.`, 
      { userId, rateLimitEvents }
    );
  }
};

export const checkUnusualGeolocation = async (ip: string, userId: string) => {
  if (!ip) return;

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();

    if (data.status !== 'success') return;

    const { country, city, isp } = data;

    // Retrieve the previous successful login to compare country
    const prevLogin = await prisma.securityEvent.findFirst({
      where: {
        eventType: 'LOGIN_SUCCESS',
        userId,
        ip: { not: ip }
      },
      orderBy: { createdAt: 'desc' }
    });

    // If there is no previous login or no metadata we can't compare geolocation, but we record it for the future
    if (!prevLogin) return;
    
    const prevMetadata = prevLogin.metadata as any;
    if (prevMetadata?.geo?.country && prevMetadata.geo.country !== country) {
      await createAlert(
        'UNUSUAL_GEO',
        AlertSeverity.MEDIUM,
        `User ${userId} logged in from a new country: ${country} (City: ${city}). Previous country: ${prevMetadata.geo.country}.`,
        { userId, currentLoc: { country, city, ip }, previousLoc: { country: prevMetadata.geo.country } }
      );
    }
  } catch (error) {
    console.error('Failed to resolve IP Geolocation:', error);
  }
};

export const checkCredentialStuffing = async (ip: string) => {
  if (!ip) return;

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  // Find failed logins from this IP and count distinct emails
  const failedEvents = await prisma.securityEvent.findMany({
    where: {
      eventType: 'LOGIN_FAILURE',
      ip,
      createdAt: { gte: tenMinutesAgo }
    },
    select: { metadata: true }
  });

  const uniqueEmails = new Set(
    failedEvents
      .map(e => (e.metadata as any)?.email)
      .filter(Boolean)
  );

  console.log(`[SOC Debug] IP ${ip} has ${uniqueEmails.size} unique emails attempted in 10m`);

  if (uniqueEmails.size >= 5) {
    await createAlert(
      'CREDENTIAL_STUFFING',
      AlertSeverity.CRITICAL,
      `Potential Credential Stuffing: ${uniqueEmails.size} different emails attempted from IP: ${ip} in 10 minutes.`,
      { ip, emailCount: uniqueEmails.size, emails: Array.from(uniqueEmails) }
    );
  }
};

export const checkApiKeyLeakage = async (apiKeyId: string) => {
  if (!apiKeyId) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const usageEvents = await prisma.securityEvent.findMany({
    where: {
      eventType: 'API_KEY_USAGE',
      metadata: { path: ['apiKeyId'], equals: apiKeyId },
      createdAt: { gte: oneHourAgo }
    },
    select: { ip: true },
    distinct: ['ip']
  });

  if (usageEvents.length >= 3) {
    await createAlert(
      'API_KEY_LEAKAGE',
      AlertSeverity.CRITICAL,
      `Security Alert: API Key ${apiKeyId} is being used from ${usageEvents.length} different IP addresses in the last hour.`,
      { apiKeyId, ipCount: usageEvents.length, ips: usageEvents.map(e => e.ip) }
    );
  }
};

export const checkSuspiciousUA = async (userId: string, currentUA: string) => {
  if (!userId || !currentUA) return;

  const lastLogins = await prisma.securityEvent.findMany({
    where: {
      eventType: 'LOGIN_SUCCESS',
      userId
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { userAgent: true }
  });

  // Simple heuristic: if the previous 5 logins exist and NONE of them match the current UA
  if (lastLogins.length >= 3 && !lastLogins.some(l => l.userAgent === currentUA)) {
    // Check if current is a common script/bot UA
    const isBot = /curl|python|postman|insomnia|go-http/i.test(currentUA);
    
    await createAlert(
      'SUSPICIOUS_UA',
      isBot ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
      `Unusual device change for user ${userId}. Current User-Agent: ${currentUA}. \${isBot ? 'Detected as automated tool.' : ''}`,
      { userId, currentUA, isBot }
    );
  }
};

