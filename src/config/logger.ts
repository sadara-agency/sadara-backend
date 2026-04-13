import winston from "winston";

const { combine, timestamp, printf, colorize, json } = winston.format;

// Human-readable format for development
const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${ts} ${level}: ${message}${metaStr}`;
  }),
);

// Strip circular refs and massive Sequelize internals from error objects
const safeErrors = winston.format((info) => {
  if (
    info.error &&
    typeof info.error === "object" &&
    !(typeof info.error === "string")
  ) {
    const e = info.error as any;
    info.error = {
      message: e.message,
      stack: e.stack,
      ...(e.original?.message && { dbError: e.original.message }),
      ...(e.code && { code: e.code }),
    };
  }
  return info;
})();

// JSON format for production (structured, parseable by log aggregators)
const prodFormat = combine(timestamp(), safeErrors, json());

// logger.ts is imported by config/env.ts so we cannot import env here
// (circular dependency). Reading NODE_ENV directly is intentional bootstrap code.
const isProduction = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: { service: "sadara-api" },
  transports: [
    new winston.transports.Console(),
    // In production, also log errors to a file
    ...(isProduction
      ? [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5_242_880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 5_242_880,
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  // Don't crash on unhandled rejections — log them
  exceptionHandlers: isProduction
    ? [new winston.transports.File({ filename: "logs/exceptions.log" })]
    : undefined,
});

// Stream for Morgan HTTP logger integration
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
