/**
 * Owner-only admin authentication.
 *
 * Credentials come from environment variables (set them in Vercel →
 * Project → Settings → Environment Variables):
 *   ADMIN_USER      — owner username   (default: "admin")
 *   ADMIN_PASSWORD  — owner password   (default: "kaam2026" — CHANGE THIS)
 *   ADMIN_SECRET    — cookie-signing secret (defaults to a value derived
 *                     from the credentials)
 *
 * The session cookie is an HMAC-SHA256 token computed with Web Crypto so
 * the same code runs in the Node route handler and the edge proxy.
 */

export const ADMIN_COOKIE = "kaam_admin";
export const SESSION_HOURS = 8;

/** Access levels. The owner (env creds) is super_admin; sub-users are limited. */
export type AdminRole = "super_admin" | "verifier" | "finance";

export const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Owner (full access)",
  verifier: "Verifier (KYC desk)",
  finance: "Finance (reports)",
};

function isRole(v: string): v is AdminRole {
  return v === "super_admin" || v === "verifier" || v === "finance";
}

/**
 * Hash a sub-user password. Plain SHA-256 (no server secret) so the same hash
 * can be computed in the browser when the owner creates a member and on the
 * server at login. The admin_users table is hashed-at-rest; harden with
 * Supabase Auth before production.
 */
export async function hashAdminPassword(username: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`kaam-admin-user:${username.trim().toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getCredentials() {
  return {
    user: process.env.ADMIN_USER || "admin",
    password: process.env.ADMIN_PASSWORD || "kaam2026",
  };
}

function getSecret(): string {
  const { user, password } = getCredentials();
  return process.env.ADMIN_SECRET || `kaam-admin-secret:${user}:${password}`;
}

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkCredentials(user: string, password: string): Promise<boolean> {
  const expected = getCredentials();
  // Hash both sides so comparison time doesn't leak credential length.
  const [u1, u2, p1, p2] = await Promise.all([
    hmac(`u:${user}`),
    hmac(`u:${expected.user}`),
    hmac(`p:${password}`),
    hmac(`p:${expected.password}`),
  ]);
  return safeEqual(u1, u2) && safeEqual(p1, p2);
}

/** Session token: signed "expiresAtMs.role.signature". */
export async function createSessionToken(role: AdminRole = "super_admin"): Promise<string> {
  const expiresAt = Date.now() + SESSION_HOURS * 3600 * 1000;
  const signature = await hmac(`session:${expiresAt}:${role}`);
  return `${expiresAt}.${role}.${signature}`;
}

/** Returns the session's role, or null when the token is missing/invalid/expired. */
export async function verifySessionToken(token: string | undefined): Promise<AdminRole | null> {
  if (!token) return null;
  const [expiresAtRaw, role, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || !role || !signature || !isRole(role)) return null;
  if (Date.now() > expiresAt) return null;
  const ok = safeEqual(signature, await hmac(`session:${expiresAt}:${role}`));
  return ok ? role : null;
}
