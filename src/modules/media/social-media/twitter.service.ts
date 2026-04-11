/**
 * Twitter/X API v2 integration service.
 *
 * Prerequisites (not yet configured):
 * 1. Register a Twitter Developer App at developer.twitter.com
 * 2. Set env vars: TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, TWITTER_CALLBACK_URL
 * 3. Run migration 101 to create social_media_accounts table
 * 4. Wire OAuth callback route in app.ts
 *
 * This file provides the foundation for posting tweets when a social post
 * is published with 'twitter' in its platforms array.
 */

import { logger } from "@config/logger";
import { env } from "@config/env";

// ── Types ──

interface TwitterConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

interface TweetPayload {
  text: string;
  mediaIds?: string[];
}

interface TweetResponse {
  id: string;
  text: string;
}

// ── Config ──

function getConfig(): TwitterConfig | null {
  const clientId = (env as any).twitter?.clientId;
  const clientSecret = (env as any).twitter?.clientSecret;
  const callbackUrl = (env as any).twitter?.callbackUrl;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret, callbackUrl: callbackUrl || "" };
}

export function isTwitterConfigured(): boolean {
  return getConfig() !== null;
}

// ── Post Tweet ──

export async function postTweet(
  accessToken: string,
  payload: TweetPayload,
): Promise<TweetResponse | null> {
  const config = getConfig();
  if (!config) {
    logger.warn("[twitter] Twitter API not configured — skipping post");
    return null;
  }

  try {
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: payload.text,
        ...(payload.mediaIds?.length
          ? { media: { media_ids: payload.mediaIds } }
          : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("[twitter] Failed to post tweet", {
        status: response.status,
        error,
      });
      return null;
    }

    const data = (await response.json()) as { data: TweetResponse };
    logger.info("[twitter] Tweet posted successfully", {
      tweetId: data.data.id,
    });
    return data.data;
  } catch (err) {
    logger.error("[twitter] Error posting tweet", err);
    return null;
  }
}

// ── Upload Media ──

export async function uploadMedia(
  accessToken: string,
  imageBuffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  try {
    // Twitter v1.1 media upload (v2 doesn't have media upload yet)
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append("media", blob);

    const response = await fetch(
      "https://upload.twitter.com/1.1/media/upload.json",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      logger.error("[twitter] Media upload failed", {
        status: response.status,
      });
      return null;
    }

    const data = (await response.json()) as { media_id_string: string };
    return data.media_id_string;
  } catch (err) {
    logger.error("[twitter] Error uploading media", err);
    return null;
  }
}

// ── OAuth 2.0 Helpers ──

export function getAuthorizationUrl(state: string): string | null {
  const config = getConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: "challenge",
    code_challenge_method: "plain",
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const config = getConfig();
  if (!config) return null;

  try {
    const credentials = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString("base64");

    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: config.callbackUrl,
        code_verifier: "challenge",
      }),
    });

    if (!response.ok) {
      logger.error("[twitter] Token exchange failed", {
        status: response.status,
      });
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (err) {
    logger.error("[twitter] Error exchanging code for token", err);
    return null;
  }
}
