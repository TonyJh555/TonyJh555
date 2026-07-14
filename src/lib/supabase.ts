import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for KAAM.
 *
 * The app runs fully on localStorage until these two environment variables
 * are set (Vercel → Project → Settings → Environment Variables):
 *   NEXT_PUBLIC_SUPABASE_URL       — your project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  — the public anon key
 *
 * Both are safe to expose to the browser (that's what the anon key is for);
 * Row Level Security in supabase/schema.sql is what protects the data.
 * When they're present, KAAM switches to the shared cloud database so
 * accounts, bookings, chat and job alerts work across every device.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;

/** Returns the shared client, or null when Supabase isn't configured yet. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
