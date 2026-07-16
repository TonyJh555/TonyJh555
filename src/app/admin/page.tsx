"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  reviewApplication,
  slaHoursLeft,
  useApplications,
  type WorkerApplication,
} from "@/lib/applications";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { matchScore } from "@/lib/matching";
import { useBookings } from "@/lib/bookings";
import { getTenure } from "@/lib/pricing";
import { inr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import {
  dailyRevenue,
  jobBreakdown,
  onboardingFunnel,
  revenueMetrics,
  workerEarnings,
  PERIOD_LABEL,
  type Period,
} from "@/lib/analytics";
import { Avatar, Card, Tag } from "@/components/ui";

/** One application card in the verification desk. */
function ApplicationCard({ application }: { application: WorkerApplication }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const category = getCategory(application.categoryId);
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
          <p className="text-[11px] text-mid">📞 {application.phone}</p>
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
            <a key={doc.label} href={doc.dataUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.dataUrl}
                alt={doc.label}
                className="h-16 w-full rounded-lg border border-line object-cover"
              />
              <p className="mt-0.5 text-center text-[9px] font-semibold text-mid">{doc.label}</p>
            </a>
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
            Work proof ({application.media.length})
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {application.media.map((m, i) =>
              m.kind === "image" ? (
                <a key={i} href={m.dataUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.dataUrl} alt={`Work ${i + 1}`} className="h-14 w-full rounded-lg border border-line object-cover" />
                </a>
              ) : (
                <video key={i} src={m.dataUrl} controls className="h-14 w-full rounded-lg border border-line object-cover" />
              ),
            )}
          </div>
        </>
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

const PERIODS: Period[] = ["today", "month", "year", "all"];

export default function AdminDashboard() {
  const router = useRouter();
  const bookings = useBookings();
  const applications = useApplications();
  const [period, setPeriod] = useState<Period>("month");

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

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-lg font-extrabold">
              KAAM <span className="text-kaam-bright">🔨</span>
            </Link>
            <Tag color="red">OWNER CONSOLE</Tag>
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

        {/* Operations + onboarding + chart */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart bookings={bookings} />
          </div>
          <Card>
            <h2 className="mb-3 font-display text-base font-bold">🪪 Onboarding · {PERIOD_LABEL[period]}</h2>
            <div className="grid grid-cols-2 gap-3">
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Ledger */}
          <section className="lg:col-span-2">
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

            <h2 className="mt-8 mb-3 font-display text-base font-bold">👷 Worker Roster</h2>
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

          {/* Worker verification desk */}
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
        </div>
      </main>
    </div>
  );
}
