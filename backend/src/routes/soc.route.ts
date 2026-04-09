import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', async (req, res) => {
  try {
    const alerts = await prisma.securityAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to 100 recent alerts for UI performance
    });

    // Also fetch high level stats
    const stats = {
      critical: await prisma.securityAlert.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }),
      high: await prisma.securityAlert.count({ where: { severity: 'HIGH', status: 'OPEN' } }),
      total: await prisma.securityAlert.count({ where: { status: 'OPEN' } })
    };

    res.json({ alerts, stats });
  } catch (error) {
    console.error('Failed to fetch SOC alerts:', error);
    res.status(500).json({ error: 'Failed to fetch SOC data' });
  }
});

// A route to permanently delete/dismiss an alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.securityAlert.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
