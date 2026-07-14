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

export default function AdminDashboard() {
  const router = useRouter();
  const bookings = useBookings();
  const applications = useApplications();
  const pendingApplications = applications.filter((a) => a.status === "pending");
  const decidedApplications = applications.filter((a) => a.status !== "pending").slice(0, 5);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const gmv = bookings.reduce((s, b) => s + b.quote.serviceAmount, 0);
  const revenue = bookings.reduce((s, b) => s + b.quote.platformFee, 0);
  const gstCollected = bookings.reduce((s, b) => s + b.quote.gst, 0);
  const tdsDeposited = bookings.reduce((s, b) => s + b.quote.tds, 0);

  const kpis = [
    { label: "GMV (session)", value: inr(gmv), sub: "Gross booking value" },
    { label: "KAAM Revenue", value: inr(revenue), sub: "15% platform fee" },
    { label: "GST Collected (TCS)", value: inr(gstCollected), sub: "To be remitted" },
    { label: "TDS Deposited", value: inr(tdsDeposited), sub: "Sec 194-O @1%" },
    { label: "Bookings", value: `${bookings.length}`, sub: "This session" },
    { label: "Workers Online", value: `${WORKERS.filter((w) => w.online).length}/${WORKERS.length}`, sub: "Live roster" },
  ];

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-lg font-extrabold">
              KAAM <span className="text-kaam-bright">🔨</span>
            </Link>
            <Tag color="red">ADMIN · God View</Tag>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-xs text-white/50 sm:block">
              Demo data — production reads PostgreSQL + Firestore
            </p>
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
        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <p className="text-[10px] font-bold tracking-wide text-dim uppercase">{kpi.label}</p>
              <p className="mt-1 font-display text-xl font-extrabold">{kpi.value}</p>
              <p className="text-[10px] text-mid">{kpi.sub}</p>
            </Card>
          ))}
        </div>

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
