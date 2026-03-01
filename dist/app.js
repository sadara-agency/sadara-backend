"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const associations_1 = require("./models/associations");
const redis_1 = require("./config/redis");
// Route imports
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const player_routes_1 = __importDefault(require("./modules/players/player.routes"));
const club_routes_1 = __importDefault(require("./modules/clubs/club.routes"));
const contract_routes_1 = __importDefault(require("./modules/contracts/contract.routes"));
const task_routes_1 = __importDefault(require("./modules/tasks/task.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const user_routes_1 = __importDefault(require("./modules/Users/user.routes"));
const offer_routes_1 = __importDefault(require("./modules/offers/offer.routes"));
const match_routes_1 = __importDefault(require("./modules/matches/match.routes"));
const gate_routes_1 = __importDefault(require("./modules/gates/gate.routes"));
const referral_routes_1 = __importDefault(require("./modules/referrals/referral.routes"));
const scouting_routes_1 = __importDefault(require("./modules/scouting/scouting.routes"));
const finance_routes_1 = __importDefault(require("./modules/finance/finance.routes"));
const document_routes_1 = __importDefault(require("./modules/documents/document.routes"));
const settings_routes_1 = __importDefault(require("./modules/settings/settings.routes"));
const injury_routes_1 = __importDefault(require("./modules/injuries/injury.routes"));
const training_routes_1 = __importDefault(require("./modules/training/training.routes"));
const saff_routes_1 = __importDefault(require("./modules/saff/saff.routes"));
const notification_routes_1 = __importDefault(require("./modules/notifications/notification.routes"));
const cron_routes_1 = __importDefault(require("./cron/cron.routes"));
const portal_routes_1 = __importDefault(require("./modules/portal/portal.routes"));
const app = (0, express_1.default)();
// ── Global Middleware ──
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.cors.origin, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)(env_1.env.nodeEnv === 'production' ? 'combined' : 'dev'));
if (env_1.env.nodeEnv === 'production') {
    app.use('/api/v1/auth', rateLimiter_1.authLimiter);
}
// ── Health Check ──
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'sadara-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: env_1.env.nodeEnv,
        redis: (0, redis_1.isRedisConnected)() ? 'connected' : 'disconnected',
    });
});
(0, associations_1.setupAssociations)();
// ── API Routes ──
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/players', player_routes_1.default);
app.use('/api/v1/clubs', club_routes_1.default);
app.use('/api/v1/contracts', contract_routes_1.default);
app.use('/api/v1/tasks', task_routes_1.default);
app.use('/api/v1/dashboard', dashboard_routes_1.default);
app.use('/api/v1/users', user_routes_1.default);
app.use('/api/v1/offers', offer_routes_1.default);
app.use('/api/v1/matches', match_routes_1.default);
app.use('/api/v1/gates', gate_routes_1.default);
app.use('/api/v1/referrals', referral_routes_1.default);
app.use('/api/v1/scouting', scouting_routes_1.default);
app.use('/api/v1/finance', finance_routes_1.default);
app.use('/api/v1/documents', document_routes_1.default);
app.use('/api/v1/settings', settings_routes_1.default);
app.use('/api/v1/injuries', injury_routes_1.default);
app.use('/api/v1/training', training_routes_1.default);
app.use('/api/v1/saff', saff_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
app.use('/api/v1/cron', cron_routes_1.default);
app.use('/api/v1/portal', portal_routes_1.default);
// ── 404 ──
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
// ── Error Handler ──
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map