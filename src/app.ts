import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { setupAssociations } from './models/associations';
import { isRedisConnected } from './config/redis';

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
import gateRoutes from './modules/gates/gate.routes';
import referralRoutes from './modules/referrals/referral.routes';
import scoutingRoutes from './modules/scouting/scouting.routes';
import financeRoutes from './modules/finance/finance.routes';
import documentRoutes from './modules/documents/document.routes';
import settingsRoutes from './modules/settings/settings.routes';
import injuryRoutes from './modules/injuries/injury.routes';
import trainingRoutes from './modules/training/training.routes';
import saffRoutes from './modules/saff/saff.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import cronRoutes from './cron/cron.routes';
import portalRoutes from './modules/portal/portal.routes';


const app = express();

// ── Global Middleware ──
app.use(helmet());
app.use(cors({ origin: env.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Rate limiting
app.use('/api/v1', apiLimiter);
if (env.nodeEnv === 'production') {
  app.use('/api/v1/auth', authLimiter); // Stricter limit for auth
}

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sadara-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    redis: isRedisConnected() ? 'connected' : 'disconnected',
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
app.use('/api/v1/gates', gateRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/scouting', scoutingRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/injuries', injuryRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/saff', saffRoutes);
app.use('/api/v1/notifications', notificationRoutes);
// Cron test routes — development only
if (env.nodeEnv !== 'production') {
  app.use('/api/v1/cron', cronRoutes);
}
app.use('/api/v1/portal', portalRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ──
app.use(errorHandler);

export default app;
