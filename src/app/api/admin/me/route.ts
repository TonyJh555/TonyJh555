import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";

/** Returns the signed-in admin's role so the console can gate features. */
export async function GET() {
  const cookieStore = await cookies();
  const role = await verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!role) return Response.json({ role: null }, { status: 401 });
  return Response.json({ role });
}
