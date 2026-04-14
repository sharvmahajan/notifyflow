import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { logger } from '../soc/logging/logger';
import { checkApiKeyLeakage } from '../soc/detection/rules';
import { checkHoneytoken } from '../soc/detection/honeytokens';
import { checkTokenMultiIp } from '../soc/detection/sessionAbuse';
import { detectApiUsageDeviation } from '../soc/detection/behavioralBaseline';
import { checkNotificationSpike } from '../soc/detection/dataExfiltration';

import { getClientIp } from '../lib/ipUtils';

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

  const ip = getClientIp(req);

  // ── Honeytoken check — O(1) in-memory, no bcrypt needed ──
  const isHoney = await checkHoneytoken(key, ip);
  if (isHoney) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
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
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        (req as any).apiKey = apiKey;
        (req as any).user = apiKey.user;

        logger.info('API key usage', {
          eventType: 'API_KEY_USAGE',
          userId: apiKey.userId,
          ip,
          userAgent: req.headers['user-agent'],
          metadata: { apiKeyId: apiKey.id },
        });

        // Security checks (non-blocking)
        setImmediate(async () => {
          await Promise.allSettled([
            checkApiKeyLeakage(apiKey.id),
            checkTokenMultiIp(apiKey.keyHash, ip),
            detectApiUsageDeviation(apiKey.userId),
            checkNotificationSpike(apiKey.userId),
          ]);
        });

        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
