import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkCredentials, createSessionToken, SESSION_HOURS } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    username = body.username ?? "";
    password = body.password ?? "";
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!(await checkCredentials(username, password))) {
    // Small delay blunts brute-force attempts.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Wrong username or password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return Response.json({ ok: true });
}
