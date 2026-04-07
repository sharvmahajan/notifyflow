import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { NotificationService } from '../services/notification.service';
import { validate } from '../middleware/validate';
import { apiKeyMiddleware } from '../middleware/apikey.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { Channel } from '@prisma/client';

const router = Router();

const flexibleAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization || req.headers['x-api-key'];
  if (authHeader) {
    return apiKeyMiddleware(req, res, next);
  }
  return authMiddleware(req, res, next);
};

router.use(flexibleAuth);

const sendLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
  keyGenerator: (req: any) => req.apiKey?.prefix || req.user.id,
  handler: (req, res) => res.status(429).json({ error: 'Too many requests, try again later' }),
});

const sendSchema = z.object({
  body: z.object({
    channel: z.nativeEnum(Channel),
    to: z.string().min(1),
    subject: z.string().optional(),
    body: z.string().optional(),
    templateId: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
  }).refine((data) => data.body || data.templateId, {
    message: "Either body or templateId must be provided",
    path: ["body"],
  }),
});

const batchSendSchema = z.object({
  body: z.object({
    channel: z.nativeEnum(Channel),
    recipients: z.array(z.string().min(1)).min(1).max(500),
    subject: z.string().optional(),
    body: z.string().optional(),
    templateId: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
  }).refine((data) => data.body || data.templateId, {
    message: "Either body or templateId must be provided",
  }),
});

router.post('/send', sendLimiter, validate(sendSchema), async (req: any, res: any) => {
  try {
    const { channel, to, subject, body, templateId, variables } = req.body;
    const notification = await NotificationService.send(
      req.user.id,
      req.apiKey?.id || null,
      channel,
      to,
      subject,
      body,
      templateId,
      variables
    );
    res.json({ notification });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/send/batch', sendLimiter, validate(batchSendSchema), async (req: any, res: any) => {
  try {
    const { channel, recipients, subject, body, templateId, variables } = req.body;
    const results = await NotificationService.sendBatch(
      req.user.id,
      req.apiKey?.id || null,
      channel,
      recipients,
      subject,
      body,
      templateId,
      variables
    );
    res.json({ results });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
