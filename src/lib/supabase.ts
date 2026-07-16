import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

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

/* ── Cloud connection status ─────────────────────────────────────────────────
 * A one-time probe so the UI can honestly tell the user whether the app is
 * actually syncing across devices, or silently running on-device because the
 * database tables haven't been created yet (the one setup step). This removes
 * the "why didn't my booking arrive?" confusion.
 */
export type CloudStatus = "checking" | "online" | "setup-needed" | "offline";

let cloudStatus: CloudStatus = "checking";
let probeStarted = false;
const statusListeners = new Set<() => void>();

function setStatus(next: CloudStatus) {
  if (cloudStatus === next) return;
  cloudStatus = next;
  statusListeners.forEach((fn) => fn());
}

async function probeCloud() {
  const sb = getSupabase();
  if (!sb) {
    setStatus("offline");
    return;
  }
  try {
    // Cheapest possible query — does the bookings table exist & respond?
    const { error } = await sb.from("bookings").select("id").limit(1);
    if (!error) {
      setStatus("online");
    } else {
      // Missing table / relation not found → schema hasn't been run yet.
      setStatus("setup-needed");
    }
  } catch {
    setStatus("offline"); // network/DNS failure
  }
}

function subscribeStatus(fn: () => void) {
  if (!probeStarted && typeof window !== "undefined") {
    probeStarted = true;
    probeCloud();
  }
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

/** Live cloud-sync status for status banners. */
export function useCloudStatus(): CloudStatus {
  return useSyncExternalStore(subscribeStatus, () => cloudStatus, () => "checking");
}
