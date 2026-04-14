/**
 * SOAR — Security Orchestration, Automation & Response
 * Automated response actions triggered by high-severity alerts.
 */

import prisma from '../../lib/prisma';
import { logger } from '../logging/logger';
import { clearRiskScore } from '../detection/riskScoring';

export interface SoarAction {
  type: 'BLOCK_IP' | 'REVOKE_KEY' | 'INVALIDATE_SESSIONS' | 'FORCE_PASSWORD_RESET';
  target: string;
  reason: string;
  alertId?: string;
}

import { normalizeIp } from '../../lib/ipUtils';

/** Block an IP address (stores in BlockedIp, checked by auth middleware) */
export async function blockIp(ip: string, reason: string, alertId?: string, expiresInHours = 24): Promise<void> {
  if (!ip) return;

  const normalizedIp = normalizeIp(ip);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await prisma.blockedIp.upsert({
    where:  { ip: normalizedIp },
    update: { reason, blockedAt: new Date(), expiresAt },
    create: { ip: normalizedIp, reason, expiresAt },
  });

  clearRiskScore(ip);

  logger.warn('[SOAR] IP blocked', {
    eventType: 'SOAR_BLOCK_IP',
    ip,
    metadata: { reason, alertId, expiresAt },
  });
}

/** Revoke an API key by ID */
export async function revokeApiKey(keyId: string, reason: string, alertId?: string): Promise<void> {
  if (!keyId) return;

  await prisma.apiKey.update({
    where: { id: keyId },
    data:  { revokedAt: new Date() },
  }).catch(() => {}); // Key may not exist (e.g., honeytoken wasn't real)

  logger.warn('[SOAR] API key revoked', {
    eventType: 'SOAR_REVOKE_KEY',
    metadata: { keyId, reason, alertId },
  });
}

/** Invalidate all active sessions for a user */
export async function invalidateSessions(userId: string, reason: string, alertId?: string): Promise<void> {
  if (!userId) return;

  const deleted = await prisma.refreshToken.deleteMany({ where: { userId } });

  logger.warn('[SOAR] Sessions invalidated', {
    eventType: 'SOAR_INVALIDATE_SESSIONS',
    userId,
    metadata: { deletedCount: deleted.count, reason, alertId },
  });
}

/** Force a password reset on next login */
export async function forcePasswordReset(userId: string, reason: string, alertId?: string): Promise<void> {
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data:  { forcePasswordReset: true },
  }).catch(() => {});

  logger.warn('[SOAR] Password reset forced', {
    eventType: 'SOAR_FORCE_RESET',
    userId,
    metadata: { reason, alertId },
  });
}

/**
 * Decision matrix:
 * - CRITICAL alerts: Block IP + Invalidate Sessions + Force Password Reset
 * - HIGH alerts:     Block IP
 * - HONEYTOKEN:      Block IP + Revoke Key (if apiKeyId in metadata)
 */
export async function autoRespond(alert: any, overrideIp?: string): Promise<void> {
  const meta    = (alert.metadata as any) ?? {};
  const ip      = overrideIp ?? meta.ip;
  const userId  = meta.userId;
  const keyId   = meta.apiKeyId ?? meta.keyId;
  const alertId = alert.id;
  const reason  = `Auto-response for alert ${alertId} (${alert.type})`;

  logger.warn('[SOAR] Auto-responding to alert', {
    eventType: 'SOAR_AUTO_RESPOND',
    metadata: { alertId, type: alert.type, severity: alert.severity, ip, userId },
  });

  try {
    if (alert.type === 'HONEYTOKEN_TRIGGERED' || alert.type === 'HONEY_ENDPOINT_ACCESSED') {
      await Promise.all([
        ip ? blockIp(ip, reason, alertId) : Promise.resolve(),
        keyId ? revokeApiKey(keyId, reason, alertId) : Promise.resolve(),
        userId ? invalidateSessions(userId, reason, alertId) : Promise.resolve(),
      ]);
      return;
    }

    if (alert.severity === 'CRITICAL') {
      await Promise.all([
        ip ? blockIp(ip, reason, alertId) : Promise.resolve(),
        userId ? invalidateSessions(userId, reason, alertId) : Promise.resolve(),
        userId ? forcePasswordReset(userId, reason, alertId) : Promise.resolve(),
        keyId ? revokeApiKey(keyId, reason, alertId) : Promise.resolve(),
      ]);
    } else if (alert.severity === 'HIGH') {
      if (ip) await blockIp(ip, reason, alertId, 6); // Block for 6 hours only
    }
  } catch (err) {
    logger.error('[SOAR] Auto-response failed', { error: err, alertId });
  }
}
