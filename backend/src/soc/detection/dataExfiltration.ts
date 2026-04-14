/**
 * Data Exfiltration Detection
 * - Detects bulk reads (single request fetching excessive records)
 * - Detects sudden notification retrieval spikes vs. user baseline
 */

import prisma from '../../lib/prisma';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { addRiskScore } from './riskScoring';

const BULK_READ_THRESHOLD  = 100; // records in a single response
const SPIKE_MULTIPLIER     = 5;   // 5× the hourly baseline = exfil spike
const SPIKE_WINDOW_MINUTES = 5;

/** Called from the notifications list endpoint with the actual result count */
export async function checkBulkRead(userId: string, resultCount: number): Promise<void> {
  if (!userId || resultCount < BULK_READ_THRESHOLD) return;

  const score = addRiskScore(userId, 'BULK_DATA_READ');
  await createAlert(
    'DATA_EXFIL_BULK_READ',
    AlertSeverity.MEDIUM,
    `User ${userId} fetched ${resultCount} notification records in a single request. Possible bulk data exfiltration.`,
    { userId, resultCount, threshold: BULK_READ_THRESHOLD, riskScore: score },
    score
  );
}

/** Detect notification retrieval spikes far above user baseline */
export async function checkNotificationSpike(userId: string): Promise<void> {
  if (!userId) return;

  const spikeWindowStart = new Date(Date.now() - SPIKE_WINDOW_MINUTES * 60 * 1000);
  const baselineWindowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

  const [recentCount, historicalCount] = await Promise.all([
    prisma.securityEvent.count({
      where: {
        userId,
        eventType: 'NOTIFICATION_LIST',
        createdAt: { gte: spikeWindowStart },
      },
    }),
    prisma.securityEvent.count({
      where: {
        userId,
        eventType: 'NOTIFICATION_LIST',
        createdAt: { gte: baselineWindowStart },
      },
    }),
  ]);

  if (historicalCount === 0) return;

  const baselinePerWindow = (historicalCount / (7 * 24 * 60)) * SPIKE_WINDOW_MINUTES;
  const expectedMax = Math.max(baselinePerWindow * SPIKE_MULTIPLIER, 20);

  if (recentCount > expectedMax) {
    const score = addRiskScore(userId, 'DATA_EXFIL_SPIKE');
    await createAlert(
      'DATA_EXFIL_SPIKE',
      AlertSeverity.HIGH,
      `User ${userId} retrieved notifications ${recentCount}× in ${SPIKE_WINDOW_MINUTES} minutes ` +
        `(expected max: ${expectedMax.toFixed(1)} based on 7-day baseline).`,
      {
        userId,
        recentCount,
        expectedMax,
        baselinePerWindow,
        windowMinutes: SPIKE_WINDOW_MINUTES,
        riskScore: score,
      },
      score
    );
  }
}
