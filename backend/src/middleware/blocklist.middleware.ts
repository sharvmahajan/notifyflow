import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getClientIp, isInternalIp } from '../lib/ipUtils';

/**
 * Global IP Blocklist Middleware
 * Run this before all other middleware to catch blocked IPs at the perimeter.
 */
export const blocklistMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const rawIp = req.ip || '';

  // Debug logging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SOC] IP Check: ${ip} (raw: ${rawIp}, hint: ${req.headers['x-client-ip']})`);
  }

  // ── BlockedIp gate ──
  // Skip internal/loopback ranges to prevent dev-network lockouts and false positives.
  if (ip && !isInternalIp(ip)) {
    const blocked = await prisma.blockedIp.findUnique({ where: { ip } });
    
    if (blocked) {
      const expired = blocked.expiresAt && blocked.expiresAt < new Date();
      if (!expired) {
        console.log(`[SOC] IP BLOCKED MATCH FOUND: ${ip} for ${req.originalUrl}`);
        return res.status(403).json({ 
          error: 'Access denied: your IP has been blocked due to suspicious activity.',
          ip
        });
      }
      // Expired block — clean it up asynchronously
      prisma.blockedIp.delete({ where: { ip } }).catch(() => {});
    } else {
      // console.log(`[SOC] IP not in blocklist: ${ip}`);
    }
  }

  next();
};
