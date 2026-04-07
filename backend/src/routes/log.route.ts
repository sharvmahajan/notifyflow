import { Router } from 'express';
import { z } from 'zod';
import { LogService } from '../services/log.service';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth.middleware';
import { Channel, NotificationStatus } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

const logQuerySchema = z.object({
  query: z.object({
    channel: z.nativeEnum(Channel).optional(),
    status: z.nativeEnum(NotificationStatus).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().min(1).max(200).optional(),
    offset: z.coerce.number().min(0).optional(),
  }),
});

router.get('/', validate(logQuerySchema), async (req: any, res: any) => {
  try {
    const result = await LogService.getLogs(req.user.id, req.query);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
