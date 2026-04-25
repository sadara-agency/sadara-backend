/// <reference types="jest" />

// Tests for the SAFF+ Phase 3 pure-function helpers used by the
// event scraper and the video extractor:
//
//   • normalizeMatchEventType — recognizes English + Arabic event labels
//   • classifyStreamUrl       — protocol/CDN/embed-only detection from URL
//   • parseSignedExpiry path  — covered indirectly via classifyStreamUrl
//
// The Puppeteer-based extractor itself isn't unit-tested (it spawns a
// real browser); it's gated behind SAFFPLUS_VIDEO_EXTRACTION=true and
// degrades gracefully with a circuit breaker when extraction fails.

import { normalizeMatchEventType } from "../../../src/modules/saffplus/saffplus.provider";
import { classifyStreamUrl } from "../../../src/modules/saffplus/saffplus.video";

describe("normalizeMatchEventType", () => {
  // ── Goals ──
  it("recognizes goal variants", () => {
    expect(normalizeMatchEventType("goal")).toBe("goal");
    expect(normalizeMatchEventType("GOAL")).toBe("goal");
    expect(normalizeMatchEventType("scored")).toBe("goal");
  });

  it("recognizes own_goal", () => {
    expect(normalizeMatchEventType("own_goal")).toBe("own_goal");
    expect(normalizeMatchEventType("Own Goal")).toBe("own_goal");
    expect(normalizeMatchEventType("owngoal")).toBe("own_goal");
  });

  it("recognizes penalty goals + misses", () => {
    expect(normalizeMatchEventType("penalty_goal")).toBe("penalty_goal");
    expect(normalizeMatchEventType("penalty_scored")).toBe("penalty_goal");
    expect(normalizeMatchEventType("penalty_miss")).toBe("penalty_miss");
    expect(normalizeMatchEventType("penalty_missed")).toBe("penalty_miss");
  });

  // ── Cards ──
  it("recognizes yellow / second yellow / red", () => {
    expect(normalizeMatchEventType("yellow")).toBe("yellow");
    expect(normalizeMatchEventType("YellowCard")).toBe("yellow");
    expect(normalizeMatchEventType("second_yellow")).toBe("second_yellow");
    expect(normalizeMatchEventType("red")).toBe("red");
    expect(normalizeMatchEventType("RedCard")).toBe("red");
  });

  // ── Subs ──
  it("recognizes sub_in / sub_out / generic substitution", () => {
    expect(normalizeMatchEventType("sub_in")).toBe("sub_in");
    expect(normalizeMatchEventType("sub_out")).toBe("sub_out");
    expect(normalizeMatchEventType("substitution")).toBe("sub_in");
    expect(normalizeMatchEventType("sub")).toBe("sub_in");
  });

  // ── Period markers ──
  it("recognizes kickoff / halftime / fulltime", () => {
    expect(normalizeMatchEventType("kickoff")).toBe("kickoff");
    expect(normalizeMatchEventType("HT")).toBe("halftime");
    expect(normalizeMatchEventType("halftime")).toBe("halftime");
    expect(normalizeMatchEventType("FT")).toBe("fulltime");
    expect(normalizeMatchEventType("fulltime")).toBe("fulltime");
  });

  // ── VAR / injury ──
  it("recognizes VAR variants", () => {
    expect(normalizeMatchEventType("var_review")).toBe("var_review");
    expect(normalizeMatchEventType("VAR")).toBe("var_review");
    expect(normalizeMatchEventType("var_overturn")).toBe("var_overturn");
    expect(normalizeMatchEventType("var_reversal")).toBe("var_overturn");
  });

  it("recognizes injury", () => {
    expect(normalizeMatchEventType("injury")).toBe("injury");
  });

  // ── Arabic labels ──
  it("recognizes Arabic event labels", () => {
    expect(normalizeMatchEventType("هدف")).toBe("goal");
    expect(normalizeMatchEventType("بطاقة صفراء")).toBe("yellow");
    expect(normalizeMatchEventType("بطاقة حمراء")).toBe("red");
    expect(normalizeMatchEventType("تبديل")).toBe("sub_in");
    expect(normalizeMatchEventType("ركلة جزاء")).toBe("penalty_goal");
  });

  // ── Defaults ──
  it("returns null for unrecognized / empty input", () => {
    expect(normalizeMatchEventType("???")).toBeNull();
    expect(normalizeMatchEventType("")).toBeNull();
    expect(normalizeMatchEventType(null)).toBeNull();
    expect(normalizeMatchEventType(undefined)).toBeNull();
  });
});

