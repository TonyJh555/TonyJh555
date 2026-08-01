"use client";

import { useState } from "react";
import type { Worker } from "@/lib/types";
import { useBookings } from "@/lib/bookings";
import { PRO_TIERS, proStatus, tierPerks, workerProStats } from "@/lib/pro-tiers";
import { Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * "Your KAAM Pro status" — the worker-facing hub of the recognition program
 * (Uber Pro's signature screen). Shows the earned tier, a requirement-by-
 * requirement path to the next one, and what each tier unlocks. Because
 * customer ratings are mandatory, every one of these numbers is genuine.
 */
export function WorkerPro({ worker }: { worker: Worker }) {
  const bookings = useBookings();
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [showLadder, setShowLadder] = useState(false);
  const stats = workerProStats(worker, bookings);
  const status = proStatus(stats);
  const { tier, next } = status;

  return (
    <Card className="fade-up mb-4 overflow-hidden p-0">
      {/* Tier header */}
      <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${tier.color}, #0b1220)` }}>
        <p className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
          {ml ? "നിങ്ങളുടെ KAAM Pro നില" : "KAAM Pro status"}
        </p>
        <p className="mt-1 font-display text-xl font-extrabold">
          {tier.emoji} {tier.name}
        </p>
        <p className="mt-0.5 text-xs text-white/80">
          {ml
            ? `${stats.jobs.toLocaleString("en-IN")} ജോലി · ${stats.rating ? `${stats.rating.toFixed(2)}★` : "റേറ്റിംഗ് ഇല്ല"} · ${Math.round(stats.completionRate * 100)}% പൂർത്തിയാക്കി`
            : `${stats.jobs.toLocaleString("en-IN")} jobs · ${stats.rating ? `${stats.rating.toFixed(2)}★` : "not rated yet"} · ${Math.round(stats.completionRate * 100)}% completed`}
        </p>
      </div>

      <div className="p-4">
        {next ? (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold">
                {ml ? "അടുത്തത്" : "Next"}: {next.emoji} {next.name}
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
                    {r.met ? "✅" : "⬜"} {ml ? r.labelMl : r.label}
                  </span>
                  <span className="text-dim">{ml ? r.haveMl : r.have}</span>
                </li>
              ))}
            </ul>

            <p className="mt-3 rounded-xl bg-kaam-light p-2.5 text-[11px] leading-relaxed text-kaam">
              {ml
                ? `💡 എല്ലാവരും റേറ്റിംഗ് നൽകണം, അതുകൊണ്ട് ഓരോ ⭐-ഉം നിങ്ങൾ നേടിയതാണ് — ജോലി നന്നായി ചെയ്താൽ ${next.name} താനേ വരും. അപ്പോൾ കിട്ടുന്നത്: ${tierPerks(next, ml).join(" · ")}.`
                : `💡 Ratings are mandatory for customers, so every ⭐ is earned — finish jobs well and ${next.name} follows. Unlocks: ${next.perks.join(" · ")}.`}
            </p>
          </>
        ) : (
          <p className="rounded-xl bg-kaam-light p-2.5 text-[11px] leading-relaxed text-kaam">
            {ml
              ? "💎 KAAM-ന്റെ ഏറ്റവും വലിയ ബഹുമതിയിൽ നിങ്ങൾ എത്തി — എല്ലാ കാർഡിലും ആളുകൾ ഇത് കാണും, അടുത്തുള്ള തിരയലിൽ നിങ്ങൾ ഏറ്റവും മുകളിലാണ്. നല്ല പേര് കാത്തുസൂക്ഷിച്ചാൽ ഇത് നിലനിൽക്കും."
              : "💎 You've reached KAAM's highest honour — customers see it on every card, and you rank at the top nearby. Keep it by keeping your record clean."}
          </p>
        )}

        <button onClick={() => setShowLadder(!showLadder)} className="mt-3 text-xs font-bold text-kaam">
          {showLadder
            ? ml ? "നിലകൾ മറയ്ക്കൂ ▲" : "Hide tiers ▲"
            : ml ? "നിലകൾ എങ്ങനെ ▼" : "How tiers work ▼"}
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
                  {t.id === tier.id && (
                    <span className="ml-1 text-[10px] font-semibold text-kaam">
                      {ml ? "— നിങ്ങൾ" : "— you"}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-mid">
                  {t.minJobs > 0
                    ? ml
                      ? `${t.minJobs}+ ജോലി · ${t.minRating}★+ · ${Math.round(t.minCompletion * 100)}%+ പൂർത്തിയാക്കൽ`
                      : `${t.minJobs}+ jobs · ${t.minRating}★+ · ${Math.round(t.minCompletion * 100)}%+ completion`
                    : ml
                      ? "എല്ലാവരും തുടങ്ങുന്നത് ഇവിടെ നിന്ന്"
                      : "Where every worker starts"}
                </p>
                <p className="mt-0.5 text-[11px] text-dim">{tierPerks(t, ml).join(" · ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
