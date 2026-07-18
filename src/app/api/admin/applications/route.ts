import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Privileged read/update of worker KYC applications, using the service role so
 * these can live behind private RLS (see supabase/hardening.sql). Only an
 * authenticated admin with KYC access (super_admin / verifier) may call this.
 *
 * When SUPABASE_SERVICE_ROLE_KEY isn't set, returns 501 so the client keeps
 * using its existing (demo) path — nothing breaks before hardening is applied.
 */

async function requireVerifier(): Promise<boolean> {
  const cookieStore = await cookies();
  const role = await verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
  return role === "super_admin" || role === "verifier";
}

export async function GET() {
  if (!(await requireVerifier())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) {
    return Response.json({ error: "Service role not configured" }, { status: 501 });
  }
  const { data, error } = await sb
    .from("worker_applications")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ applications: data });
}

export async function PATCH(request: Request) {
  if (!(await requireVerifier())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) {
    return Response.json({ error: "Service role not configured" }, { status: 501 });
  }
  let body: { id?: string; status?: string; rejectReason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.id || (body.status !== "approved" && body.status !== "rejected")) {
    return Response.json({ error: "id and a valid status are required" }, { status: 400 });
  }
  const { error } = await sb
    .from("worker_applications")
    .update({
      status: body.status,
      reject_reason: body.status === "rejected" ? body.rejectReason ?? null : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", body.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
