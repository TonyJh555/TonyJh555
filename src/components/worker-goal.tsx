"use client";

import { useState } from "react";
import type { Booking, Worker } from "@/lib/types";
import { inr } from "@/lib/format";
import { Card } from "@/components/ui";
import {
  GOAL_PRESETS,
  setWeeklyGoal,
  useWeeklyGoals,
  weeklyGoal,
  weekProgress,
} from "@/lib/weekly-goal";

/**
 * Weekly earnings goal — the Uber Pro finish-line ring. Shows this week's
 * take-home against the worker's own target, whether they're on pace, and a
 * Mon→Sun mini-chart. Editable in one tap, so the goal stays theirs.
 */
export function WorkerGoal({ worker, bookings }: { worker: Worker; bookings: Booking[] }) {
  const goals = useWeeklyGoals();
  const target = weeklyGoal(goals, worker.id);
  const p = weekProgress(bookings, worker.id, target);
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState(String(target));

  const R = 46;
  const C = 2 * Math.PI * R;
  const dash = C * p.pct;
  const maxDay = Math.max(1, ...p.days.map((d) => d.value));

  return (
    <Card className="fade-up mb-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-widest text-dim uppercase">🎯 Weekly goal</p>
        <button onClick={() => setEditing((e) => !e)} className="text-[11px] font-bold text-kaam">
          {editing ? "Close" : "Edit goal"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {GOAL_PRESETS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setWeeklyGoal(worker.id, g);
                  setCustom(String(g));
                  setEditing(false);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  g === target ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
                }`}
              >
                {inr(g)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Custom ₹"
              className="w-1/2 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-kaam"
            />
            <button
              onClick={() => {
                if (custom) setWeeklyGoal(worker.id, Number(custom));
                setEditing(false);
              }}
              className="flex-1 rounded-xl bg-kaam py-2 text-xs font-bold text-white"
            >
              Set goal
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          {/* Progress ring */}
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
              <circle cx="55" cy="55" r={R} fill="none" stroke="var(--color-line)" strokeWidth="9" />
              <circle
                cx="55"
                cy="55"
                r={R}
                fill="none"
                stroke={p.achieved ? "var(--color-good)" : "var(--color-kaam)"}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display text-lg font-extrabold leading-none">
                {Math.round(p.rawPct * 100)}%
              </span>
              <span className="mt-0.5 text-[9px] font-semibold text-dim">of goal</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold text-ink">{inr(p.earned)}</p>
            <p className="text-[11px] text-mid">
              of {inr(p.target)} · {p.jobs} job{p.jobs === 1 ? "" : "s"} this week
            </p>
            {p.achieved ? (
              <p className="mt-1.5 inline-block rounded-full bg-good-light px-2 py-0.5 text-[10px] font-bold text-good">
                🎉 Goal smashed! {inr(p.earned - p.target)} over
              </p>
            ) : (
              <p
                className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  p.onTrack ? "bg-good-light text-good" : "bg-warn-light text-warn"
                }`}
              >
                {p.onTrack ? "✅ On track" : "⏳ Behind pace"} · {inr(p.remaining)} to go
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mon→Sun mini chart */}
      {!editing && (
        <div className="mt-4 flex items-end justify-between gap-1.5">
          {p.days.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end justify-center">
                <div
                  className={`w-full rounded-t ${
                    d.isToday ? "bg-kaam" : d.isFuture ? "bg-line" : "bg-kaam/40"
                  }`}
                  style={{ height: `${d.value > 0 ? Math.max(6, (d.value / maxDay) * 100) : 2}%` }}
                  title={inr(d.value)}
                />
              </div>
              <span className={`text-[9px] font-bold ${d.isToday ? "text-kaam" : "text-dim"}`}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
