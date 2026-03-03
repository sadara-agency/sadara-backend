import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
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
import auditRoutes from './modules/audit/audit.routes';
import splRoutes from './modules/spl/spl.routes';


const app = express();

// Trust reverse proxy (Railway, Heroku, etc.) — required for rate limiting & real IPs
if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// ── Global Middleware ──
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Check exact matches from env (comma-separated CORS_ORIGIN)
    const allowed = Array.isArray(env.cors.origin) ? env.cors.origin : [env.cors.origin];
    if (allowed.includes(origin)) return callback(null, true);

    // Allow any Vercel preview/production URL for this project
    if (/^https:\/\/sadara-frontend[\w-]*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Allow localhost in development
    if (env.nodeEnv !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Rate limiting
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authLimiter);

// ── Serve uploaded files (authenticated, path-traversal safe) ──
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'documents');
app.get('/uploads/documents/:filename', authenticate, (req, res) => {
  const filename = path.basename(req.params.filename); // strip any traversal
  const filePath = path.join(UPLOADS_ROOT, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  res.sendFile(filePath);
});

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sadara-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/spl', splRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ──
app.use(errorHandler);

export default app;
