// ─────────────────────────────────────────────────────────────
// src/shared/utils/supabaseStorage.ts — Supabase Storage client (lazy singleton)
// ─────────────────────────────────────────────────────────────
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "@config/env";

/** True when Supabase Storage is configured (otherwise storage.ts uses local disk). */
export const USE_SUPABASE = !!(env.supabase.url && env.supabase.serviceRoleKey);

let client: SupabaseClient | null = null;

/** Returns a memoized service-role Supabase client. Throws if unconfigured. */
export function getSupabase(): SupabaseClient {
  if (!USE_SUPABASE) {
    throw new Error(
      "[supabaseStorage] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set",
    );
  }
  if (!client) {
    client = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        transport: WebSocket as unknown as typeof globalThis.WebSocket,
      },
    });
  }
  return client;
}

/** Build the public URL for a stored object key. */
export function publicUrlForKey(key: string): string {
  // getPublicUrl is synchronous and never throws for a public bucket.
  return getSupabase().storage.from(env.supabase.bucket).getPublicUrl(key).data
    .publicUrl;
}
