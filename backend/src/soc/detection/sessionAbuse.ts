/**
 * Session & Token Abuse Detection
 * - Multi-IP token reuse (same token from 2+ IPs simultaneously)
 * - Token reuse after logout (revoked session detection)
 * - Rapid IP switching detection (3+ IPs in 5 minutes)
 */

import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { addRiskScore } from './riskScoring';

// In-memory map: tokenHash → Set<ip>
// Cleared periodically or on logout
const tokenIpMap = new Map<string, Set<string>>();

/** Hash a raw token for storage / lookup */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Record that a token was used from a given IP */
export async function checkTokenMultiIp(tokenHash: string, ip: string): Promise<void> {
  if (!tokenHash || !ip) return;

  let ips = tokenIpMap.get(tokenHash);
  if (!ips) {
    ips = new Set<string>();
    tokenIpMap.set(tokenHash, ips);
  }

  if (!ips.has(ip)) {
    ips.add(ip);
  }

  if (ips.size > 1) {
    const score = addRiskScore(ip, 'TOKEN_MULTI_IP');
    await createAlert(
      'TOKEN_MULTI_IP',
      AlertSeverity.HIGH,
      `Session token is being used from ${ips.size} different IPs simultaneously: [${[...ips].join(', ')}]`,
      { tokenHash: tokenHash.substring(0, 8) + '...', ips: [...ips], riskScore: score },
      score
    );
  }
}

/** Record a logout by inserting the token hash into RevokedSession */
export async function recordLogout(token: string, userId: string): Promise<void> {
  if (!token || !userId) return;
  const tokenHash = hashToken(token);
  tokenIpMap.delete(tokenHash);

  await prisma.revokedSession.upsert({
    where: { tokenHash },
    update: { revokedAt: new Date() },
    create: { tokenHash, userId, reason: 'LOGOUT' },
  }).catch(() => {}); // Non-blocking
}

/** Check if an incoming token has already been revoked (logout replay) */
export async function checkTokenReuseAfterLogout(token: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = hashToken(token);

  const revoked = await prisma.revokedSession.findUnique({ where: { tokenHash } });
  if (revoked) {
    const score = addRiskScore(revoked.userId, 'TOKEN_REUSE');
    await createAlert(
      'TOKEN_REUSE_AFTER_LOGOUT',
      AlertSeverity.CRITICAL,
      `A revoked session token was replayed for user ${revoked.userId}. Possible session hijacking.`,
      { userId: revoked.userId, revokedAt: revoked.revokedAt, reason: revoked.reason, riskScore: score },
      score
    );
    return true; // Caller should reject the request
  }
  return false;
}

/** Detect rapid IP switching — 3+ distinct IPs in 5 minutes */
export async function checkRapidIpSwitching(userId: string): Promise<void> {
  if (!userId) return;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const events = await prisma.securityEvent.findMany({
    where: {
      userId,
      eventType: { in: ['LOGIN_SUCCESS', 'API_KEY_USAGE'] },
      createdAt: { gte: fiveMinutesAgo },
    },
    distinct: ['ip'],
    select: { ip: true },
  });

  const ips = events.map(e => e.ip).filter(Boolean) as string[];
  if (ips.length >= 3) {
    const score = addRiskScore(userId, 'RAPID_IP_SWITCH');
    await createAlert(
      'RAPID_IP_SWITCHING',
      AlertSeverity.HIGH,
      `User ${userId} has been seen from ${ips.length} different IPs in the last 5 minutes: [${ips.join(', ')}]`,
      { userId, ips, riskScore: score },
      score
    );
  }
}
