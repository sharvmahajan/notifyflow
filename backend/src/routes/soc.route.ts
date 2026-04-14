import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { blockIp, revokeApiKey, invalidateSessions, forcePasswordReset } from '../soc/soar/autoResponse';
import { getAllRiskScores } from '../soc/detection/riskScoring';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// ── GET /api/soc/alerts — List alerts with stats ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [alerts, critical, high, medium, total] = await Promise.all([
      prisma.securityAlert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.securityAlert.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }),
      prisma.securityAlert.count({ where: { severity: 'HIGH', status: 'OPEN' } }),
      prisma.securityAlert.count({ where: { severity: 'MEDIUM', status: 'OPEN' } }),
      prisma.securityAlert.count({ where: { status: 'OPEN' } }),
    ]);

    res.json({ alerts, stats: { critical, high, medium, total } });
  } catch (error) {
    console.error('Failed to fetch SOC alerts:', error);
    res.status(500).json({ error: 'Failed to fetch SOC data' });
  }
});

// ── DELETE /api/soc/alerts/:id — Dismiss / delete an alert ───────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.securityAlert.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// ── GET /api/soc/alerts/risk-scores — Live in-memory risk scores ──────────────
router.get('/risk-scores', (req, res) => {
  const scores = getAllRiskScores();
  res.json({ scores });
});

// ── GET /api/soc/alerts/blocked-ips — List all blocked IPs ───────────────────
router.get('/blocked-ips', async (req, res) => {
  try {
    const blocked = await prisma.blockedIp.findMany({ orderBy: { blockedAt: 'desc' } });
    res.json({ blocked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked IPs' });
  }
});

// ── DELETE /api/soc/alerts/blocked-ips/:ip — Unblock an IP ──────────────────
router.delete('/blocked-ips/:ip', async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    await prisma.blockedIp.delete({ where: { ip } });
    res.json({ message: `IP ${ip} has been unblocked.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

// ── POST /api/soc/alerts/actions/block-ip — Manual SOAR: block IP ────────────
router.post('/actions/block-ip', async (req: any, res: any) => {
  const { ip, reason, hours } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip is required' });
  await blockIp(ip, reason || 'Manual block by admin', undefined, hours || 24);
  res.json({ message: `IP ${ip} blocked for ${hours || 24} hours.` });
});

// ── POST /api/soc/alerts/actions/revoke-key — Manual SOAR: revoke API key ────
router.post('/actions/revoke-key', async (req: any, res: any) => {
  const { keyId, reason } = req.body;
  if (!keyId) return res.status(400).json({ error: 'keyId is required' });
  await revokeApiKey(keyId, reason || 'Manual revoke by admin');
  res.json({ message: `API key ${keyId} has been revoked.` });
});

// ── POST /api/soc/alerts/actions/invalidate-sessions — Manual SOAR ───────────
router.post('/actions/invalidate-sessions', async (req: any, res: any) => {
  const { userId, reason } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  await invalidateSessions(userId, reason || 'Manual session invalidation by admin');
  res.json({ message: `All sessions for user ${userId} have been invalidated.` });
});

// ── POST /api/soc/alerts/actions/force-reset — Manual SOAR: force password reset
router.post('/actions/force-reset', async (req: any, res: any) => {
  const { userId, reason } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  await forcePasswordReset(userId, reason || 'Manual force reset by admin');
  res.json({ message: `Password reset enforced for user ${userId}.` });
});
export default router;
