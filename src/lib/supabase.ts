import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Canonical browser Supabase client for KAAM's client-side stores.
 *
 * The KAAM project's URL and publishable key are baked in below as defaults so
 * cloud sync works out of the box — no Vercel env-var setup needed. These two
 * values are PUBLIC by design (the publishable key is meant to ship inside the
 * client bundle; it is not a secret). To point KAAM at a different Supabase
 * project, set these env vars (locally in .env.local, or in Vercel → Settings →
 * Environment Variables) — they take precedence over the baked-in defaults:
 *   NEXT_PUBLIC_SUPABASE_URL              — your project URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — the publishable (public) key
 *
 * Cloud sync makes accounts, bookings, chat and job alerts work across every
 * device. Access is governed by Row Level Security in supabase/schema.sql.
 * The one required setup step is running that schema once in the Supabase
 * SQL editor (see SUPABASE_SETUP.md).
 */

/** Public project defaults — safe to commit (publishable key, not a secret). */
const DEFAULT_URL = "https://gdhmyjrkpkysxnibaxqy.supabase.co";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_4qDLLe1uCiYGIaAzRXmf3A_OLJd79dD";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? // legacy name fallback
  DEFAULT_PUBLISHABLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key);
}

let client: SupabaseClient | null = null;

/** Returns the shared browser client, or null when Supabase isn't configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) client = createBrowserClient(url!, key!);
  return client;
}
