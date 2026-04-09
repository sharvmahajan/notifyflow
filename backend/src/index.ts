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

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

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

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
