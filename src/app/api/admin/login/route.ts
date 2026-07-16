import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  checkCredentials,
  createSessionToken,
  hashAdminPassword,
  SESSION_HOURS,
  type AdminRole,
} from "@/lib/admin-auth";
import { findAdminUserByUsername } from "@/lib/admin-users-server";

export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    // Trim — mobile keyboards/autofill often append a trailing space, which
    // would otherwise fail the exact-match credential check.
    username = (body.username ?? "").trim();
    password = (body.password ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  let role: AdminRole | null = null;

  // 1. Owner / super-admin — env credentials.
  if (await checkCredentials(username, password)) {
    role = "super_admin";
  } else {
    // 2. A privileged sub-user the owner created (verifier / finance).
    const member = await findAdminUserByUsername(username);
    if (member && member.active) {
      const hash = await hashAdminPassword(username, password);
      if (
        hash === member.password_hash &&
        (member.role === "verifier" || member.role === "finance")
      ) {
        role = member.role;
      }
    }
  }

  if (!role) {
    await new Promise((r) => setTimeout(r, 800)); // blunt brute-force
    return Response.json({ error: "Wrong username or password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await createSessionToken(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return Response.json({ ok: true, role });
}
