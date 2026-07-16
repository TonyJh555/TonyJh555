"use client";

import { inr } from "@/lib/format";
import { Card } from "@/components/ui";
import { workerEarningsSummary } from "@/lib/analytics";
import {
  GOAL_STEP,
  INCENTIVE_TIERS,
  setWeeklyGoal,
  useWeeklyGoal,
} from "@/lib/worker-goals";
import type { Booking } from "@/lib/types";

/** SVG progress ring for weekly-goal completion. */
function Ring({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = Math.min(1, pct) * c;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line, #e5e7eb)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#15803d"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}

export function WorkerGoals({ bookings, workerId }: { bookings: Booking[]; workerId: string }) {
  const goal = useWeeklyGoal();
  const s = workerEarningsSummary(bookings, workerId);
  const pct = goal > 0 ? s.week / goal : 0;
  const reached = s.week >= goal;

  const nextTier = INCENTIVE_TIERS.find((t) => s.jobsWeek < t.jobs);
  const jobsToNext = nextTier ? nextTier.jobs - s.jobsWeek : 0;

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <Ring pct={pct} />
          <div className="absolute text-center">
            <p className="font-display text-lg font-extrabold text-good">{Math.round(pct * 100)}%</p>
            <p className="text-[9px] font-semibold text-mid">of goal</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-wide text-dim uppercase">This week</p>
          <p className="font-display text-xl font-extrabold">
            {inr(s.week)} <span className="text-xs font-semibold text-mid">/ {inr(goal)}</span>
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-good">
            {reached
              ? "🎉 Goal smashed! Set a higher one 💪"
              : `${inr(goal - s.week)} to go · ${s.jobsWeek} job${s.jobsWeek === 1 ? "" : "s"} this week`}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-mid">Weekly goal</span>
            <button
              onClick={() => setWeeklyGoal(goal - GOAL_STEP)}
              className="h-6 w-6 rounded-lg border border-line text-sm font-bold text-mid"
              aria-label="Lower goal"
            >
              −
            </button>
            <span className="text-xs font-bold tabular-nums">{inr(goal)}</span>
            <button
              onClick={() => setWeeklyGoal(goal + GOAL_STEP)}
              className="h-6 w-6 rounded-lg border border-line text-sm font-bold text-mid"
              aria-label="Raise goal"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Incentive tier */}
      <div className="mt-3 rounded-xl bg-[linear-gradient(135deg,#fffbeb,#fff)] p-3">
        {nextTier ? (
          <>
            <p className="text-xs font-bold text-warn">
              🎯 {jobsToNext} more job{jobsToNext === 1 ? "" : "s"} this week → earn{" "}
              <span className="font-extrabold">{inr(nextTier.bonus)} bonus</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-warn transition-all"
                style={{ width: `${Math.min(100, (s.jobsWeek / nextTier.jobs) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {INCENTIVE_TIERS.map((t) => (
                <span
                  key={t.jobs}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                    s.jobsWeek >= t.jobs
                      ? "bg-good-light text-good"
                      : "border border-line text-dim"
                  }`}
                >
                  {t.jobs} jobs · {inr(t.bonus)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs font-bold text-good">
            🏆 Top tier reached — {inr(INCENTIVE_TIERS[INCENTIVE_TIERS.length - 1].bonus)} bonus
            unlocked this week!
          </p>
        )}
      </div>
    </Card>
  );
}
