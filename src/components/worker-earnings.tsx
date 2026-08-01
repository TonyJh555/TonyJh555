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
  workerCredit,
  earnedAt,
  demandHeatmap,
  type BarPoint,
} from "@/lib/analytics";
import { WorkerWallet } from "@/components/worker-wallet";
import { AreaSparkline, RankedBars, DemandHeatmap } from "@/components/charts";
import { useLanguage } from "@/components/language-provider";
import { mlMonth, mlWeekday } from "@/lib/ml-labels";
import { toCSV, downloadCSV } from "@/lib/csv";
import type { Booking } from "@/lib/types";

/** Vertical bars — earnings comparison (single-hue magnitude, hover tooltips). */
function BarChart({
  title,
  data,
  axis = (l) => l,
  ml = false,
}: {
  title: string;
  data: BarPoint[];
  /** Translates the axis label, which is produced by date formatting. */
  axis?: (label: string) => string;
  ml?: boolean;
}) {
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
            title={
              ml
                ? `${axis(d.label)}: ${inr(d.value)} · ${d.jobs} ജോലി`
                : `${d.label}: ${inr(d.value)} · ${d.jobs} job${d.jobs === 1 ? "" : "s"}`
            }
          >
            <div
              className={`w-full rounded-t transition-all ${
                d.label === best.label && best.value > 0 ? "bg-good" : "bg-good/50 hover:bg-good"
              }`}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
            <span className="text-[9px] font-semibold text-dim">{axis(d.label)}</span>
          </div>
        ))}
      </div>
      {best.value > 0 && (
        <p className="mt-2 text-[11px] text-mid">
          🏆 {ml ? "ഏറ്റവും കൂടുതൽ" : "Best"}: <b>{axis(best.label)}</b> — {inr(best.value)}
        </p>
      )}
    </Card>
  );
}

