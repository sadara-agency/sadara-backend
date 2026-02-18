import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { setupAssociations } from './models/associations';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import playerRoutes from './modules/players/player.routes';
import clubRoutes from './modules/clubs/club.routes';
import contractRoutes from './modules/contracts/contract.routes';
import taskRoutes from './modules/tasks/task.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import userRoutes from './modules/Users/user.routes';
import offerRoutes from './modules/offers/offer.routes';
import matchRoutes from './modules/matches/match.routes'

const app = express();

// ── Global Middleware ──
app.use(helmet());
app.use(cors({ origin: env.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

if (env.nodeEnv === 'production') {
  app.use('/api/', apiLimiter);
}

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sadara-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

setupAssociations();

// ── API Routes ──
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/players', playerRoutes);
app.use('/api/v1/clubs', clubRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/matches', matchRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ──
app.use(errorHandler);

export default app;
