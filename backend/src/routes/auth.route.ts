import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../soc/logging/logger';
import { checkBruteForce, checkMultiIpLogin, checkUnusualGeolocation, checkCredentialStuffing, checkSuspiciousUA } from '../soc/detection/rules';

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
    logger.warn('Signup attempt failure', {
      eventType: 'SIGNUP_FAILURE',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: error.message
    });
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', validate(loginSchema), async (req, res: any) => {
  try {
    const { user, accessToken, refreshToken } = await AuthService.login(req.body);
    setCookies(res, accessToken, refreshToken);
    
    // Log success and check for multi-IP/Geo flags
    logger.info('Login success', {
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { geo: {} } // Placeholder for actual geo logic if added
    });
    
    await checkMultiIpLogin(user.id!);
    await checkUnusualGeolocation(req.ip!, user.id!);
    await checkSuspiciousUA(user.id!, req.headers['user-agent'] || '');

    res.json({ user });
  } catch (error: any) {
    // Log failure and check for brute force
    logger.warn('Login failure', {
      eventType: 'LOGIN_FAILURE',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      message: error.message,
      metadata: { email: req.body.email }
    });
    
    await checkBruteForce(req.ip!);
    await checkCredentialStuffing(req.ip!);

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
