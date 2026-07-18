import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 *
 * The service-role key bypasses Row Level Security, so it must NEVER reach the
 * browser — this module is imported only from server routes. It powers reading
 * privileged data (worker KYC documents, the admin_users table) once those
 * tables are locked down to service-role in supabase/hardening.sql.
 *
 * Set SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables
 * (it is a SECRET — never commit it, never expose it with NEXT_PUBLIC_). When
 * it is absent, this returns null and callers fall back to the current
 * behaviour, so the app keeps working before the hardening step is applied.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://gdhmyjrkpkysxnibaxqy.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!serviceKey) return null;
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Whether privileged, service-role access is configured on this deployment. */
export function isServiceRoleConfigured(): boolean {
  return Boolean(serviceKey);
}
