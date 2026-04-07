import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const setCookies = (res: any, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

router.post('/signup', validate(signupSchema), async (req, res: any) => {
  try {
    const { user, accessToken, refreshToken } = await AuthService.signup(req.body);
    setCookies(res, accessToken, refreshToken);
    res.status(201).json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', validate(loginSchema), async (req, res: any) => {
  try {
    const { user, accessToken, refreshToken } = await AuthService.login(req.body);
    setCookies(res, accessToken, refreshToken);
    res.json({ user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/refresh', async (req, res: any) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token provided' });
  try {
    const { user, accessToken, refreshToken } = await AuthService.refresh(token);
    setCookies(res, accessToken, refreshToken);
    res.json({ user });
  } catch (error: any) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(401).json({ error: error.message });
  }
});

router.post('/logout', async (req, res: any) => {
  const token = req.cookies.refreshToken;
  await AuthService.logout(token);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, (req: any, res: any) => {
  res.json({ user: req.user });
});

export default router;
