import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { z } from "zod";
import { logger } from "@config/logger";

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}.local`) });
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const isProduction = nodeEnv === "production";

// Generate random secrets for dev so a forgotten .env never ships a predictable token
const devJwtSecret = crypto.randomBytes(32).toString("hex");
const devEncryptionKey = crypto.randomBytes(32).toString("hex");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4444),

  // Database
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().default("SadaraDB"),
  POSTGRES_USER: z.string().default("admin"),
  POSTGRES_PASSWORD: isProduction
    ? z.string().min(8, "DB password must be ≥8 chars in production")
    : z.string().default("admin1234"),

  // JWT — REQUIRED in production (256-bit minimum for HS256)
  JWT_SECRET: isProduction
    ? z
        .string()
        .min(64, "JWT_SECRET must be ≥64 hex chars (256-bit) in production")
    : z.string().default(devJwtSecret),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12),

  // Redis (optional)
  REDIS_URL: z.string().optional(),

  // SMTP (optional)
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@sadara.com"),
  SMTP_SECURE: z.string().default("false"),

  // Frontend
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // Encryption at rest (AES-256-GCM)
  ENCRYPTION_KEY: isProduction
    ? z.string().min(32, "ENCRYPTION_KEY must be ≥32 chars in production")
    : z.string().default(devEncryptionKey),

  // Wyscout Match Analysis (optional)
  WYSCOUT_API_KEY: z.string().default(""),
  WYSCOUT_BASE_URL: z.string().default("https://apirest.wyscout.com/v3"),

  // Sportmonks Fixtures API (optional)
  SPORTMONKS_API_TOKEN: z.string().default(""),

  // Database SSL
  DB_SSL_REJECT_UNAUTHORIZED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Sentry error tracking (optional)
  SENTRY_DSN: z.string().url().optional(),

  // Google Cloud Storage (optional — falls back to local disk if not set)
  GCS_BUCKET: z.string().default(""),
  GCS_PROJECT_ID: z.string().default(""),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().default(""),
  GCS_CREDENTIALS_JSON: z.string().default(""), // For PaaS: JSON string of service account key

  // Nutritionix Food API (optional)
  NUTRITIONIX_APP_ID: z.string().default(""),
  NUTRITIONIX_API_KEY: z.string().default(""),

  // Puppeteer (optional — override Chromium binary path)
  PUPPETEER_EXECUTABLE_PATH: z.string().default(""),

  // Production admin seed (optional)
  PROD_ADMIN_EMAIL: z.string().default("admin@sadara.com"),
  PROD_ADMIN_PASSWORD: z.string().default(""),
  PROD_ADMIN_NAME: z.string().default("System Admin"),
  PROD_ADMIN_NAME_AR: z.string().default("مدير النظام"),
});

// ── Parse & Validate ──
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error("Invalid environment variables", {
    issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  });
  // In production, crash immediately — don't start with bad config
  if (isProduction) {
    process.exit(1);
  }
  logger.warn("Continuing with defaults in development mode");
}

const validated = parsed.success
  ? parsed.data
  : envSchema.parse({
      ...process.env,
      // Force through with defaults for dev (parse will fill them in)
    });

// ── Dev-secret warnings ──
if (!isProduction) {
  if (!process.env.JWT_SECRET) {
    logger.warn(
      "⚠️  JWT_SECRET not set — using random per-startup secret. JWTs will NOT survive restarts. Set JWT_SECRET in .env for persistent sessions.",
    );
  }
  if (!process.env.ENCRYPTION_KEY) {
    logger.warn(
      "⚠️  ENCRYPTION_KEY not set — using random per-startup key. Encrypted data will NOT be readable after restart. Set ENCRYPTION_KEY in .env.",
    );
  }
}

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
    sslRejectUnauthorized: validated.DB_SSL_REJECT_UNAUTHORIZED,
  },

  jwt: {
    secret: validated.JWT_SECRET,
    expiresIn: validated.JWT_EXPIRES_IN,
    refreshExpiresIn: validated.JWT_REFRESH_EXPIRES_IN,
  },

  cors: {
    origin: validated.CORS_ORIGIN.includes(",")
      ? validated.CORS_ORIGIN.split(",").map((o) => o.trim())
      : validated.CORS_ORIGIN,
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
    from: validated.SMTP_FROM || validated.SMTP_USER || "noreply@sadara.com",
    secure: validated.SMTP_SECURE === "true",
  },

  frontend: {
    url: validated.FRONTEND_URL,
  },

  encryption: {
    key: validated.ENCRYPTION_KEY,
  },

  wyscout: {
    apiKey: validated.WYSCOUT_API_KEY,
    baseUrl: validated.WYSCOUT_BASE_URL,
  },

  sportmonks: {
    apiToken: validated.SPORTMONKS_API_TOKEN,
  },

  sentry: {
    dsn: validated.SENTRY_DSN,
  },

  gcs: {
    bucket: validated.GCS_BUCKET,
    projectId: validated.GCS_PROJECT_ID,
    credentials: validated.GOOGLE_APPLICATION_CREDENTIALS,
    credentialsJson: validated.GCS_CREDENTIALS_JSON,
  },

  nutritionix: {
    appId: validated.NUTRITIONIX_APP_ID,
    apiKey: validated.NUTRITIONIX_API_KEY,
  },

  puppeteer: {
    executablePath: validated.PUPPETEER_EXECUTABLE_PATH || undefined,
  },

  prodAdmin: {
    email: validated.PROD_ADMIN_EMAIL,
    password: validated.PROD_ADMIN_PASSWORD,
    name: validated.PROD_ADMIN_NAME,
    nameAr: validated.PROD_ADMIN_NAME_AR,
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;
