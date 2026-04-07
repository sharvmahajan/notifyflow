import { Router } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/summary', async (req: any, res: any) => {
  try {
    const result = await AnalyticsService.getSummary(req.user.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
