"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROLE_LABEL, type AdminRole } from "@/lib/admin-auth";
import { createMember, removeMember, setMemberActive, useTeam } from "@/lib/admin-team";
import { clearSampleData, hasSampleData, loadSampleData } from "@/lib/sample-data";
import {
  reviewApplication,
  slaHoursLeft,
  useApplications,
  type WorkerApplication,
} from "@/lib/applications";
import { WORKERS, getWorker } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { matchScore } from "@/lib/matching";
import { useBookings } from "@/lib/bookings";
import { useSubscriptions } from "@/lib/subscriptions";
import { getTenure } from "@/lib/pricing";
import { inr } from "@/lib/format";
import type { Booking, Subscription } from "@/lib/types";
import {
  commissionByCategory,
  dailyRevenue,
  jobBreakdown,
  onboardingFunnel,
  revenueMetrics,
  subscriptionMetrics,
  subscriptionsByCategory,
  monthlyRevenueTrend,
  revenueByDistrict,
  ratingsDistribution,
  workerEarnings,
  PERIOD_LABEL,
  type Period,
} from "@/lib/analytics";
import { ColumnTrend, RankedBars } from "@/components/charts";
import { Avatar, Card, Tag } from "@/components/ui";

/** Normalise a handle/URL into a full clickable link. */
function socialUrl(kind: "instagram" | "youtube" | "facebook" | "website", value: string): string {
  const v = value.trim();
  if (v.startsWith("http")) return v;
  const handle = v.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "youtube") return `https://youtube.com/${v.startsWith("@") ? v : handle}`;
  if (kind === "facebook") return `https://facebook.com/${handle}`;
  return `https://${v}`;
}

function SocialChip({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-line bg-surf px-2.5 py-1.5 text-[11px] font-bold text-ink hover:border-kaam"
    >
      {label} ↗
    </a>
  );
}

