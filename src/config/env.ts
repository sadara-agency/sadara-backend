
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}.local`) });
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isProduction = nodeEnv === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4444),

  // Database
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().default('SadaraDB'),
  POSTGRES_USER: z.string().default('admin'),
  POSTGRES_PASSWORD: isProduction
    ? z.string().min(8, 'DB password must be ≥8 chars in production')
    : z.string().default('admin1234'),

  // JWT — REQUIRED in production
  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET must be ≥32 chars in production')
    : z.string().default('sadara-dev-secret-DO-NOT-USE-IN-PROD-' + 'x'.repeat(32)),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12),

  // Redis (optional)
  REDIS_URL: z.string().optional(),

  // SMTP (optional)
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@sadara.com'),
  SMTP_SECURE: z.string().default('false'),

  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

// ── Parse & Validate ──
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  }
  // In production, crash immediately — don't start with bad config
  if (isProduction) {
    process.exit(1);
  }
  console.warn('⚠️  Continuing with defaults in development mode...');
}

const validated = parsed.success ? parsed.data : envSchema.parse({
  ...process.env,
  // Force through with defaults for dev (parse will fill them in)
});

// ── Export typed config ──
export const env = {
  nodeEnv: validated.NODE_ENV,
  port: validated.PORT,

  db: {
    host: validated.POSTGRES_HOST,
    port: validated.POSTGRES_PORT,
    name: validated.POSTGRES_DB,
    user: validated.POSTGRES_USER,
    password: validated.POSTGRES_PASSWORD,
  },

  jwt: {
    secret: validated.JWT_SECRET,
    expiresIn: validated.JWT_EXPIRES_IN,
    refreshExpiresIn: validated.JWT_REFRESH_EXPIRES_IN,
  },

  cors: {
    origin: validated.CORS_ORIGIN,
  },

  bcrypt: {
    saltRounds: validated.BCRYPT_SALT_ROUNDS,
  },

  redis: {
    url: validated.REDIS_URL,
  },

  smtp: {
    host: validated.SMTP_HOST,
    port: validated.SMTP_PORT,
    user: validated.SMTP_USER,
    password: validated.SMTP_PASSWORD,
    from: validated.SMTP_FROM || validated.SMTP_USER || 'noreply@sadara.com',
    secure: validated.SMTP_SECURE === 'true',
  },

  frontend: {
    url: validated.FRONTEND_URL,
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;
