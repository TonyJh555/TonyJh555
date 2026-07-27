"use client";

import { useSubscriptions, daysUntil } from "@/lib/subscriptions";
import { WorkerSessions } from "@/components/plan-sessions";
import { getCategory } from "@/data/categories";
import { inr } from "@/lib/format";
import type { Subscription } from "@/lib/types";
import { Card } from "@/components/ui";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Worker's recurring income from Care Plans — the "guaranteed income" story.
 * Subscriptions mean a worker knows part of next month's earnings is already
 * locked in, which is exactly the stability gig workers never get elsewhere.
 */
export function WorkerPlans({ workerId }: { workerId: string }) {
  const all = useSubscriptions();
  const mine = all.filter((s) => s.workerId === workerId);
  const active = mine.filter((s) => s.status === "active");
  const guaranteed = active.reduce((sum, s) => sum + s.monthlyPayout, 0);

  if (mine.length === 0) {
    return (
      <Card className="mb-5 border-dashed text-center">
        <p className="text-2xl">♻️</p>
        <p className="mt-1 text-sm font-bold text-ink">No Care Plans yet</p>
        <p className="mt-1 text-xs text-dim">
          When a customer subscribes to a monthly plan with you, it shows here as
          guaranteed recurring income.
        </p>
      </Card>
    );
  }

  return (
    <section className="mb-6">
      {/* Guaranteed-income hero */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0a4d37,#0f6e4f)] p-4 text-white shadow-card">
        <p className="text-[11px] font-semibold text-white/70">♻️ Guaranteed monthly income</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{inr(guaranteed)}</p>
        <p className="mt-1 text-[11px] text-white/80">
          Locked in from {active.length} active plan{active.length === 1 ? "" : "s"} — before any
          new jobs this month.
        </p>
      </div>

      <h2 className="mb-3 font-display text-base font-bold">Your Care Plans</h2>
      <div className="flex flex-col gap-3">
        {mine.map((sub) => (
          <PlanRow key={sub.id} sub={sub} />
        ))}
      </div>
    </section>
  );
}

function PlanRow({ sub }: { sub: Subscription }) {
  const category = getCategory(sub.categoryId);
  const days = daysUntil(sub.renewsOn);
  const isActive = sub.status === "active";

  return (
    <Card className="fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {category.icon} {sub.service}
          </p>
          <p className="text-xs text-mid">
            {sub.months}-month plan
            {sub.online ? " · 💻 Online" : ""} ·{" "}
            {isActive ? (
              <span className="font-semibold text-good">Active</span>
            ) : sub.status === "cancelled" ? (
              <span className="text-warn">Ending {fmtDate(sub.renewsOn)}</span>
            ) : (
              <span className="text-dim">Ended</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-extrabold text-good">{inr(sub.monthlyPayout)}</p>
          <p className="text-[10px] text-dim">/month to you</p>
        </div>
      </div>
      {isActive && (
        <p className="mt-2 rounded-lg bg-good-light px-2.5 py-1.5 text-[11px] font-semibold text-good">
          {sub.autoRenew ? "🔁 Auto-renews" : "Runs until"} {fmtDate(sub.renewsOn)}
          {days >= 0 ? ` · in ${days} day${days === 1 ? "" : "s"}` : ""} · {inr(sub.termPayout)} total
          this term
        </p>
      )}
      {isActive && <WorkerSessions sub={sub} />}
    </Card>
  );
}
