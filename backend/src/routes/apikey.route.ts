import { Router } from 'express';
import { z } from 'zod';
import { ApiKeyService } from '../services/apikey.service';
import { AnalyticsService } from '../services/analytics.service';
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

// Analytics Filters Schema
const analyticsQuerySchema = z.object({
  query: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    channel: z.string().optional(),
    status: z.string().optional(),
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

router.get('/:id/analytics', validate(analyticsQuerySchema), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, channel, status } = req.query;
    const analytics = await AnalyticsService.getApiAnalytics(id, req.user.id, {
      startDate: start_date,
      endDate: end_date,
      channel,
      status
    });
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    const status_code = error.message.includes('denied') ? 403 : 400;
    res.status(status_code).json({ success: false, error: error.message });
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

router.post('/:id/pause', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await ApiKeyService.pauseKey(req.user.id, id);
    res.json({
      success: true,
      message: 'API paused successfully.',
      data: {
        api_id: result.id,
        status: result.status,
        updated_at: result.updatedAt
      }
    });
  } catch (error: any) {
    const status_code = error.message.includes('not found') ? 404 : (error.message.includes('denied') ? 403 : 400);
    res.status(status_code).json({ success: false, error: error.message });
  }
});

router.post('/:id/resume', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await ApiKeyService.resumeKey(req.user.id, id);
    res.json({
      success: true,
      message: 'API resumed successfully.',
      data: {
        api_id: result.id,
        status: result.status,
        updated_at: result.updatedAt
      }
    });
  } catch (error: any) {
    const status_code = error.message.includes('not found') ? 404 : (error.message.includes('denied') ? 403 : 400);
    res.status(status_code).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await ApiKeyService.deleteKey(req.user.id, id);
    res.json({
      success: true,
      message: 'API deleted successfully.',
      data: {
        api_id: result.id,
        status: result.status,
        updated_at: result.updatedAt
      }
    });
  } catch (error: any) {
    const status_code = error.message.includes('not found') ? 404 : (error.message.includes('denied') ? 403 : 400);
    res.status(status_code).json({ success: false, error: error.message });
  }
});

export default router;
