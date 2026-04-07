import prisma from '../lib/prisma';
import { Channel, NotificationStatus } from '@prisma/client';

export class LogService {
  static async getLogs(userId: string, filters: {
    channel?: Channel,
    status?: NotificationStatus,
    startDate?: string,
    endDate?: string,
    limit?: number,
    offset?: number
  }) {
    const where: any = { userId };

    if (filters.channel) where.channel = filters.channel;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const limit = filters.limit ? Math.min(Number(filters.limit), 200) : 50;
    const offset = filters.offset ? Number(filters.offset) : 0;

    const [total, logs] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          apiKey: {
            select: { name: true, environment: true }
          }
        }
      })
    ]);

    return { total, limit, offset, logs };
  }
}
