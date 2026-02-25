import dotenv from 'dotenv';
import path from 'path';
dotenv.config(
  {
    path: path.resolve(process.cwd(), '.env.development.local'),
  }
);


// Determine which file to load based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });


export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4444', 10),

  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    name: process.env.POSTGRES_DB || 'SadaraDB',
    user: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'admin1234',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'sadara-dev-secret-change-in-production-min-32-chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  // ── NEW: Redis ──
  redis: {
    url: process.env.REDIS_URL , 
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sadara.com',
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;