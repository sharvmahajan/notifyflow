import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { User } from '@prisma/client';
import prisma from '../lib/prisma';
import { checkAdminEndpointAccess } from '../soc/detection/privilegeEscalation';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {

  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    const decoded = verifyAccessToken(token) as Partial<User>;
    const user = {
      id: decoded.id,
      email: decoded.email,
      plan: decoded.plan,
      isAdmin: (decoded as any).isAdmin,
    };
    (req as any).user = user;

    // ── Privilege escalation check ──
    setImmediate(async () => {
      if (user.id) {
        console.log(`[SOC] Running privilege check for user ${user.id} at ${req.originalUrl}`);
        await checkAdminEndpointAccess(user.id, req.originalUrl, !!user.isAdmin);
      }
    });

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};
