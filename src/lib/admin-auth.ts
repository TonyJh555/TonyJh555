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

/** Session token: signed expiry timestamp — "expiresAtMs.signature". */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_HOURS * 3600 * 1000;
  const signature = await hmac(`session:${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (Date.now() > expiresAt) return false;
  return safeEqual(signature, await hmac(`session:${expiresAt}`));
}
