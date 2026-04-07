import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';

export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || req.headers['x-api-key'] as string;
  let key = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    key = authHeader.substring(7);
  } else if (authHeader) {
    key = authHeader;
  }

  if (!key) {
    return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
  }

  const prefix = key.substring(0, 12);

  try {
    const candidateKeys = await prisma.apiKey.findMany({
      where: { prefix, revokedAt: null },
      include: { user: { select: { id: true, plan: true } } },
    });

    for (const apiKey of candidateKeys) {
      const match = await bcrypt.compare(key, apiKey.keyHash);
      if (match) {
        // Valid API key
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        // Attach to request
        (req as any).apiKey = apiKey;
        (req as any).user = apiKey.user;
        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
