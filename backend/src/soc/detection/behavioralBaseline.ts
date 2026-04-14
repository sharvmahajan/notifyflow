/**
 * Behavioral Baseline Module
 * Maintains a per-user rolling average of login frequency and API call volume.
 * Deviates from static thresholds — fires when current activity exceeds 3× the baseline.
 */

import prisma from '../../lib/prisma';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { addRiskScore } from './riskScoring';

const BASELINE_WINDOW_HOURS = 168; // 7-day rolling window for sampling
const DEVIATION_MULTIPLIER   = 3;  // Alert if > 3× the baseline

/** Update the rolling baseline for a user (called on a background interval) */
export async function updateUserBaseline(userId: string): Promise<void> {
  if (!userId) return;

  const windowStart = new Date(Date.now() - BASELINE_WINDOW_HOURS * 60 * 60 * 1000);

  const [loginCount, apiCount] = await Promise.all([
    prisma.securityEvent.count({
      where: { userId, eventType: 'LOGIN_SUCCESS', createdAt: { gte: windowStart } },
    }),
    prisma.securityEvent.count({
      where: { userId, eventType: 'API_KEY_USAGE', createdAt: { gte: windowStart } },
    }),
  ]);

  const avgLoginsPerHour   = loginCount   / BASELINE_WINDOW_HOURS;
  const avgApiCallsPerHour = apiCount     / BASELINE_WINDOW_HOURS;

  await prisma.userBaseline.upsert({
    where:  { userId },
    update: { avgLoginsPerHour, avgApiCallsPerHour, sampleCount: { increment: 1 } },
    create: { userId, avgLoginsPerHour, avgApiCallsPerHour, sampleCount: 1 },
  });
}

/** Detect if current login frequency deviates significantly from baseline */
export async function detectLoginDeviation(userId: string): Promise<void> {
  if (!userId) return;

  const baseline = await prisma.userBaseline.findUnique({ where: { userId } });
  if (!baseline || baseline.sampleCount < 3) return; // Need enough samples first

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const currentCount = await prisma.securityEvent.count({
    where: { userId, eventType: 'LOGIN_SUCCESS', createdAt: { gte: oneHourAgo } },
  });

  const expectedMax = Math.max(baseline.avgLoginsPerHour * DEVIATION_MULTIPLIER, 5);
  if (currentCount > expectedMax) {
    const score = addRiskScore(userId, 'BRUTE_FORCE');
    await createAlert(
      'BEHAVIORAL_ANOMALY_LOGIN',
      AlertSeverity.HIGH,
      `User ${userId} has logged in ${currentCount}× in the last hour (baseline: ${baseline.avgLoginsPerHour.toFixed(2)}/hr, threshold: ${expectedMax.toFixed(1)}).`,
      { userId, currentCount, baseline: baseline.avgLoginsPerHour, threshold: expectedMax, riskScore: score },
      score
    );
  }
}

/** Detect if current API usage deviates significantly from baseline */
export async function detectApiUsageDeviation(userId: string): Promise<void> {
  if (!userId) return;

  const baseline = await prisma.userBaseline.findUnique({ where: { userId } });
  if (!baseline || baseline.sampleCount < 3) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const currentCount = await prisma.securityEvent.count({
    where: { userId, eventType: 'API_KEY_USAGE', createdAt: { gte: oneHourAgo } },
  });

  const expectedMax = Math.max(baseline.avgApiCallsPerHour * DEVIATION_MULTIPLIER, 50);
  if (currentCount > expectedMax) {
    const score = addRiskScore(userId, 'API_SPIKE');
    await createAlert(
      'BEHAVIORAL_ANOMALY_API',
      AlertSeverity.HIGH,
      `User ${userId} made ${currentCount} API calls in the last hour (baseline: ${baseline.avgApiCallsPerHour.toFixed(2)}/hr, threshold: ${expectedMax.toFixed(1)}).`,
      { userId, currentCount, baseline: baseline.avgApiCallsPerHour, threshold: expectedMax, riskScore: score },
      score
    );
  }
}

/** Refresh baselines for all active users — call this on a background interval */
export async function refreshAllBaselines(): Promise<void> {
  const activeUsers = await prisma.securityEvent.findMany({
    where: {
      eventType: { in: ['LOGIN_SUCCESS', 'API_KEY_USAGE'] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      userId: { not: null },
    },
    distinct: ['userId'],
    select: { userId: true },
  });

  await Promise.allSettled(
    activeUsers.map(e => e.userId ? updateUserBaseline(e.userId) : Promise.resolve())
  );
}
