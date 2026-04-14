import winston from 'winston';
import prisma from '../../lib/prisma';
import TransportStream from 'winston-transport';

class PrismaTransport extends TransportStream {
  constructor(opts?: any) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => (this as any).emit('logged', info));

    const { level, message, userId, eventType, ip, userAgent, endpoint, status, metadata, ...extra } = info;

    if (eventType) {
      prisma.securityEvent.create({
        data: {
          userId: userId || null,
          eventType: eventType || 'SYSTEM',
          ip: ip || null,
          userAgent: userAgent || null,
          endpoint: endpoint || null,
          status: status || null,
          metadata: { ...metadata, ...extra },
        }
      }).catch(err => {
        console.error('Failed to write SecurityEvent to Prisma:', err);
      });
    }

    callback();
  }
}

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new PrismaTransport()
  ],
});
