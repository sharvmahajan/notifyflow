import prisma from '../lib/prisma';
import { Channel, NotificationStatus, ApiKeyStatus } from '@prisma/client';

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

    const byChannel: Record<string, { sent: number, delivered: number, failed: number }> = {};

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
      const isSuccess = log.status === NotificationStatus.success || log.status === 'delivered';
      const isFailed = log.status === NotificationStatus.failed;
      
      if (isSuccess) {
        delivered++;
        if (log.latencyMs) {
          totalLatency += log.latencyMs;
          latencyCount++;
        }
      }
      if (isFailed) failed++;

      const ch = log.channel as string;
      if (!byChannel[ch]) {
        byChannel[ch] = { sent: 0, delivered: 0, failed: 0 };
      }
      byChannel[ch].sent++;
      if (isSuccess) byChannel[ch].delivered++;
      if (isFailed) byChannel[ch].failed++;

      const isoDate = log.createdAt.toISOString().split('T')[0];
      const daily = dailyVolumeMap.get(isoDate);
      if (daily) {
        daily.sent++;
        if (isSuccess) daily.delivered++;
        if (isFailed) daily.failed++;
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

  static async getApiAnalytics(apiId: string, userId: string, filters: any) {
    // 1. Ownership Verification
    const api = await prisma.apiKey.findFirst({
      where: { id: apiId, userId }
    });

    if (!api) {
      throw new Error('API not found or access denied');
    }

    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      channel = 'all',
      status = 'all'
    } = filters;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    if (start > end) {
      throw new Error('start_date must be before end_date.');
    }

    // 2. Build Query
    const where: any = {
      apiKeyId: apiId,
      createdAt: {
        gte: start,
        lt: end
      }
    };

    if (channel !== 'all') {
      where.channel = channel;
    }

    if (status !== 'all') {
      where.status = status;
    }

    const logs = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // 3. Compute Aggregates
    let success_count = 0;
    let failure_count = 0;
    let total_latency = 0;
    let latency_count = 0;

    const by_channel = {
      email: 0,
      sms: 0,
      push: 0,
      webhook: 0,
      inapp: 0
    };

    const dailyVolumeMap = new Map<string, number>();
    
    // Fill all days in range with 0
    const current = new Date(start);
    while (current < end) {
      dailyVolumeMap.set(current.toISOString().split('T')[0], 0);
      current.setDate(current.getDate() + 1);
    }

    logs.forEach(log => {
      const isSuccess = log.status === NotificationStatus.success || log.status === 'delivered';
      const isFailed = log.status === NotificationStatus.failed;
      const isPaused = log.status === NotificationStatus.paused;

      if (isSuccess) success_count++;
      if (isFailed) failure_count++;
      // Count paused in total but not success/failure if we want to differentiate
      // For now, we'll keep them in total_notifications (which is logs.length)
      if (log.latencyMs) {
        total_latency += log.latencyMs;
        latency_count++;
      }

      const ch = log.channel as keyof typeof by_channel;
      if (by_channel[ch] !== undefined) {
        by_channel[ch]++;
      }

      const isoDate = log.createdAt.toISOString().split('T')[0];
      if (dailyVolumeMap.has(isoDate)) {
        dailyVolumeMap.set(isoDate, (dailyVolumeMap.get(isoDate) || 0) + 1);
      }
    });

    const total_notifications = logs.length;
    const success_rate = total_notifications === 0 ? 0 : Number(((success_count / total_notifications) * 100).toFixed(2));
    const avg_latency_ms = latency_count === 0 ? 0 : Number((total_latency / latency_count).toFixed(2));

    const volume_over_time = Array.from(dailyVolumeMap.entries()).map(([date, count]) => ({
      date,
      count
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));

    const recent_events = logs.slice(0, 50).map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      channel: log.channel,
      status: log.status,
      latency_ms: log.latencyMs || 0,
      error_message: log.errorMessage
    }));

    return {
      api_id: api.id,
      api_name: api.name,
      api_status: api.status,
      date_range: {
        start_date: startDate.split('T')[0],
        end_date: endDate.split('T')[0]
      },
      filters_applied: {
        channel,
        status
      },
      summary: {
        total_notifications,
        success_count,
        failure_count,
        success_rate,
        avg_latency_ms
      },
      by_channel,
      volume_over_time,
      recent_events
    };
  }
}