describe("classifyStreamUrl", () => {
  // ── Protocol detection ──
  it("detects HLS (.m3u8)", () => {
    const r = classifyStreamUrl("https://stream.example.com/live/playlist.m3u8");
    expect(r.protocol).toBe("hls");
    expect(r.embedOnly).toBe(false);
  });

  it("detects DASH (.mpd)", () => {
    const r = classifyStreamUrl("https://stream.example.com/live/manifest.mpd");
    expect(r.protocol).toBe("dash");
  });

  it("detects MP4 file URLs", () => {
    const r = classifyStreamUrl(
      "https://cdn.example.com/match-12345.mp4?token=abc",
    );
    expect(r.protocol).toBe("mp4");
  });

  it("detects YouTube as embed-only", () => {
    const r = classifyStreamUrl(
      "https://www.youtube.com/embed/abc123",
    );
    expect(r.protocol).toBe("youtube");
    expect(r.cdn).toBe("youtube");
    expect(r.embedOnly).toBe(true);
  });

  it("detects Twitch as embed-only", () => {
    const r = classifyStreamUrl("https://player.twitch.tv/?channel=foo");
    expect(r.protocol).toBe("twitch");
    expect(r.embedOnly).toBe(true);
  });

  it("detects iframe-embed pattern", () => {
    const r = classifyStreamUrl("https://player.example.com/embed/abc");
    expect(r.protocol).toBe("iframe_embed");
    expect(r.embedOnly).toBe(true);
  });

  // ── CDN classification ──
  it("recognizes Sadeem CDN", () => {
    const r = classifyStreamUrl(
      "https://stream.sadeem.tv/live/match-1.m3u8",
    );
    expect(r.cdn).toBe("sadeem");
    expect(r.protocol).toBe("hls");
    expect(r.embedOnly).toBe(false);
  });

  it("recognizes Vimeo as embed-only regardless of URL form", () => {
    const r = classifyStreamUrl("https://vimeo.com/12345");
    expect(r.cdn).toBe("vimeo");
    expect(r.embedOnly).toBe(true);
  });

  it("recognizes Cloudflare Stream", () => {
    const r = classifyStreamUrl(
      "https://customer-1234.cloudflarestream.com/abc/manifest/video.m3u8",
    );
    expect(r.cdn).toBe("cloudflare");
    expect(r.protocol).toBe("hls");
  });

  it("falls back to 'unknown' for unrecognized hosts", () => {
    const r = classifyStreamUrl(
      "https://random.example.org/stream.m3u8",
    );
    expect(r.cdn).toBe("unknown");
    expect(r.protocol).toBe("hls");
  });

  // ── Signed-URL expiry ──
  it("parses CloudFront-style ?Expires= epoch", () => {
    const futureEpoch = Math.floor(Date.now() / 1000) + 3600; // +1h
    const r = classifyStreamUrl(
      `https://cdn.example.com/v.m3u8?Expires=${futureEpoch}&Signature=xyz`,
    );
    expect(r.expiresAt).not.toBeNull();
    expect(r.expiresAt!.getTime()).toBe(futureEpoch * 1000);
  });

  it("rejects past Expires values", () => {
    const pastEpoch = Math.floor(Date.now() / 1000) - 3600;
    const r = classifyStreamUrl(
      `https://cdn.example.com/v.m3u8?Expires=${pastEpoch}&Signature=xyz`,
    );
    expect(r.expiresAt).toBeNull();
  });

  it("treats Akamai/HMAC-signed tokens as ~4h expiry", () => {
    const r = classifyStreamUrl(
      "https://akamai.example.com/v.m3u8?hdnts=exp=1234~hmac=abc",
    );
    expect(r.expiresAt).not.toBeNull();
    // Should be roughly 4 hours from now (allow 60s skew)
    const ms = r.expiresAt!.getTime() - Date.now();
    expect(ms).toBeGreaterThan(4 * 60 * 60 * 1000 - 60_000);
    expect(ms).toBeLessThan(4 * 60 * 60 * 1000 + 60_000);
  });

  it("returns null expiresAt for unsigned URLs", () => {
    const r = classifyStreamUrl("https://stream.example.com/live.m3u8");
    expect(r.expiresAt).toBeNull();
  });
});