export function WorkerEarnings({ bookings, workerId }: { bookings: Booking[]; workerId: string }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const s = workerEarningsSummary(bookings, workerId);
  const weekday = payoutByWeekday(bookings, workerId);
  const months = payoutByMonth(bookings, workerId);
  const trend = workerDailyTrend(bookings, workerId, 30);
  const split = workerCategorySplit(bookings, workerId);
  const score = workerScorecard(bookings, workerId);
  const year = new Date().getFullYear();

  const kpis = [
    { label: ml ? "ഇന്ന്" : "Today", value: s.today },
    { label: ml ? "ഈ ആഴ്ച" : "This week", value: s.week },
    { label: ml ? "ഈ മാസം" : "This month", value: s.month },
    { label: ml ? "ഈ വർഷം" : "This year", value: s.year },
  ];

  // Everything that paid this worker, finished or not — a call-out owed
  // because the customer cancelled is real money and belongs in the statement.
  const completed = bookings
    .filter((b) => b.workerId === workerId && workerCredit(b) > 0)
    .sort((a, b) => new Date(earnedAt(b)).getTime() - new Date(earnedAt(a)).getTime());
  const payouts = completed.slice(0, 12);

  // The CSV stays English: it is opened in a spreadsheet, sent to a bank or an
  // accountant, and its column names are the contract with whatever reads it.
  const exportStatement = () => {
    const headers = ["Date", "Service", "Category", "Tenure", "Payout"];
    const rows = completed.map((b) => [
      new Date(earnedAt(b)).toISOString().slice(0, 10),
      b.subService,
      getCategory(b.categoryId).label,
      b.tenureId,
      workerCredit(b),
    ]);
    downloadCSV(`kaam-earnings-statement-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(headers, rows));
  };

  return (
    <div className="flex flex-col gap-4">
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
          <p className="text-[10px] font-bold tracking-wide text-dim uppercase">
            {ml ? "പൂർത്തിയാക്കൽ" : "Completion"}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-good">
            {Math.round(score.completionRate * 100)}%
          </p>
          <p className="text-[10px] text-mid">
            {ml
              ? `${score.completed} ചെയ്തു · ${score.cancelled} റദ്ദായി`
              : `${score.completed} done · ${score.cancelled} cancelled`}
          </p>
        </Card>
        <Card>
          <p className="text-[10px] font-bold tracking-wide text-dim uppercase">
            {ml ? "ശരാശരി റേറ്റിംഗ്" : "Avg rating"}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold text-amber-500">
            {score.avgRating ? score.avgRating.toFixed(1) : "—"} ★
          </p>
          <p className="text-[10px] text-mid">
            {ml ? `${score.ratedJobs} റേറ്റ് ചെയ്തു` : `${score.ratedJobs} rated`}
          </p>
        </Card>
        <Card>
          <p className="text-[10px] font-bold tracking-wide text-dim uppercase">
            {ml ? "ആകെ ജോലികൾ" : "Lifetime jobs"}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold">{s.jobs}</p>
          <p className="text-[10px] text-mid">{ml ? "പൂർത്തിയാക്കി" : "completed"}</p>
        </Card>
      </div>

      {/* 30-day earnings momentum */}
      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-bold">
            📈 {ml ? "വരുമാനം · കഴിഞ്ഞ 30 ദിവസം" : "Earnings · last 30 days"}
          </h3>
        </div>
        <AreaSparkline
          data={trend.map((d) => ({ ...d, label: mlMonth(d.label, ml) }))}
          tone="good"
          ml={ml}
        />
      </Card>

      {/* Earnings by service */}
      <Card>
        <h3 className="mb-3 font-display text-sm font-bold">
          🧩 {ml ? "ഓരോ ജോലിയിൽ നിന്നും" : "Earnings by service"}
        </h3>
        <RankedBars
          rows={split.map((r) => ({
            key: r.categoryId,
            label: `${getCategory(r.categoryId).icon} ${getCategory(r.categoryId).label}`,
            value: r.value,
            sub: `${r.jobs}×`,
          }))}
          tone="good"
          emptyLabel={
            ml
              ? "ജോലികൾ പൂർത്തിയാക്കൂ — ഏത് ജോലിയിൽ കൂടുതൽ കിട്ടുന്നു എന്ന് ഇവിടെ കാണാം."
              : "Finish jobs to see which services earn you the most."
          }
        />
      </Card>

      {/* Platform demand — when to be online for more jobs */}
      <Card>
        <h3 className="mb-1 font-display text-sm font-bold">
          🔥 {ml ? "ഓൺലൈൻ ആകാൻ പറ്റിയ സമയം" : "Busiest times to be online"}
        </h3>
        <p className="mb-3 text-[11px] text-mid">
          {ml
            ? "ആളുകൾ ഏറ്റവും കൂടുതൽ ബുക്ക് ചെയ്യുന്ന സമയം. ഈ സമയത്ത് ഓൺലൈൻ ആയാൽ കൂടുതൽ ജോലി കിട്ടും."
            : "When customers across KAAM book most. Go online in the hot slots to catch more jobs."}
        </p>
        <DemandHeatmap
          data={demandHeatmap(bookings)}
          tone="good"
          rowLabel={(l) => mlWeekday(l, ml)}
          ml={ml}
        />
      </Card>

      <BarChart
        title={`💚 ${ml ? "ഓരോ ദിവസത്തെയും വരുമാനം" : "Earnings by weekday"}`}
        data={weekday}
        axis={(l) => mlWeekday(l, ml)}
        ml={ml}
      />
      <BarChart
        title={`📅 ${ml ? "മാസവരുമാനം" : "Monthly earnings"} · ${year}`}
        data={months}
        axis={(l) => mlMonth(l, ml)}
        ml={ml}
      />

      {/* Earnings wallet — real withdrawable balance + cash-out flow */}
      <WorkerWallet workerId={workerId} bookings={bookings} />

      {/* Payout history */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-bold">🧾 {ml ? "കിട്ടിയ പണം" : "Payout history"}</p>
          {completed.length > 0 && (
            <button
              onClick={exportStatement}
              className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-bold text-mid hover:border-good"
            >
              ⬇️ {ml ? "സ്റ്റേറ്റ്മെന്റ്" : "Statement"}
            </button>
          )}
        </div>
        {payouts.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-dim">
            {ml
              ? "ഇതുവരെ ജോലി പൂർത്തിയാക്കിയിട്ടില്ല — ഒരു ജോലി തീർത്താൽ കിട്ടിയ പണം ഇവിടെ കാണാം."
              : "No completed jobs yet — finish a job to see your payout here."}
          </p>
        ) : (
          <div className="divide-y divide-line">
            {payouts.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-bold">
                    {getCategory(b.categoryId).icon} {b.subService}
                  </p>
                  {b.status === "cancelled" && (
                    <p className="text-[11px] font-semibold text-warn">
                      {ml
                        ? "റദ്ദായി — യാത്രയ്ക്കുള്ള പണം"
                        : "Cancelled — paid for your trip"}
                    </p>
                  )}
                  <p className="text-[10px] text-dim">
                    {mlMonth(
                      new Date(b.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }),
                      ml,
                    )}
                  </p>
                </div>
                <p className="text-sm font-extrabold text-good">+{inr(workerCredit(b))}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
