import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { User } from '@prisma/client';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    const decoded = verifyAccessToken(token) as Partial<User>;
    // Attach to request
    (req as any).user = {
      id: decoded.id,
      email: decoded.email,
      plan: decoded.plan,
      isAdmin: (decoded as any).isAdmin,
    };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};
