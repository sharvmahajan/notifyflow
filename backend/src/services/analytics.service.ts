import prisma from '../lib/prisma';
import { Channel, NotificationStatus } from '@prisma/client';

export class AnalyticsService {
  static async getSummary(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        channel: true,
        status: true,
        latencyMs: true,
        createdAt: true,
      }
    });

    let totalSent = 0;
    let delivered = 0;
    let failed = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    const byChannel: Record<string, { sent: number, delivered: number, failed: number }> = {
      email: { sent: 0, delivered: 0, failed: 0 },
      sms: { sent: 0, delivered: 0, failed: 0 },
      inapp: { sent: 0, delivered: 0, failed: 0 },
    };

    // Initialize dailyVolume map for last 30 days
    const dailyVolumeMap = new Map<string, { sent: number, delivered: number, failed: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      dailyVolumeMap.set(isoDate, { sent: 0, delivered: 0, failed: 0 });
    }

    logs.forEach((log: any) => {
      totalSent++;
      if (log.status === NotificationStatus.delivered) {
        delivered++;
        if (log.latencyMs) {
          totalLatency += log.latencyMs;
          latencyCount++;
        }
      }
      if (log.status === NotificationStatus.failed) failed++;

      const ch = log.channel;
      byChannel[ch].sent++;
      if (log.status === NotificationStatus.delivered) byChannel[ch].delivered++;
      if (log.status === NotificationStatus.failed) byChannel[ch].failed++;

      const isoDate = log.createdAt.toISOString().split('T')[0];
      const daily = dailyVolumeMap.get(isoDate);
      if (daily) {
        daily.sent++;
        if (log.status === NotificationStatus.delivered) daily.delivered++;
        if (log.status === NotificationStatus.failed) daily.failed++;
      }
    });

    const dailyVolume = Array.from(dailyVolumeMap.entries()).map(([date, stats]) => ({
      date,
      ...stats
    }));

    const deliveryRate = totalSent === 0 ? 0 : (delivered / totalSent) * 100;
    const avgLatencyMs = latencyCount === 0 ? 0 : Math.floor(totalLatency / latencyCount);

    return {
      totalSent,
      delivered,
      failed,
      deliveryRate,
      avgLatencyMs,
      byChannel,
      dailyVolume,
    };
  }
}
