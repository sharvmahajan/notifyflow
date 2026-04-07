import { Router } from 'express';
import { z } from 'zod';
import { ApiKeyService } from '../services/apikey.service';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth.middleware';
import { Environment } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

const createKeySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    environment: z.nativeEnum(Environment),
    permissions: z.any().optional(),
  }),
});

router.get('/', async (req: any, res: any) => {
  try {
    const keys = await ApiKeyService.listKeys(req.user.id);
    res.json({ keys });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', validate(createKeySchema), async (req: any, res: any) => {
  try {
    const { name, environment, permissions = [] } = req.body;
    const result = await ApiKeyService.createKey(req.user.id, name, environment, permissions);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await ApiKeyService.revokeKey(req.user.id, id);
    res.json({ success: true, message: 'Key revoked' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
