import { Router } from 'express';
import { z } from 'zod';
import { TemplateService } from '../services/template.service';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth.middleware';
import { Channel } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

const templateSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    channel: z.nativeEnum(Channel),
    subject: z.string().optional(),
    body: z.string().min(1),
    variables: z.array(z.string()).optional(),
  }),
});

router.get('/', async (req: any, res: any) => {
  try {
    const templates = await TemplateService.listTemplates(req.user.id);
    res.json({ templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', validate(templateSchema), async (req: any, res: any) => {
  try {
    const template = await TemplateService.createTemplate(req.user.id, req.body);
    res.status(201).json({ template });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', validate(templateSchema), async (req: any, res: any) => {
  try {
    const template = await TemplateService.updateTemplate(req.user.id, req.params.id, req.body);
    res.json({ template });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: any, res: any) => {
  try {
    await TemplateService.deleteTemplate(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
