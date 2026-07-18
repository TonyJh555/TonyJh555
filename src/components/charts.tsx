"use client";

import { inr } from "@/lib/format";
import type { Heatmap, TrendPoint } from "@/lib/analytics";

/**
 * Small, dependency-free chart primitives shared by the worker and admin
 * dashboards. Each is a single-series magnitude/time view, so it uses one
 * brand hue (sequential), rounded mark-ends anchored to the baseline, direct
 * labels on the extremes, and per-mark hover tooltips.
 */

type Tone = "good" | "kaam" | "gold" | "info";

const TONE: Record<Tone, string> = {
  good: "var(--color-good)",
  kaam: "var(--color-kaam)",
  gold: "var(--color-gold)",
  info: "var(--color-info)",
};

/** Vertical bars over time (e.g. monthly revenue). */
export function ColumnTrend({
  data,
  tone = "kaam",
  format = inr,
}: {
  data: TrendPoint[];
  tone?: Tone;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {data.map((d) => (
          <div
            key={d.date}
            className="group flex flex-1 flex-col items-center justify-end gap-1"
            title={`${d.label}: ${format(d.value)} · ${d.jobs} job${d.jobs === 1 ? "" : "s"}`}
          >
            <div
              className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80"
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                background: TONE[tone],
                opacity: d.date === peak.date ? 1 : 0.55,
              }}
            />
            <span className="text-[8px] font-semibold text-dim">{d.label}</span>
          </div>
        ))}
      </div>
      {peak.value > 0 && (
        <p className="mt-2 text-[11px] text-mid">
          🔝 Peak: <b>{peak.label}</b> — {format(peak.value)}
        </p>
      )}
    </div>
  );
}

/** Area + line sparkline over time (e.g. a worker's 30-day earnings). */
export function AreaSparkline({
  data,
  tone = "good",
  height = 96,
}: {
  data: TrendPoint[];
  tone?: Tone;
  height?: number;
}) {
  const W = 300;
  const H = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => H - 6 - (v / max) * (H - 12);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const color = TONE[tone];
  const gid = `spark-${tone}`;
  const total = data.reduce((s, d) => s + d.value, 0);
  const last = data[n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-24 w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {last && last.value > 0 && (
          <circle cx={x(n - 1)} cy={y(last.value)} r="3" fill={color} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-dim">
        <span>{data[0]?.label}</span>
        <span className="font-semibold text-mid">Total {inr(total)}</span>
        <span>{last?.label}</span>
      </div>
    </div>
  );
}

/**
 * Demand heatmap — weekday × time-of-day intensity. Sequential single hue:
 * cell opacity encodes magnitude (empty = surface, busiest = full hue). Each
 * cell has a hover tooltip; a small legend anchors the scale.
 */
export function DemandHeatmap({ data, tone = "kaam" }: { data: Heatmap; tone?: Tone }) {
  const color = TONE[tone];
  const intensity = (v: number) => (data.max <= 0 ? 0 : 0.12 + 0.88 * (v / data.max));
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[300px]">
          {/* Column labels */}
          <div className="mb-1 flex gap-[2px] pl-8">
            {data.colLabels.map((c) => (
              <span key={c} className="flex-1 text-center text-[8px] font-semibold text-dim">
                {c}
              </span>
            ))}
          </div>
          {data.rows.map((row) => (
            <div key={row.label} className="mb-[2px] flex items-center gap-[2px]">
              <span className="w-8 shrink-0 text-[9px] font-bold text-mid">{row.label}</span>
              {row.values.map((v, i) => (
                <div
                  key={i}
                  className="h-5 flex-1 rounded-[3px]"
                  title={`${row.label} ${data.colLabels[i]}: ${v} booking${v === 1 ? "" : "s"}`}
                  style={{
                    background: v > 0 ? color : "var(--color-surf)",
                    opacity: v > 0 ? intensity(v) : 1,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-mid">
        <span>{data.total > 0 ? <>🔥 Busiest: <b>{data.peak}</b></> : "No bookings yet"}</span>
        <span className="flex items-center gap-1">
          Less
          <span className="flex gap-[2px]">
            {[0.2, 0.45, 0.7, 1].map((o) => (
              <span key={o} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color, opacity: o }} />
            ))}
          </span>
          More
        </span>
      </div>
    </div>
  );
}

export interface RankedRow {
  key: string;
  label: string;
  value: number;
  sub?: string;
}

/** Horizontal ranked bars with direct value labels (e.g. earnings by service). */
export function RankedBars({
  rows,
  tone = "good",
  format = inr,
  emptyLabel = "No data yet.",
}: {
  rows: RankedRow[];
  tone?: Tone;
  format?: (n: number) => string;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-6 text-center text-xs text-dim">{emptyLabel}</p>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-2" title={`${r.label}: ${format(r.value)}`}>
          <span className="w-28 shrink-0 truncate text-xs font-semibold">{r.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-[4px] bg-surf">
            <div
              className="h-full rounded-[4px] transition-all"
              style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: TONE[tone] }}
            />
          </div>
          {r.sub && <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-mid">{r.sub}</span>}
          <span className="w-16 shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: TONE[tone] }}>
            {format(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
