"use client";

import { inr } from "@/lib/format";
import { Card } from "@/components/ui";
import { getCategory } from "@/data/categories";
import {
  payoutByMonth,
  payoutByWeekday,
  workerEarningsSummary,
  workerDailyTrend,
  workerCategorySplit,
  workerScorecard,
  demandHeatmap,
  type BarPoint,
} from "@/lib/analytics";
import { WorkerGoals } from "@/components/worker-goals";
import { AreaSparkline, RankedBars, DemandHeatmap } from "@/components/charts";
import { toCSV, downloadCSV } from "@/lib/csv";
import type { Booking } from "@/lib/types";

/** Vertical bars — earnings comparison (single-hue magnitude, hover tooltips). */
function BarChart({ title, data }: { title: string; data: BarPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const best = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-sm font-bold">{title}</h3>
        <span className="text-sm font-extrabold text-good">{inr(total)}</span>
      </div>
      <div className="flex h-32 items-end gap-1.5">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center gap-1"
            title={`${d.label}: ${inr(d.value)} · ${d.jobs} job${d.jobs === 1 ? "" : "s"}`}
          >
            <div
              className={`w-full rounded-t transition-all ${
                d.label === best.label && best.value > 0 ? "bg-good" : "bg-good/50 hover:bg-good"
              }`}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
            <span className="text-[9px] font-semibold text-dim">{d.label}</span>
          </div>
        ))}
      </div>
      {best.value > 0 && (
        <p className="mt-2 text-[11px] text-mid">
          🏆 Best: <b>{best.label}</b> — {inr(best.value)}
        </p>
      )}
    </Card>
  );
}

export function WorkerEarnings({ bookings, workerId }: { bookings: Booking[]; workerId: string }) {
  const s = workerEarningsSummary(bookings, workerId);
  const weekday = payoutByWeekday(bookings, workerId);
  const months = payoutByMonth(bookings, workerId);
  const trend = workerDailyTrend(bookings, workerId, 30);
  const split = workerCategorySplit(bookings, workerId);
  const score = workerScorecard(bookings, workerId);
  const year = new Date().getFullYear();

  const kpis = [
    { label: "Today", value: s.today },
    { label: "This week", value: s.week },
    { label: "This month", value: s.month },
    { label: "This year", value: s.year },
  ];

  const completed = bookings
    .filter((b) => b.workerId === workerId && b.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const payouts = completed.slice(0, 12);

  const exportStatement = () => {
    const headers = ["Date", "Service", "Category", "Tenure", "Payout"];
    const rows = completed.map((b) => [
      new Date(b.createdAt).toISOString().slice(0, 10),
      b.subService,
      getCategory(b.categoryId).label,
      b.tenureId,
      b.quote.workerPayout,
    ]);
    downloadCSV(`kaam-earnings-statement-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(headers, rows));
  };

  const instantPayout = () => {
    if (s.week <= 0) return;
    const fee = Math.max(5, Math.round(s.week * 0.01));
    alert(
      `⚡ Instant payout: ${inr(s.week - fee)} to your bank in minutes (₹${fee} instant fee). ` +
        `Or keep it free with the weekly settlement. (Demo)`,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <WorkerGoals bookings={bookings} workerId={workerId} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-[10px] font-bold tracking-wide text-dim uppercase">{k.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold text-good">{inr(k.value)}</p>
          </Card>
        ))}
      </div>

      {/* Performance scorecard */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-[10px] font-bold tracking-wide text-dim uppercase">Completion</p>
          <p className="mt-1 font-display text-xl font-extrabold text-good">
            {Math.round(score.completionRate * 100)}%
          </p>
          <p className="text-[10px] text-mid">
            {score.completed} done · {score.cancelled} cancelled
          </p>
        </Card>
        <Card>
          <p className="text-[10px] font-bold tracking-wide text-dim uppercase">Avg rating</p>
          <p className="mt-1 font-display text-xl font-extrabold text-amber-500">
            {score.avgRating ? score.avgRating.toFixed(1) : "—"} ★
          </p>
          <p className="text-[10px] text-mid">{score.ratedJobs} rated</p>
        </Card>
        <Card>
          <p className="text-[10px] font-bold tracking-wide text-dim uppercase">Lifetime jobs</p>
          <p className="mt-1 font-display text-xl font-extrabold">{s.jobs}</p>
          <p className="text-[10px] text-mid">completed</p>
        </Card>
      </div>

      {/* 30-day earnings momentum */}
      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-bold">📈 Earnings · last 30 days</h3>
        </div>
        <AreaSparkline data={trend} tone="good" />
      </Card>

      {/* Earnings by service */}
      <Card>
        <h3 className="mb-3 font-display text-sm font-bold">🧩 Earnings by service</h3>
        <RankedBars
          rows={split.map((r) => ({
            key: r.categoryId,
            label: `${getCategory(r.categoryId).icon} ${getCategory(r.categoryId).label}`,
            value: r.value,
            sub: `${r.jobs}×`,
          }))}
          tone="good"
          emptyLabel="Finish jobs to see which services earn you the most."
        />
      </Card>

      {/* Platform demand — when to be online for more jobs */}
      <Card>
        <h3 className="mb-1 font-display text-sm font-bold">🔥 Busiest times to be online</h3>
        <p className="mb-3 text-[11px] text-mid">
          When customers across KAAM book most. Go online in the hot slots to catch more jobs.
        </p>
        <DemandHeatmap data={demandHeatmap(bookings)} tone="good" />
      </Card>

      <BarChart title="💚 Earnings by weekday" data={weekday} />
      <BarChart title={`📅 Monthly earnings · ${year}`} data={months} />

      {/* Weekly settlement / withdraw */}
      <Card className="bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70">Available to withdraw</p>
            <p className="font-display text-2xl font-extrabold">{inr(s.week)}</p>
            <p className="text-[10px] text-white/60">
              Settled weekly to your bank · lifetime {inr(s.all)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={instantPayout}
              disabled={s.week <= 0}
              className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-good disabled:opacity-50"
            >
              ⚡ Instant payout
            </button>
            <button
              onClick={() =>
                alert(
                  s.week > 0
                    ? `${inr(s.week)} will be settled to your bank within 24 hours, free. (Demo)`
                    : "No balance to withdraw yet.",
                )
              }
              disabled={s.week <= 0}
              className="rounded-xl border border-white/40 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Weekly (free)
            </button>
          </div>
        </div>
      </Card>

      {/* Payout history */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-bold">🧾 Payout history</p>
          {completed.length > 0 && (
            <button
              onClick={exportStatement}
              className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-bold text-mid hover:border-good"
            >
              ⬇️ Statement
            </button>
          )}
        </div>
        {payouts.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-dim">
            No completed jobs yet — finish a job to see your payout here.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {payouts.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-bold">
                    {getCategory(b.categoryId).icon} {b.subService}
                  </p>
                  <p className="text-[10px] text-dim">
                    {new Date(b.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-sm font-extrabold text-good">+{inr(b.quote.workerPayout)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
