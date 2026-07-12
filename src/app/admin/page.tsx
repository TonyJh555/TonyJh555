"use client";

import Link from "next/link";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { matchScore } from "@/lib/matching";
import { useBookings } from "@/lib/bookings";
import { getTenure } from "@/lib/pricing";
import { inr } from "@/lib/format";
import { Avatar, Card, Tag } from "@/components/ui";

/** Static demo KYC queue — in production this is HyperVerge webhook output. */
const KYC_QUEUE = [
  { name: "Suresh Kumar", category: "Electrician", docs: "Aadhaar ✓ · PAN ✓ · Police pending", stage: "Police verification", initials: "SK" },
  { name: "Lakshmi Nair", category: "Home Nurse", docs: "Aadhaar ✓ · Nursing license ✓", stage: "Final review", initials: "LN" },
  { name: "Imran Shaikh", category: "Driver", docs: "Aadhaar ✓ · DL pending", stage: "Document upload", initials: "IS" },
];

export default function AdminDashboard() {
  const bookings = useBookings();

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
          <p className="text-xs text-white/50">
            Demo data — production reads PostgreSQL + Firestore
          </p>
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

          {/* KYC queue */}
          <section>
            <h2 className="mb-3 font-display text-base font-bold">
              🪪 KYC Queue <Tag color="yellow">{KYC_QUEUE.length} pending</Tag>
            </h2>
            <div className="flex flex-col gap-3">
              {KYC_QUEUE.map((applicant) => (
                <Card key={applicant.name}>
                  <div className="flex items-center gap-3">
                    <Avatar initials={applicant.initials} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{applicant.name}</p>
                      <p className="text-[11px] text-mid">{applicant.category}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-mid">{applicant.docs}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Tag color="blue">{applicant.stage}</Tag>
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-good px-3 py-1.5 text-[11px] font-bold text-white">
                        Approve
                      </button>
                      <button className="rounded-lg border border-kaam-mid bg-kaam-light px-3 py-1.5 text-[11px] font-bold text-kaam">
                        Reject
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
