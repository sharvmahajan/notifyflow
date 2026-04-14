import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../soc/logging/logger';
import {
  checkBruteForce,
  checkMultiIpLogin,
  checkUnusualGeolocation,
  checkCredentialStuffing,
  checkSuspiciousUA,
  checkInternalToExternalLogin,
} from '../soc/detection/rules';
import { checkImpossibleTravel } from '../soc/detection/impossibleTravel';
import { checkIpReputation } from '../soc/detection/ipIntelligence';
import { checkRapidIpSwitching, recordLogout } from '../soc/detection/sessionAbuse';
import { detectLoginDeviation } from '../soc/detection/behavioralBaseline';
import { getClientIp } from '../lib/ipUtils';

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
      message: error.message,
    });
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', validate(loginSchema), async (req, res: any) => {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';

  try {
    const { user, accessToken, refreshToken } = await AuthService.login(req.body);
    setCookies(res, accessToken, refreshToken);
    logger.info('Login success', {
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: { geo: {} }, // geo will be populated by checkUnusualGeolocation
    });

    // Run all advanced checks non-blocking (fire-and-forget after response)
    res.json({ user });

    // Post-response async security checks (don't delay user)
    setImmediate(async () => {
      await Promise.allSettled([
        checkMultiIpLogin(user.id!),
        checkUnusualGeolocation(ip, user.id!),
        checkInternalToExternalLogin(ip, user.id!),
        checkSuspiciousUA(user.id!, ua),
        checkImpossibleTravel(user.id!, ip),
        checkIpReputation(ip, user.id!),
        checkRapidIpSwitching(user.id!),
        detectLoginDeviation(user.id!),
      ]);
    });

  } catch (error: any) {
    logger.warn('Login failure', {
      eventType: 'LOGIN_FAILURE',
      ip,
      userAgent: ua,
      message: error.message,
      metadata: { email: req.body.email },
    });

    res.status(401).json({ error: error.message });

    setImmediate(async () => {
      await Promise.allSettled([
        checkBruteForce(ip),
        checkCredentialStuffing(ip),
      ]);
    });
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
  const user = (req as any).user;

  await AuthService.logout(token);

  // Record revoked session for post-logout token reuse detection
  if (token && user?.id) {
    await recordLogout(token, user.id).catch(() => {});
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, (req: any, res: any) => {
  res.json({ user: req.user });
});

export default router;
