# ── Stage 1: Builder ──────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy package manifests first (layer caching)
COPY package.json package-lock.json ./

RUN npm ci

# Copy source and build
COPY tsconfig.build.json tsconfig.json ./
COPY src/ src/

RUN npm run build

# ── Stage 2: Production ──────────────────────────────────
FROM node:20-slim

# Install Chromium + system libs for Puppeteer PDF generation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    fonts-noto-core \
    fonts-noto \
    fontconfig \
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

# Install IBM Plex Sans Arabic (brand font for PDF generation)
COPY fonts/ /usr/local/share/fonts/arabic/
RUN fc-cache -f

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Non-root user
RUN groupadd -r sadara && useradd -r -g sadara -m sadara

WORKDIR /app

# Production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist dist/

# Runtime directories
RUN mkdir -p tmp uploads logs && chown -R sadara:sadara /app

USER sadara

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["node", "dist/index.js"]
