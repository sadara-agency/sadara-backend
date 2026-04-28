/**
 * SAFF+ Video URL Extractor
 *
 * SAFF+ embeds match video via a JS-hydrated <video> or <iframe> player —
 * axios + cheerio cannot see the source URL because it's set after page
 * load. This module uses Puppeteer to render the page in a real browser
 * just long enough to capture the URL, then closes.
 *
 * Design notes:
 *   • Singleton browser pool with auto-close after idle (matches the
 *     pattern used by shared/utils/pdf.ts).
 *   • Gated behind env `SAFFPLUS_VIDEO_EXTRACTION` — defaults to off
 *     so dev/test environments don't try to spawn Chromium. Operators
 *     enable it explicitly in prod.
 *   • Circuit breaker: 5 consecutive failures disable extraction for
 *     1 hour. Video data is non-critical; degrade gracefully.
 *   • Storage policy: we capture the URL only. Never re-host or proxy
 *     video. If the URL is a signed/expiring HLS manifest, the caller
 *     records `expires_at` so a refresh cron can re-extract later.
 */

import puppeteer, { type Browser, type Page } from "puppeteer";
import { logger } from "@config/logger";
import { env } from "@config/env";

// ── Types ──

export type StreamProtocol =
  | "hls"
  | "dash"
  | "mp4"
  | "iframe_embed"
  | "youtube"
  | "twitch";

export type CdnProvider =
  | "sadeem"
  | "streamonics"
  | "vimeo"
  | "youtube"
  | "twitch"
  | "cloudflare"
  | "akamai"
  | "unknown";

export interface ExtractedVideo {
  url: string;
  streamProtocol: StreamProtocol;
  cdnProvider: CdnProvider;
  /** When set, the URL has a signed/expiring component. */
  expiresAt: Date | null;
  /** True when the player is iframed and we shouldn't try to play the
   *  manifest directly (use <iframe> on the frontend instead). */
  embedOnly: boolean;
}

// ══════════════════════════════════════════
// PURE-FUNCTION URL CLASSIFICATION (testable)
// ══════════════════════════════════════════

/**
 * Detect the streaming protocol from a URL. Pure function — no I/O.
 * Used by the Puppeteer extractor and reusable by the cron when
 * deciding whether a stored URL still needs re-extraction.
 */
export function classifyStreamUrl(url: string): {
  protocol: StreamProtocol;
  cdn: CdnProvider;
  embedOnly: boolean;
  expiresAt: Date | null;
} {
  const lower = url.toLowerCase();

  // Protocol — order matters, more specific first
  let protocol: StreamProtocol = "mp4";
  if (lower.includes(".m3u8")) protocol = "hls";
  else if (lower.includes(".mpd")) protocol = "dash";
  else if (lower.includes("youtube.com") || lower.includes("youtu.be"))
    protocol = "youtube";
  else if (lower.includes("twitch.tv")) protocol = "twitch";
  else if (
    lower.includes("/embed/") ||
    lower.includes("player.") ||
    lower.includes("?embed=")
  )
    protocol = "iframe_embed";
  else if (lower.endsWith(".mp4") || lower.includes(".mp4?")) protocol = "mp4";

  // CDN provider — best-effort recognition by hostname
  let cdn: CdnProvider = "unknown";
  if (lower.includes("sadeem.tv") || lower.includes("sadeem.cdn"))
    cdn = "sadeem";
  else if (lower.includes("streamonics")) cdn = "streamonics";
  else if (lower.includes("youtube.com") || lower.includes("youtu.be"))
    cdn = "youtube";
  else if (lower.includes("vimeo.com")) cdn = "vimeo";
  else if (lower.includes("twitch.tv")) cdn = "twitch";
  else if (lower.includes("cloudflarestream.com")) cdn = "cloudflare";
  else if (lower.includes("akamaihd.net") || lower.includes(".akamai"))
    cdn = "akamai";

  // youtube/twitch/vimeo are always iframe-only by ToS
  const embedOnly =
    protocol === "iframe_embed" ||
    protocol === "youtube" ||
    protocol === "twitch" ||
    cdn === "vimeo" ||
    cdn === "youtube" ||
    cdn === "twitch";

  // Signed-URL expiry — try the common patterns
  // (?Expires=12345 OR ?Policy=...&Signature=... etc.)
  const expiresAt = parseSignedExpiry(url);

  return { protocol, cdn, embedOnly, expiresAt };
}

