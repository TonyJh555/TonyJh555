/**
 * Server-side lookup of admin team members from Supabase (used by the login
 * route). Uses the REST API with the publishable key — no React/browser deps
 * so it is safe to import in a route handler. Returns null on any failure so
 * the owner's env-based login always keeps working even if the cloud is down.
 */

const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://gdhmyjrkpkysxnibaxqy.supabase.co";
const SUPA_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_4qDLLe1uCiYGIaAzRXmf3A_OLJd79dD";

export interface AdminUserRow {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  role: string;
  active: boolean;
}

export async function findAdminUserByUsername(username: string): Promise<AdminUserRow | null> {
  try {
    const url =
      `${SUPA_URL}/rest/v1/admin_users` +
      `?username=eq.${encodeURIComponent(username.trim())}&select=*&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as AdminUserRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
