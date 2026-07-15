import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Canonical browser Supabase client for KAAM's client-side stores.
 *
 * The app runs fully on localStorage until these env vars are set (locally
 * in .env.local, and in Vercel → Settings → Environment Variables):
 *   NEXT_PUBLIC_SUPABASE_URL              — your project URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — the publishable (public) key
 *
 * When present, KAAM switches to the shared cloud database so accounts,
 * bookings, chat and job alerts work across every device. Row Level
 * Security in supabase/schema.sql protects the data.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // legacy name fallback

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