function parseSignedExpiry(url: string): Date | null {
  try {
    const u = new URL(url);
    // CloudFront / generic Expires=epoch
    const exp = u.searchParams.get("Expires") ?? u.searchParams.get("expires");
    if (exp && /^\d+$/.test(exp)) {
      const ms = Number(exp) * 1000;
      // Sanity: must be in the future and within 30 days
      if (ms > Date.now() && ms < Date.now() + 30 * 24 * 60 * 60 * 1000) {
        return new Date(ms);
      }
    }
    // Akamai HMAC tokens often use `hdnts` / `token`; can't be parsed without a key,
    // but signal that the URL is signed by setting a conservative 4-hour expiry.
    if (
      u.searchParams.has("hdnts") ||
      u.searchParams.has("token") ||
      u.searchParams.has("auth")
    ) {
      return new Date(Date.now() + 4 * 60 * 60 * 1000);
    }
  } catch {
    // Malformed URL — leave expiresAt null
  }
  return null;
}

// ══════════════════════════════════════════
// PUPPETEER POOL + CIRCUIT BREAKER
// ══════════════════════════════════════════

let sharedBrowser: Browser | null = null;
let browserIdleTimer: ReturnType<typeof setTimeout> | null = null;
const BROWSER_IDLE_MS = 5 * 60 * 1000;
const PAGE_TIMEOUT_MS = 10_000;

// Circuit breaker: after CIRCUIT_THRESHOLD consecutive failures, refuse
// extraction calls for CIRCUIT_RESET_MS. Video data is non-critical so
// we degrade gracefully (caller gets null and continues).
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60 * 60 * 1000; // 1 hour
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function recordSuccess() {
  consecutiveFailures = 0;
}

function recordFailure() {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
    consecutiveFailures = 0;
    logger.warn(
      `[SAFF+ video] Circuit breaker opened — disabling extraction until ${new Date(circuitOpenUntil).toISOString()}`,
    );
  }
}