/** One application card in the verification desk. */
function ApplicationCard({ application }: { application: WorkerApplication }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<{ kind: "image" | "video"; url: string; label: string } | null>(null);
  const category = getCategory(application.categoryId);
  const social = application.social;
  const hasSocial =
    social && (social.instagram || social.youtube || social.facebook || social.website);
  const hoursLeft = slaHoursLeft(application);
  const initials = application.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const documents: { label: string; dataUrl?: string }[] = [
    { label: "Aadhaar front", dataUrl: application.docs.aadhaarFront },
    { label: "Aadhaar back", dataUrl: application.docs.aadhaarBack },
    { label: "Certificate", dataUrl: application.docs.certificate },
  ];

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar initials={initials || "W"} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{application.name}</p>
          <p className="text-[11px] text-mid">
            {category.icon} {category.label} · {application.city} · {application.experienceYears} yrs exp
          </p>
          <p className="text-[11px] text-mid">
            📞 {application.phone}
            {application.email ? ` · ✉️ ${application.email}` : ""}
          </p>
        </div>
        <Tag color={hoursLeft > 6 ? "blue" : hoursLeft > 0 ? "yellow" : "red"}>
          ⏱ {hoursLeft}h left
        </Tag>
      </div>

      {application.bio && (
        <p className="mt-2 rounded-lg bg-surf p-2 text-[11px] text-mid">{application.bio}</p>
      )}

      <p className="mt-3 mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">
        KYC documents (tap to inspect)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {documents.map((doc) =>
          doc.dataUrl ? (
            <button
              key={doc.label}
              onClick={() => setPreview({ kind: "image", url: doc.dataUrl!, label: doc.label })}
              className="group text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.dataUrl}
                alt={doc.label}
                className="h-16 w-full rounded-lg border border-line object-cover transition group-hover:border-kaam"
              />
              <p className="mt-0.5 text-center text-[9px] font-semibold text-info">🔍 {doc.label}</p>
            </button>
          ) : (
            <div
              key={doc.label}
              className="flex h-16 items-center justify-center rounded-lg border border-dashed border-line text-[9px] text-dim"
            >
              {doc.label}: not given
            </div>
          ),
        )}
      </div>

      {application.media.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">
            Work proof ({application.media.length}) — tap to preview
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {application.media.map((m, i) => (
              <button
                key={i}
                onClick={() => setPreview({ kind: m.kind, url: m.dataUrl, label: `Work sample ${i + 1}` })}
                className="group relative"
              >
                {m.kind === "image" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.dataUrl}
                    alt={`Work ${i + 1}`}
                    className="h-14 w-full rounded-lg border border-line object-cover transition group-hover:border-kaam"
                  />
                ) : (
                  <span className="flex h-14 w-full items-center justify-center rounded-lg border border-line bg-ink text-lg text-white">
                    ▶
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {hasSocial && (
        <>
          <p className="mt-3 mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">
            Social &amp; portfolio
          </p>
          <div className="flex flex-wrap gap-1.5">
            {social!.instagram && (
              <SocialChip label="📸 Instagram" href={socialUrl("instagram", social!.instagram)} />
            )}
            {social!.youtube && (
              <SocialChip label="▶️ YouTube" href={socialUrl("youtube", social!.youtube)} />
            )}
            {social!.facebook && (
              <SocialChip label="👍 Facebook" href={socialUrl("facebook", social!.facebook)} />
            )}
            {social!.website && (
              <SocialChip label="🌐 Website" href={socialUrl("website", social!.website)} />
            )}
          </div>
        </>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-h-[90vh] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-white">
              <p className="text-sm font-bold">{preview.label}</p>
              <button onClick={() => setPreview(null)} className="text-lg">✕</button>
            </div>
            {preview.kind === "image" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview.url} alt={preview.label} className="max-h-[80vh] w-full rounded-xl object-contain" />
            ) : (
              <video src={preview.url} controls autoPlay className="max-h-[80vh] w-full rounded-xl" />
            )}
          </div>
        </div>
      )}

      {rejecting ? (
        <div className="mt-3 rounded-xl bg-kaam-light p-2.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (sent to the applicant), e.g. Aadhaar photo is blurred"
            className="w-full rounded-lg border border-kaam-mid bg-white px-3 py-2 text-xs outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => reviewApplication(application.id, "rejected", reason.trim() || undefined)}
              className="flex-1 rounded-lg bg-kaam py-2 text-xs font-bold text-white"
            >
              Confirm Reject
            </button>
            <button
              onClick={() => setRejecting(false)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-mid"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => reviewApplication(application.id, "approved")}
            className="flex-1 rounded-lg bg-good py-2 text-xs font-bold text-white"
          >
            ✓ Approve — go live
          </button>
          <button
            onClick={() => setRejecting(true)}
            className="flex-1 rounded-lg border border-kaam-mid bg-kaam-light py-2 text-xs font-bold text-kaam"
          >
            ✕ Reject
          </button>
        </div>
      )}
    </Card>
  );
}

/** A slim vertical bar chart of daily commission — no chart library needed. */
function RevenueChart({ bookings }: { bookings: Booking[] }) {
  const series = dailyRevenue(bookings, 14);
  const max = Math.max(1, ...series.map((p) => p.commission));
  const total = series.reduce((s, p) => s + p.commission, 0);
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-base font-bold">📈 Commission · last 14 days</h2>
        <p className="text-sm font-extrabold text-kaam">{inr(total)}</p>
      </div>
      <div className="flex h-32 items-end gap-1.5">
        {series.map((p) => (
          <div key={p.date} className="group flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-kaam/80 transition-all hover:bg-kaam"
              style={{ height: `${Math.max(2, (p.commission / max) * 100)}%` }}
              title={`${p.label}: ${inr(p.commission)} · ${p.jobs} jobs`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-dim">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </Card>
  );
}

/** Owner-only: create and manage privileged sub-users (verifier / finance). */
function TeamManager() {
  const team = useTeam();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("verifier");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await createMember(name, username, password, role);
    setBusy(false);
    setMsg(res.message);
    if (res.ok) {
      setName("");
      setUsername("");
      setPassword("");
    }
  };

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-base font-bold">
        👥 Team & Access <Tag color="blue">Owner only</Tag>
      </h2>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create */}
        <Card>
          <p className="mb-2 text-sm font-bold">Add a team member</p>
          <p className="mb-3 text-[11px] text-mid">
            Create a login for someone on your team. A <b>Verifier</b> only sees the KYC desk; a{" "}
            <b>Finance</b> user only sees revenue &amp; reports.
          </p>
          <div className="flex flex-col gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
            />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (for login)"
              className="rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Temporary password"
              className="rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
            />
            <div className="flex gap-2">
              {(["verifier", "finance"] as AdminRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize ${
                    role === r ? "bg-kaam text-white" : "bg-surf text-mid"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-kaam py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "Adding…" : "Create login"}
            </button>
            {msg && <p className="text-[11px] font-semibold text-mid">{msg}</p>}
          </div>
        </Card>

        {/* Roster */}
        <Card className="lg:col-span-2">
          <p className="mb-2 text-sm font-bold">Your team ({team.length})</p>
          {team.length === 0 ? (
            <p className="text-xs text-dim">
              No team members yet. Create a Verifier so someone can review worker KYC while you
              focus on growth.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {team.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold">
                      {m.name}{" "}
                      <span className="font-normal text-dim">· @{m.username}</span>
                    </p>
                    <p className="text-[10px] text-mid capitalize">
                      {m.role} · {m.active ? "active" : "suspended"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMemberActive(m.id, !m.active)}
                      className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-bold text-mid"
                    >
                      {m.active ? "Suspend" : "Activate"}
                    </button>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="rounded-lg border border-kaam-mid px-2.5 py-1 text-[11px] font-bold text-kaam"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-dim">
            🔒 Demo: team logins are stored in your database (passwords hashed). Before a real
            launch, move admin auth to Supabase Auth and lock this table to service-role only.
          </p>
        </Card>
      </div>
    </section>
  );
}

/** Ranked horizontal bars — commission by service category (single-hue magnitude). */
function CategoryChart({ bookings, period }: { bookings: Booking[]; period: Period }) {
  const rows = commissionByCategory(bookings, period).slice(0, 8);
  const max = Math.max(1, ...rows.map((r) => r.commission));
  const total = rows.reduce((s, r) => s + r.commission, 0);
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-base font-bold">🧩 Commission by service</h2>
        <p className="text-sm font-extrabold text-kaam">{inr(total)}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-dim">No completed jobs in this period yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const cat = getCategory(r.categoryId);
            return (
              <div
                key={r.categoryId}
                className="flex items-center gap-2"
                title={`${cat.label}: ${inr(r.commission)} · ${r.jobs} job${r.jobs === 1 ? "" : "s"}`}
              >
                <span className="w-28 shrink-0 truncate text-xs font-semibold">
                  {cat.icon} {cat.label}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-surf">
                  <div
                    className="h-full rounded bg-kaam/80 transition-all hover:bg-kaam"
                    style={{ width: `${Math.max(3, (r.commission / max) * 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-bold tabular-nums text-kaam">
                  {inr(r.commission)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Recurring-revenue (Care Plan subscriptions) panel for the overview tab. */
function SubscriptionPanel({ subscriptions }: { subscriptions: Subscription[] }) {
  const m = subscriptionMetrics(subscriptions);
  const byCat = subscriptionsByCategory(subscriptions).slice(0, 6);
  const maxMrr = Math.max(1, ...byCat.map((c) => c.mrr));

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-base font-bold">
        ♻️ Recurring Revenue (Care Plans){" "}
        <Tag color={m.activePlans > 0 ? "green" : "gray"}>{m.activePlans} active</Tag>
      </h2>

      {m.totalPlans === 0 ? (
        <Card>
          <p className="py-6 text-center text-xs text-dim">
            No subscriptions yet. When a customer takes a monthly / 3-month / 6-month plan on a
            nurse, maid, cook or teacher, recurring revenue shows here.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "MRR", value: inr(m.mrr), sub: "Monthly recurring commission", strong: true },
              { label: "ARR (run-rate)", value: inr(m.mrr * 12), sub: "MRR × 12" },
              { label: "Monthly GMV", value: inr(m.monthlyGmv), sub: "Service value / month" },
              { label: "Contracted value", value: inr(m.contractedValue), sub: "Current active terms" },
              { label: "Monthly payouts", value: inr(m.monthlyWorkerPayout), sub: "Owed to workers / mo" },
            ].map((kpi) => (
              <Card key={kpi.label} className={kpi.strong ? "border-good-mid bg-good-light" : ""}>
                <p className="text-[10px] font-bold tracking-wide text-dim uppercase">{kpi.label}</p>
                <p className={`mt-1 font-display text-xl font-extrabold ${kpi.strong ? "text-good" : ""}`}>
                  {kpi.value}
                </p>
                <p className="text-[10px] text-mid">{kpi.sub}</p>
              </Card>
            ))}
          </div>

          {byCat.length > 0 && (
            <Card>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-display text-sm font-bold">MRR by service</h3>
                <p className="text-xs font-extrabold text-good">{inr(m.mrr)}/mo</p>
              </div>
              <div className="flex flex-col gap-2">
                {byCat.map((c) => {
                  const cat = getCategory(c.categoryId);
                  return (
                    <div
                      key={c.categoryId}
                      className="flex items-center gap-2"
                      title={`${cat.label}: ${inr(c.mrr)}/mo · ${c.count} plan${c.count === 1 ? "" : "s"}`}
                    >
                      <span className="w-28 shrink-0 truncate text-xs font-semibold">
                        {cat.icon} {cat.label}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-surf">
                        <div
                          className="h-full rounded bg-good/80 transition-all hover:bg-good"
                          style={{ width: `${Math.max(3, (c.mrr / maxMrr) * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-mid">
                        {c.count}×
                      </span>
                      <span className="w-16 shrink-0 text-right text-xs font-bold tabular-nums text-good">
                        {inr(c.mrr)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </section>
  );
}

/** Growth trend, district performance and CSAT — the ops-team view. */
function GrowthGeoPanel({ bookings }: { bookings: Booking[] }) {
  const trend = monthlyRevenueTrend(bookings, 12);
  const districts = revenueByDistrict(bookings, (id) => getWorker(id)?.district).slice(0, 8);
  const ratings = ratingsDistribution(bookings);
  const totalRatings = ratings.reduce((s, r) => s + r.count, 0);
  const avg = totalRatings
    ? ratings.reduce((s, r) => s + r.star * r.count, 0) / totalRatings
    : 0;

  return (
    <div className="mb-8">
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold">📈 Commission · last 12 months</h2>
            <p className="text-sm font-extrabold text-kaam">{inr(trend.reduce((s, p) => s + p.value, 0))}</p>
          </div>
          <ColumnTrend data={trend} tone="kaam" />
        </Card>

        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold">⭐ Ratings (CSAT)</h2>
            <p className="text-sm font-extrabold text-amber-500">
              {avg ? avg.toFixed(2) : "—"} · {totalRatings} rated
            </p>
          </div>
          {totalRatings === 0 ? (
            <p className="py-6 text-center text-xs text-dim">No ratings yet.</p>
          ) : (
            <RankedBars
              rows={ratings.map((r) => ({
                key: `${r.star}`,
                label: `${r.star} ★`,
                value: r.count,
                sub: totalRatings ? `${Math.round((r.count / totalRatings) * 100)}%` : undefined,
              }))}
              tone="gold"
              format={(n) => `${n}`}
            />
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold">🗺️ Commission by district</h2>
          <p className="text-sm font-extrabold text-kaam">
            {districts.length} of 14 active
          </p>
        </div>
        <RankedBars
          rows={districts.map((d) => ({
            key: d.district,
            label: d.district,
            value: d.commission,
            sub: `${d.jobs}×`,
          }))}
          tone="kaam"
          emptyLabel="No completed jobs by district yet — load sample data or complete a booking."
        />
      </Card>
    </div>
  );
}

const PERIODS: Period[] = ["today", "month", "year", "all"];

type AdminTab = "overview" | "bookings" | "workers" | "verification" | "team";

export default function AdminDashboard() {
  const router = useRouter();
  const bookings = useBookings();
  const subscriptions = useSubscriptions();
  const applications = useApplications();
  const [period, setPeriod] = useState<Period>("month");
  const [role, setRole] = useState<AdminRole | null>(null);
  const [tab, setTab] = useState<AdminTab>("overview");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : { role: null }))
      .then((d: { role: AdminRole | null }) => {
        // Middleware already authenticated us to reach this page, so if the
        // role can't be read (e.g. the /me route isn't deployed yet), fall
        // back to the full owner view rather than showing a blank panel.
        if (!active) return;
        const r = d?.role ?? "super_admin";
        setRole(r);
        // A verifier only has the Verification tab — land them there.
        setTab(r === "verifier" ? "verification" : "overview");
      })
      .catch(() => {
        if (active) setRole("super_admin");
      });
    return () => {
      active = false;
    };
  }, []);

  const isSuper = role === "super_admin";
  const canFinance = role === "super_admin" || role === "finance";
  const canVerify = role === "super_admin" || role === "verifier";

  const pendingApplications = applications.filter((a) => a.status === "pending");
  const decidedApplications = applications.filter((a) => a.status !== "pending").slice(0, 5);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const rev = revenueMetrics(bookings, period);
  const jobs = jobBreakdown(bookings, period);
  const funnel = onboardingFunnel(applications, period);
  const earners = workerEarnings(bookings, period);

  const revenueCards = [
    { label: "KAAM Commission", value: inr(rev.commission), sub: "15% platform fee · earned", strong: true },
    { label: "GMV", value: inr(rev.gmv), sub: "Gross booking value" },
    { label: "Worker payouts", value: inr(rev.workerPayout), sub: "Paid to workers" },
    { label: "GST collected", value: inr(rev.gst), sub: "To be remitted" },
    { label: "TDS deposited", value: inr(rev.tds), sub: "Sec 194-O @1%" },
    { label: "Completed jobs", value: `${rev.completedJobs}`, sub: "Revenue-earning" },
  ];

  const opsCards = [
    { label: "Total bookings", value: `${jobs.total}`, tone: "text-ink" },
    { label: "Workers worked", value: `${jobs.activeWorkers}`, tone: "text-good" },
    { label: "Scheduled", value: `${jobs.scheduled}`, tone: "text-info" },
    { label: "In progress", value: `${jobs.inProgress}`, tone: "text-info" },
    { label: "Cancelled", value: `${jobs.cancelled}`, tone: "text-kaam" },
    { label: "Awaiting accept", value: `${jobs.requested}`, tone: "text-warn" },
  ];

  const funnelCards = [
    { label: "Onboarded", value: `${funnel.submitted}`, tone: "text-ink" },
    { label: "Approved", value: `${funnel.approved}`, tone: "text-good" },
    { label: "Rejected", value: `${funnel.rejected}`, tone: "text-kaam" },
    { label: "Pending", value: `${funnel.pending}`, tone: "text-warn" },
  ];

  const tabs = [
    canFinance && { id: "overview" as const, label: "📊 Overview" },
    canFinance && { id: "bookings" as const, label: "📒 Bookings", badge: bookings.length || undefined },
    canFinance && { id: "workers" as const, label: "👷 Workers" },
    canVerify && {
      id: "verification" as const,
      label: "🪪 Verification",
      badge: pendingApplications.length || undefined,
    },
    isSuper && { id: "team" as const, label: "👥 Team" },
  ].filter(Boolean) as { id: AdminTab; label: string; badge?: number }[];

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-lg font-extrabold">
              KAAM <span className="text-kaam-bright">🔨</span>
            </Link>
            <Tag color={isSuper ? "red" : "blue"}>
              {role ? ROLE_LABEL[role] : "Loading…"}
            </Tag>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={logout}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {role === null && (
          <p className="py-16 text-center text-sm text-dim">Loading console…</p>
        )}

        {role !== null && (
          <nav className="mb-6 flex flex-wrap gap-1 border-b border-line">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                  tab === t.id
                    ? "border-kaam text-kaam"
                    : "border-transparent text-mid hover:text-ink"
                }`}
              >
                {t.label}
                {t.badge ? (
                  <span className="rounded-full bg-kaam px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        )}

        {tab === "overview" && bookings.length === 0 && applications.length === 0 && (
          <div className="mb-6 rounded-2xl border border-info-mid bg-info-light p-4">
            <p className="text-sm font-bold text-info">✅ Your console is live and connected.</p>
            <p className="mt-1 text-xs leading-relaxed text-info">
              It looks empty because there&apos;s no activity yet — this reads your real database.
              Revenue, commission, onboarding and reports fill in automatically as customers book
              in the app and workers apply at{" "}
              <Link href="/worker/signup" className="font-bold underline">
                /worker/signup
              </Link>
              . Complete one test booking (and mark it done in the worker portal) to watch the
              numbers populate.
            </p>
          </div>
        )}

        {tab === "overview" && isSuper && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line bg-white p-3">
            <p className="text-xs font-bold text-mid">
              🧪 Try the console:
            </p>
            {hasSampleData(bookings, applications) ? (
              <button
                onClick={() => clearSampleData(bookings, applications)}
                className="rounded-lg border border-kaam-mid bg-kaam-light px-3 py-1.5 text-xs font-bold text-kaam"
              >
                Clear sample data
              </button>
            ) : (
              <button
                onClick={() => loadSampleData()}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white"
              >
                Load sample data
              </button>
            )}
            <span className="text-[11px] text-dim">
              Inserts demo bookings &amp; applications so you can see every chart populated. Safe —
              removes cleanly, never touches real records.
            </span>
          </div>
        )}

        {tab === "team" && isSuper && <TeamManager />}

        {tab === "overview" && canFinance && (
        <>
        {/* Period selector */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-xl font-extrabold">Revenue & Operations</h1>
          <div className="flex rounded-xl border border-line bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  period === p ? "bg-kaam text-white" : "text-mid"
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Revenue KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {revenueCards.map((kpi) => (
            <Card key={kpi.label} className={kpi.strong ? "border-kaam-mid bg-kaam-light" : ""}>
              <p className="text-[10px] font-bold tracking-wide text-dim uppercase">{kpi.label}</p>
              <p className={`mt-1 font-display text-xl font-extrabold ${kpi.strong ? "text-kaam" : ""}`}>
                {kpi.value}
              </p>
              <p className="text-[10px] text-mid">{kpi.sub}</p>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <RevenueChart bookings={bookings} />
          <CategoryChart bookings={bookings} period={period} />
        </div>

        {/* Recurring revenue from Care Plans */}
        <SubscriptionPanel subscriptions={subscriptions} />

        {/* Growth trend, district performance & CSAT */}
        <GrowthGeoPanel bookings={bookings} />

        {/* Onboarding funnel */}
        <div className="mb-8">
          <Card>
            <h2 className="mb-3 font-display text-base font-bold">🪪 Onboarding · {PERIOD_LABEL[period]}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {funnelCards.map((c) => (
                <div key={c.label} className="rounded-xl bg-surf p-3">
                  <p className={`font-display text-2xl font-extrabold ${c.tone}`}>{c.value}</p>
                  <p className="text-[10px] font-semibold text-mid">{c.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Operations tiles */}
        <h2 className="mb-3 font-display text-base font-bold">⚙️ Operations · {PERIOD_LABEL[period]}</h2>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {opsCards.map((c) => (
            <Card key={c.label}>
              <p className={`font-display text-2xl font-extrabold ${c.tone}`}>{c.value}</p>
              <p className="text-[10px] font-semibold text-mid">{c.label}</p>
            </Card>
          ))}
        </div>

        {/* Per-worker earnings */}
        <h2 className="mb-3 font-display text-base font-bold">
          💸 Commission by worker · {PERIOD_LABEL[period]}
        </h2>
        <Card className="mb-8 overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[10px] tracking-wide text-dim uppercase">
                {["Worker", "Jobs", "GMV", "KAAM commission", "Worker payout"].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-dim">
                    No completed jobs in this period yet.
                  </td>
                </tr>
              )}
              {earners.map((w) => (
                <tr key={w.workerId} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold">{w.workerName}</td>
                  <td className="px-4 py-3 tabular-nums">{w.jobs}</td>
                  <td className="px-4 py-3 tabular-nums">{inr(w.gmv)}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-kaam">{inr(w.commission)}</td>
                  <td className="px-4 py-3 tabular-nums text-good">{inr(w.payout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </>
        )}

        {tab === "bookings" && canFinance && (
          <section>
            <h2 className="mb-3 font-display text-base font-bold">📒 Booking Ledger</h2>
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] tracking-wide text-dim uppercase">
                    {["Booking", "Worker", "Tenure", "User paid", "KAAM fee", "Worker payout", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-dim">
                        No bookings yet — create one in the{" "}
                        <Link href="/app" className="font-bold text-kaam">user app</Link>{" "}
                        and it appears here in real time.
                      </td>
                    </tr>
                  )}
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-semibold">
                        {getCategory(b.categoryId).icon} {b.subService}
                      </td>
                      <td className="px-4 py-3">{b.workerName}</td>
                      <td className="px-4 py-3">{getTenure(b.tenureId).label}</td>
                      <td className="px-4 py-3 font-bold tabular-nums">{inr(b.quote.totalUserPays)}</td>
                      <td className="px-4 py-3 tabular-nums text-kaam">{inr(b.quote.platformFee)}</td>
                      <td className="px-4 py-3 tabular-nums text-good">{inr(b.quote.workerPayout)}</td>
                      <td className="px-4 py-3">
                        <Tag
                          color={
                            b.status === "completed" ? "green"
                            : b.status === "cancelled" ? "gray"
                            : b.status === "requested" ? "yellow" : "blue"
                          }
                        >
                          {b.status.replace("_", " ")}
                        </Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        )}

        {tab === "workers" && canFinance && (
          <section>
            <h2 className="mb-3 font-display text-base font-bold">👷 Worker Roster</h2>
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] tracking-wide text-dim uppercase">
                    {["Worker", "Category", "Rating", "Jobs", "Accept", "Match score", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WORKERS.map((w) => (
                    <tr key={w.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2 font-semibold">
                          <Avatar initials={w.initials} size={28} /> {w.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {getCategory(w.categoryId).icon} {getCategory(w.categoryId).label}
                      </td>
                      <td className="px-4 py-2.5">⭐ {w.rating}</td>
                      <td className="px-4 py-2.5 tabular-nums">{w.jobsDone.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2.5 tabular-nums">{Math.round(w.acceptRate * 100)}%</td>
                      <td className="px-4 py-2.5 font-bold tabular-nums">{matchScore(w)}</td>
                      <td className="px-4 py-2.5">
                        <Tag color={w.online ? "green" : "gray"}>{w.online ? "● Online" : "○ Offline"}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        )}

        {tab === "verification" && canVerify && (
          <section>
            <h2 className="mb-3 font-display text-base font-bold">
              🪪 Verification Desk{" "}
              {pendingApplications.length > 0 ? (
                <Tag color="yellow">{pendingApplications.length} pending · 24h SLA</Tag>
              ) : (
                <Tag color="green">All clear</Tag>
              )}
            </h2>
            <div className="flex flex-col gap-3">
              {pendingApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
              {pendingApplications.length === 0 && (
                <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-xs text-dim">
                  No applications waiting. New workers apply at{" "}
                  <Link href="/worker/signup" className="font-bold text-kaam">
                    /worker/signup
                  </Link>{" "}
                  and appear here instantly.
                </p>
              )}
              {decidedApplications.length > 0 && (
                <>
                  <p className="mt-2 text-[10px] font-bold tracking-wide text-dim uppercase">
                    Recent decisions
                  </p>
                  {decidedApplications.map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2"
                    >
                      <p className="text-xs font-semibold">
                        {application.name}{" "}
                        <span className="text-dim">
                          · {getCategory(application.categoryId).label}
                        </span>
                      </p>
                      <Tag color={application.status === "approved" ? "green" : "red"}>
                        {application.status === "approved" ? "✓ Approved" : "✕ Rejected"}
                      </Tag>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
