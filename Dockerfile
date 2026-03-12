# ── Stage 1: Builder ──────────────────────────────────────
# Build context must be the repo root (for workspace access to shared/)
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace root + package manifests first (layer caching)
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/

RUN npm ci -w @sadara/shared -w sadara-backend

# Build shared types first, then backend
COPY shared/ shared/
RUN npm run build -w @sadara/shared

COPY backend/ backend/
RUN npm run build -w sadara-backend

# ── Stage 2: Production ──────────────────────────────────
FROM node:20-slim

# Install Chrome dependencies + Arabic fonts (for Puppeteer PDF generation)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    fonts-noto-core \
    fonts-noto \
    fonts-arabeyes \
    fonts-hosny-amiri \
    fonts-kacst \
    fonts-kacst-one \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Non-root user
RUN groupadd -r sadara && useradd -r -g sadara -m sadara

WORKDIR /app

# Production dependencies only (workspace-aware)
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm ci -w @sadara/shared -w sadara-backend --omit=dev

# Copy compiled shared types + backend output from builder
COPY --from=builder /app/shared/dist shared/dist
COPY --from=builder /app/backend/dist backend/dist

# Copy backend assets
COPY --from=builder /app/backend/dist/assets backend/dist/assets

# Runtime directories
RUN mkdir -p backend/tmp backend/uploads backend/logs && chown -R sadara:sadara /app

USER sadara

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["node", "backend/dist/index.js"]