async function getBrowser(): Promise<Browser> {
  if (browserIdleTimer) {
    clearTimeout(browserIdleTimer);
    browserIdleTimer = null;
  }
  if (sharedBrowser) {
    try {
      await sharedBrowser.version();
      scheduleClose();
      return sharedBrowser;
    } catch {
      sharedBrowser = null;
    }
  }
  sharedBrowser = await puppeteer.launch({
    headless: true,
    executablePath: env.puppeteer.executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  scheduleClose();
  return sharedBrowser;
}

function scheduleClose() {
  if (browserIdleTimer) clearTimeout(browserIdleTimer);
  browserIdleTimer = setTimeout(async () => {
    if (sharedBrowser) {
      try {
        await sharedBrowser.close();
      } catch {
        // tolerate
      }
      sharedBrowser = null;
    }
    browserIdleTimer = null;
  }, BROWSER_IDLE_MS);
}

// ══════════════════════════════════════════
// RENDERED-PAGE FETCHING (saffplus.sa is fully CSR)
// ══════════════════════════════════════════

export interface RenderResult {
  html: string;
  /** All JSON responses captured from the page's network calls.
   *  Useful when the data we want lives in an XHR rather than the DOM. */
  jsonResponses: Array<{ url: string; data: unknown }>;
  reason: "ok" | "disabled" | "circuit_open" | "timeout" | "error";
}

/**
 * Render a saffplus.sa page in headless Chrome and return the post-hydration
 * HTML plus any JSON XHR responses the page made. Required because saffplus.sa
 * bails out to client-side rendering — the SSR HTML is just an empty React
 * shell, so axios+cheerio sees no competition/club data. We need a real
 * browser to execute the JS that actually fetches the data.
 *
 * Reuses the same Puppeteer pool (and circuit breaker) as the video extractor,
 * so we never spin up two separate Chromium instances.
 *
 * Gating: this function works without the SAFFPLUS_VIDEO_EXTRACTION env flag
 * because rendering pages is the data path itself — disabling it would mean
 * no SAFF+ data at all. Only video URL extraction is gated by the flag.
 */
export async function renderSaffPlusPage(
  path: string,
  options: {
    /** CSS selector to wait for after page load (e.g. anchor to data we want). */
    waitForSelector?: string;
    /** Max time to wait for the selector before continuing anyway. */
    selectorTimeoutMs?: number;
    /** When true, also wait for network idle (no in-flight XHR for 500ms). */
    waitForNetworkIdle?: boolean;
  } = {},
): Promise<RenderResult> {
  if (isCircuitOpen()) {
    logger.info(`[SAFF+ render] Circuit open — skipping render of ${path}`);
    return {
      html: "",
      jsonResponses: [],
      reason: "circuit_open",
    };
  }

  const {
    waitForSelector,
    selectorTimeoutMs = PAGE_TIMEOUT_MS,
    waitForNetworkIdle = true,
  } = options;

  let page: Page | null = null;
  const jsonResponses: Array<{ url: string; data: unknown }> = [];

  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    // Renders take longer than video extraction; bump timeouts.
    const renderTimeoutMs = 20_000;
    page.setDefaultTimeout(renderTimeoutMs);
    page.setDefaultNavigationTimeout(renderTimeoutMs);

    // Log ALL request URLs from Motto/saffplus domains (diagnostic — helps identify
    // endpoints that return non-JSON data like protobuf that our response filter missed).
    page.on("request", (request) => {
      const url = request.url();
      if (
        url.includes("saffplus.sa") ||
        url.includes("mottostreaming.com") ||
        url.includes("mottocdn.com")
      ) {
        logger.debug(`[SAFF+ req] ${request.method()} ${url.slice(0, 300)}`);
      }
    });

    // Capture responses from Motto/saffplus domains.
    // Domain filter runs first; content-type check is skipped so protobuf-JSON
    // bridge responses (which sometimes arrive as application/grpc or text/plain)
    // are still attempted. response.json() will throw on true binary — we catch it.
    page.on("response", async (response) => {
      try {
        const url = response.url();
        // Only capture responses from saffplus.sa or Motto CDN/streaming — skip
        // ad networks, analytics, cookie-consent, etc.
        if (
          !url.includes("saffplus.sa") &&
          !url.includes("mottocdn.com") &&
          !url.includes("mottostreaming.com") &&
          !url.includes("motto.")
        ) {
          return;
        }
        // Try JSON parse regardless of declared content-type.
        // Motto's protobuf-JSON bridge may return application/grpc or no content-type.
        const data = await response.json().catch(() => null);
        if (data != null) jsonResponses.push({ url, data });
      } catch {
        // tolerate per-response failures
      }
    });

    const url = `${BASE_URL}${path}`;
    await page.goto(url, {
      waitUntil: waitForNetworkIdle ? "networkidle0" : "domcontentloaded",
      timeout: renderTimeoutMs,
    });

    if (waitForSelector) {
      await page
        .waitForSelector(waitForSelector, { timeout: selectorTimeoutMs })
        .catch(() => {
          // Selector didn't appear — fall through; HTML may still be useful.
        });
    }

    const html = await page.content();
    recordSuccess();
    logger.info(
      `[SAFF+ render] ${path}: ${html.length}b html, ${jsonResponses.length} json responses`,
    );
    return { html, jsonResponses, reason: "ok" };
  } catch (err) {
    recordFailure();
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[SAFF+ render] Failed for ${path}: ${msg}`);
    return {
      html: "",
      jsonResponses,
      reason: msg.includes("timeout") ? "timeout" : "error",
    };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // tolerate
      }
    }
  }
}

const BASE_URL = "https://saffplus.sa";

/** Force-close the singleton browser. Used by tests + graceful shutdown. */
export async function closeVideoExtractor(): Promise<void> {
  if (browserIdleTimer) {
    clearTimeout(browserIdleTimer);
    browserIdleTimer = null;
  }
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch {
      // tolerate
    }
    sharedBrowser = null;
  }
}

// ══════════════════════════════════════════
// EXTRACTION
// ══════════════════════════════════════════

export interface ExtractMatchVideoResult {
  /** Empty array when extraction is disabled, the circuit is open, or
   *  the page didn't expose any playable URLs. */
  videos: ExtractedVideo[];
  /** Reason for an empty result, for telemetry/audit. */
  reason: "ok" | "disabled" | "circuit_open" | "no_player_found" | "error";
}

/**
 * Render the SAFF+ match page in headless Chrome and capture the
 * underlying video URL(s). Returns an empty array (with a reason)
 * rather than throwing, so callers can store partial data without
 * special-casing every error.
 */
export async function extractMatchVideoUrl(
  providerMatchId: string,
): Promise<ExtractMatchVideoResult> {
  if (process.env.SAFFPLUS_VIDEO_EXTRACTION !== "true") {
    return { videos: [], reason: "disabled" };
  }
  if (isCircuitOpen()) {
    logger.info(
      `[SAFF+ video] Circuit open — skipping extraction for ${providerMatchId}`,
    );
    return { videos: [], reason: "circuit_open" };
  }

  let page: Page | null = null;
  // Network-intercepted URLs (Motto API delivers the HLS manifest via XHR,
  // not by setting <video src> in the DOM — so DOM inspection alone misses it).
  const networkUrls: Array<{ url: string; kind: string }> = [];

  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);

    // Capture network request URLs that are definitively stream manifests or
    // known player embed pages. We intentionally exclude image/asset CDN paths
    // (mottocdn.com/images, mottocdn.com/assets) to avoid treating poster
    // thumbnails as video sources.
    page.on("request", (req) => {
      const u = req.url();
      const lower = u.toLowerCase();

      // Direct stream manifests — highest confidence
      if (lower.includes(".m3u8") || lower.includes(".mpd")) {
        const kind = lower.includes(".m3u8") ? "hls" : "dash";
        networkUrls.push({ url: u, kind });
        return;
      }

      // Motto streaming player pages (not CDN image/asset paths)
      if (
        lower.includes("mottostreaming.com") &&
        !lower.includes("/images/") &&
        !lower.includes("/assets/") &&
        !lower.includes("/static/") &&
        (lower.includes("/watch") ||
          lower.includes("/live") ||
          lower.includes("/event") ||
          lower.includes("/player") ||
          lower.includes("/embed"))
      ) {
        networkUrls.push({ url: u, kind: "iframe" });
        return;
      }

      // Sadeem TV player pages
      if (
        lower.includes("sadeem.tv") &&
        (lower.includes("/watch") ||
          lower.includes("/live") ||
          lower.includes("/embed") ||
          lower.includes("/player"))
      ) {
        networkUrls.push({ url: u, kind: "iframe" });
      }
    });

    const pageUrl = `https://saffplus.sa/ar/event/match/${providerMatchId}`;
    // Use networkidle0 so we wait for the Motto API calls to complete.
    await page.goto(pageUrl, { waitUntil: "networkidle0" });

    // Also wait for a DOM player element as a secondary signal; ignore timeout.
    await Promise.race([
      page.waitForSelector("video", { timeout: PAGE_TIMEOUT_MS }),
      page.waitForSelector('iframe[src*="player"]', {
        timeout: PAGE_TIMEOUT_MS,
      }),
      page.waitForSelector('source[type="application/x-mpegURL"]', {
        timeout: PAGE_TIMEOUT_MS,
      }),
    ]).catch(() => {});

    // Note: this callback runs in the browser context, not Node.
    // We avoid pulling DOM lib types into the backend tsconfig by
    // accessing document through a generic cast.
    const domCaptured = await page.evaluate(() => {
      const doc = (
        globalThis as unknown as {
          document: { querySelectorAll: (s: string) => Iterable<unknown> };
        }
      ).document;
      const out: Array<{ url: string; kind: string }> = [];
      Array.from(doc.querySelectorAll("video")).forEach((v) => {
        const el = v as {
          src?: string;
          querySelectorAll: (s: string) => Iterable<unknown>;
        };
        if (el.src) out.push({ url: el.src, kind: "video" });
        Array.from(el.querySelectorAll("source")).forEach((s) => {
          const src = (s as { src?: string }).src;
          if (src) out.push({ url: src, kind: "source" });
        });
      });
      Array.from(
        doc.querySelectorAll('iframe[src*="player"], iframe[src*="embed"]'),
      ).forEach((f) => {
        const src = (f as { src?: string }).src;
        if (src) out.push({ url: src, kind: "iframe" });
      });
      return out;
    });

    // Merge network-intercepted + DOM sources; network takes priority for HLS/DASH.
    const captured = [...networkUrls, ...domCaptured];

    if (captured.length === 0) {
      // Page loaded but no player found — not a Puppeteer/infra failure,
      // so don't count against the circuit breaker.
      return { videos: [], reason: "no_player_found" };
    }

    // Dedupe + classify — drop URLs that are clearly not playable streams
    const seen = new Set<string>();
    const videos: ExtractedVideo[] = [];
    for (const c of captured) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);

      const lower = c.url.toLowerCase();
      // Skip image CDN paths
      if (
        lower.includes("/images/") ||
        lower.includes("/assets/") ||
        lower.includes("/static/")
      )
        continue;
      // Skip bare MP4 segments (init.mp4, segment_NNNNN.mp4) — not standalone playable
      if (/\/segment_\d+\.mp4|\/init\.mp4/.test(lower)) continue;
      // Skip CDA API calls stored as video URLs
      if (lower.includes("cda.mottostreaming.com")) continue;
      // Skip data URIs
      if (lower.startsWith("data:")) continue;

      const cls = classifyStreamUrl(c.url);
      videos.push({
        url: c.url,
        streamProtocol: cls.protocol,
        cdnProvider: cls.cdn,
        expiresAt: cls.expiresAt,
        embedOnly: cls.embedOnly,
      });
    }

    recordSuccess();
    logger.info(
      `[SAFF+ video] Extracted ${videos.length} URL(s) for match ${providerMatchId}`,
    );
    return { videos, reason: "ok" };
  } catch (err) {
    recordFailure();
    logger.warn(
      `[SAFF+ video] Extraction failed for ${providerMatchId}: ${(err as Error).message}`,
    );
    return { videos: [], reason: "error" };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // tolerate
      }
    }
  }
}
