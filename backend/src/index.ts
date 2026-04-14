import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route';
import apiKeyRoutes from './routes/apikey.route';
import notificationRoutes from './routes/notification.route';
import templateRoutes from './routes/template.route';
import logRoutes from './routes/log.route';
import analyticsRoutes from './routes/analytics.route';
import socRoutes from './routes/soc.route';

import { seedHoneytokens, HONEY_ENDPOINTS } from './soc/detection/honeytokens';
import { refreshAllBaselines } from './soc/detection/behavioralBaseline';
import { checkHoneyEndpoint } from './soc/detection/honeytokens';


dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Trust proxy for correct IP detection in Docker/cloud environments
app.set('trust proxy', true);

import { blocklistMiddleware } from './middleware/blocklist.middleware';
app.use(blocklistMiddleware);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

import { getClientIp } from './lib/ipUtils';

// ── Honey Endpoint trap — runs before all routes ─────────────────────────────
app.use(async (req, res, next) => {
  const isHoney = HONEY_ENDPOINTS.some(h => req.path.startsWith(h));
  if (isHoney) {
    const user = (req as any).user;
    const ip = getClientIp(req);
    await checkHoneyEndpoint(req.path, ip, user?.id).catch(() => {});
    return res.status(403).json({ 
      error: 'Access Denied: Security Alert Triggered',
      message: 'This endpoint is a restricted honeypot. Your IP has been flagged.'
    });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/soc/alerts', socRoutes);

app.get('/', (req, res) => {
  res.send('NotifyFlow API is running');
});

import http from 'http';
import { initSocket } from './lib/socket';

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const server = http.createServer(app);
initSocket(server);

server.listen(port, async () => {
  console.log(`Server is running on port ${port}`);

  // ── Boot-time SOC initialization ──────────────────────────────────────────
  try {
    await seedHoneytokens();
    console.log('[SOC] Honeytokens initialized.');
  } catch (e) {
    console.error('[SOC] Failed to seed honeytokens:', e);
  }

  // Refresh behavioral baselines every 60 minutes
  setInterval(async () => {
    try {
      await refreshAllBaselines();
      console.log('[SOC] Behavioral baselines refreshed.');
    } catch (e) {
      console.error('[SOC] Baseline refresh failed:', e);
    }
  }, 60 * 60 * 1000);
});
