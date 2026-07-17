"use client";

import { CARE_PLANS, planQuote, planSavings, perMonth, type PlanId } from "@/lib/plans";
import type { PriceUnit, StateId } from "@/lib/types";
import { inr } from "@/lib/format";

/**
 * Care Plan picker — the "subscribe & save" surface for long-running bookings.
 * Controlled: the parent owns whether a plan is active and which one.
 */

interface PlanPickerProps {
  rate: number;
  unit: PriceUnit;
  surge: boolean;
  stateId: StateId;
  online?: boolean;
  active: boolean;
  planId: PlanId;
  onToggle: (active: boolean) => void;
  onSelect: (planId: PlanId) => void;
}

export function PlanPicker({
  rate,
  unit,
  surge,
  stateId,
  online = false,
  active,
  planId,
  onToggle,
  onSelect,
}: PlanPickerProps) {
  return (
    <div className="mb-5">
      {/* One-time vs Subscribe toggle */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onToggle(false)}
          className={`rounded-xl border p-3 text-left ${
            active ? "border-line bg-white" : "border-kaam bg-kaam-light"
          }`}
        >
          <p className={`text-sm font-bold ${active ? "text-ink" : "text-kaam"}`}>One-time</p>
          <p className="text-[10px] text-dim">Pay as you go</p>
        </button>
        <button
          onClick={() => onToggle(true)}
          className={`relative overflow-hidden rounded-xl border p-3 text-left ${
            active ? "border-kaam bg-kaam-light" : "border-line bg-white"
          }`}
        >
          <span className="absolute right-1.5 top-1.5 rounded-full bg-good px-1.5 py-0.5 text-[8px] font-extrabold text-white">
            SAVE 20%
          </span>
          <p className={`text-sm font-bold ${active ? "text-kaam" : "text-ink"}`}>♻️ Subscribe</p>
          <p className="text-[10px] text-dim">Monthly package</p>
        </button>
      </div>

      {active && (
        <div className="fade-up flex flex-col gap-2">
          <p className="text-[11px] leading-relaxed text-mid">
            Long-term help — a nurse, maid, cook or teacher for weeks — is calmer and cheaper on a
            plan. Commit longer, pay less each month. Cancel anytime with 7 days&apos; notice.
          </p>
          {CARE_PLANS.map((plan) => {
            const q = planQuote({ rate, unit, stateId, surge, plan, online });
            const save = planSavings({ rate, unit, stateId, surge, plan, online });
            const selected = planId === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => onSelect(plan.id)}
                className={`relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-shadow ${
                  selected
                    ? "border-kaam bg-kaam-light shadow-pop"
                    : plan.highlight
                      ? "border-kaam-mid bg-white"
                      : "border-line bg-white"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-kaam bg-kaam text-white" : "border-line"
                  }`}
                >
                  {selected && <span className="text-[10px]">✓</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-ink">{plan.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                        plan.highlight ? "bg-kaam text-white" : "bg-good-light text-good"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-mid">
                    {inr(perMonth(q, plan))}/month · {inr(q.totalUserPays)} total
                  </span>
                </span>
                {save > 0 && (
                  <span className="shrink-0 text-right">
                    <span className="block text-[9px] font-bold text-dim">you save</span>
                    <span className="block text-sm font-extrabold text-good">{inr(save)}</span>
                  </span>
                )}
              </button>
            );
          })}
          <p className="rounded-xl bg-good-light p-2.5 text-[10px] leading-relaxed text-good">
            🔒 Same verified worker every visit · 📅 fixed monthly schedule · 💚 priority support
          </p>
        </div>
      )}
    </div>
  );
}
