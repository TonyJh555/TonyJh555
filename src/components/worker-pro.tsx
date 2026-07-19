"use client";

import { useState } from "react";
import type { Worker } from "@/lib/types";
import { useBookings } from "@/lib/bookings";
import { PRO_TIERS, proStatus, workerProStats } from "@/lib/pro-tiers";
import { Card } from "@/components/ui";

/**
 * "Your KAAM Pro status" — the worker-facing hub of the recognition program
 * (Uber Pro's signature screen). Shows the earned tier, a requirement-by-
 * requirement path to the next one, and what each tier unlocks. Because
 * customer ratings are mandatory, every one of these numbers is genuine.
 */
export function WorkerPro({ worker }: { worker: Worker }) {
  const bookings = useBookings();
  const [showLadder, setShowLadder] = useState(false);
  const stats = workerProStats(worker, bookings);
  const status = proStatus(stats);
  const { tier, next } = status;

  return (
    <Card className="fade-up mb-4 overflow-hidden p-0">
      {/* Tier header */}
      <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${tier.color}, #0b1220)` }}>
        <p className="text-[10px] font-bold tracking-widest text-white/70 uppercase">KAAM Pro status</p>
        <p className="mt-1 font-display text-xl font-extrabold">
          {tier.emoji} {tier.name}
        </p>
        <p className="mt-0.5 text-xs text-white/80">
          {stats.jobs.toLocaleString("en-IN")} jobs · {stats.rating ? `${stats.rating.toFixed(2)}★` : "not rated yet"} ·{" "}
          {Math.round(stats.completionRate * 100)}% completed
        </p>
      </div>

      <div className="p-4">
        {next ? (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold">
                Next: {next.emoji} {next.name}
              </span>
              <span className="font-semibold text-mid">{Math.round(status.progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surf">
              <div
                className="h-full rounded-full bg-kaam transition-all"
                style={{ width: `${Math.round(status.progress * 100)}%` }}
              />
            </div>

            <ul className="mt-3 flex flex-col gap-1.5">
              {status.requirements.map((r) => (
                <li key={r.label} className="flex items-center justify-between text-xs">
                  <span className={r.met ? "text-mid line-through" : "font-semibold"}>
                    {r.met ? "✅" : "⬜"} {r.label}
                  </span>
                  <span className="text-dim">{r.have}</span>
                </li>
              ))}
            </ul>

            <p className="mt-3 rounded-xl bg-kaam-light p-2.5 text-[11px] leading-relaxed text-kaam">
              💡 Ratings are mandatory for customers, so every ⭐ is earned — finish jobs well and{" "}
              {next.name} follows. Unlocks: {next.perks.join(" · ")}.
            </p>
          </>
        ) : (
          <p className="rounded-xl bg-kaam-light p-2.5 text-[11px] leading-relaxed text-kaam">
            💎 You&apos;ve reached KAAM&apos;s highest honour — customers see it on every card, and you
            rank at the top nearby. Keep it by keeping your record clean.
          </p>
        )}

        <button onClick={() => setShowLadder(!showLadder)} className="mt-3 text-xs font-bold text-kaam">
          {showLadder ? "Hide tiers ▲" : "How tiers work ▼"}
        </button>
        {showLadder && (
          <div className="mt-2 flex flex-col gap-1.5">
            {PRO_TIERS.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border p-2.5 text-xs ${
                  t.id === tier.id ? "border-kaam-mid bg-kaam-light" : "border-line bg-white"
                }`}
              >
                <p className="font-bold">
                  {t.emoji} {t.name}
                  {t.id === tier.id && <span className="ml-1 text-[10px] font-semibold text-kaam">— you</span>}
                </p>
                <p className="mt-0.5 text-[11px] text-mid">
                  {t.minJobs > 0
                    ? `${t.minJobs}+ jobs · ${t.minRating}★+ · ${Math.round(t.minCompletion * 100)}%+ completion`
                    : "Where every worker starts"}
                </p>
                <p className="mt-0.5 text-[11px] text-dim">{t.perks.join(" · ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
