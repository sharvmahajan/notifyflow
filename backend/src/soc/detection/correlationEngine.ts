/**
 * Alert Correlation Engine
 * Combines multiple weak signals into high-confidence composite alerts.
 * Runs after individual detectors — queries recent open alerts for the
 * same user/IP and fires a CORRELATED_ATTACK alert with combined evidence.
 */

import prisma from '../../lib/prisma';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { getRiskScore, getRiskEvents } from './riskScoring';

const CORRELATION_WINDOW_MINUTES = 10;
const MIN_SIGNALS_FOR_CORRELATION = 3;

/** Signal severity weights for correlation scoring */
const SIGNAL_WEIGHTS: Record<string, number> = {
  BRUTE_FORCE:          3,
  CREDENTIAL_STUFFING:  3,
  SUSPICIOUS_UA:        2,
  UNUSUAL_GEO:          2,
  IMPOSSIBLE_TRAVEL:    4,
  VPN_TOR_DETECTED:     2,
  MULTIPLE_IPS:         2,
  API_SPIKE:            1,
  API_KEY_LEAKAGE:      3,
  TOKEN_MULTI_IP:       3,
  TOKEN_REUSE:          4,
  PRIVILEGE_ESCALATION: 4,
  BEHAVIORAL_ANOMALY_LOGIN: 2,
  BEHAVIORAL_ANOMALY_API:   2,
};

export async function correlateAlerts(userId?: string, ip?: string): Promise<void> {
  if (!userId && !ip) return;

  const windowStart = new Date(Date.now() - CORRELATION_WINDOW_MINUTES * 60 * 1000);

  // Query recent open alerts matching this user or IP
  const recentAlerts = await prisma.securityAlert.findMany({
    where: {
      status: 'OPEN',
      createdAt: { gte: windowStart },
      OR: [
        userId ? { metadata: { path: ['userId'], equals: userId } } : {},
        ip ? { metadata: { path: ['ip'], equals: ip } } : {},
      ],
    },
    select: { id: true, type: true, severity: true, metadata: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Deduplicate by type
  const uniqueTypes = [...new Set(recentAlerts.map(a => a.type))];

  // Skip if already a correlated alert is in there to avoid recursion
  if (uniqueTypes.includes('CORRELATED_ATTACK')) return;

  if (uniqueTypes.length < MIN_SIGNALS_FOR_CORRELATION) return;

  // Compute composite signal strength
  const signalStrength = uniqueTypes.reduce((sum, t) => sum + (SIGNAL_WEIGHTS[t] ?? 1), 0);
  if (signalStrength < MIN_SIGNALS_FOR_CORRELATION * 2) return;

  const key = userId ?? ip!;
  const aggregateRisk = getRiskScore(key);
  const recentEvents = getRiskEvents(key);

  // Choose severity based on strength
  const severity =
    signalStrength >= 10
      ? AlertSeverity.CRITICAL
      : signalStrength >= 6
      ? AlertSeverity.HIGH
      : AlertSeverity.MEDIUM;

  await createAlert(
    'CORRELATED_ATTACK',
    severity,
    `Correlated attack detected — ${uniqueTypes.length} signals combined for ${userId ? `user ${userId}` : `IP ${ip}`}: [${uniqueTypes.join(', ')}]`,
    {
      userId,
      ip,
      signals: uniqueTypes,
      signalStrength,
      correlatedAlertIds: recentAlerts.map(a => a.id),
      aggregateRiskScore: aggregateRisk,
      recentEvents,
    },
    aggregateRisk,
    recentAlerts.map(a => a.id)
  );
}
