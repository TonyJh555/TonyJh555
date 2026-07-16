"use client";

import { inr } from "@/lib/format";
import { Card } from "@/components/ui";
import {
  payoutByMonth,
  payoutByWeekday,
  workerEarningsSummary,
  type BarPoint,
} from "@/lib/analytics";
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
  const year = new Date().getFullYear();

  const kpis = [
    { label: "Today", value: s.today },
    { label: "This week", value: s.week },
    { label: "This month", value: s.month },
    { label: "This year", value: s.year },
  ];

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

      <BarChart title="💚 Earnings by weekday" data={weekday} />
      <BarChart title={`📅 Monthly earnings · ${year}`} data={months} />

      <Card className="bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-center text-white">
        <p className="text-xs text-white/70">Lifetime earnings on KAAM</p>
        <p className="font-display text-3xl font-extrabold">{inr(s.all)}</p>
        <p className="text-[11px] text-white/70">{s.jobs} jobs completed · 85% payout, paid to you</p>
      </Card>
    </div>
  );
}
