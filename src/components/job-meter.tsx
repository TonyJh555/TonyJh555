"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { findWorker } from "@/lib/roster";
import { BASE_MINUTES, GRACE_MINUTES, meterNow, minutesLeftToday } from "@/lib/metered";
import { inr } from "@/lib/format";
import { clockTime } from "@/lib/completion";
import { useLanguage } from "@/components/language-provider";
import { useDailyCapMinutes } from "@/lib/site-settings";

/**
 * Live fair-billing meter for a running hourly job — shown to customer and
 * worker alike so there are no billing surprises. Inside the base hour it
 * reassures; past the grace it shows exactly what the extra minutes cost
 * (customer) / earn (worker).
 */
export function JobMeter({ booking, perspective }: { booking: Booking; perspective: "user" | "worker" }) {
  const { lang } = useLanguage();
  const capMinutes = useDailyCapMinutes();
  const ml = lang === "ml";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // 5s, so the very first minute doesn't sit at "0h 00m" long enough to
    // look frozen — the reading is whole minutes, but it advances promptly.
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  const worker = findWorker(booking.workerId);
  if (!worker || booking.status !== "in_progress") return null;
  const m = meterNow(booking, worker, new Date(now), capMinutes);
  if (!m) return null;

  // Paused for a reschedule — the clock is frozen, no charge for the gap.
  if (booking.pausedAt) {
    return (
      <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3 text-[11px] leading-relaxed text-info">
        <p className="font-bold">
          ⏸ {ml ? "ക്ലോക്ക് നിർത്തി" : "Clock paused at"} {Math.floor(m.elapsed / 60)}h {String(m.elapsed % 60).padStart(2, "0")}m
          {booking.startedAt && (
            <span className="ml-1 font-semibold opacity-80">
              · {ml ? "തുടങ്ങിയത്" : "started"} {clockTime(booking.startedAt)}
            </span>
          )}
        </p>
        <p className="mt-0.5">
          {ml
            ? "ജോലി റീഷെഡ്യൂൾ ചെയ്യുന്നതുവരെ ബില്ലിംഗ് നിർത്തി — ഇടവേളയ്ക്ക് പണം ഈടാക്കില്ല."
            : "Billing is frozen while the job is rescheduled — you're not charged for the gap."}
        </p>
      </div>
    );
  }

  const time = `${Math.floor(m.elapsed / 60)}h ${String(m.elapsed % 60).padStart(2, "0")}m`;
  const leftToday = minutesLeftToday(booking, capMinutes, new Date(now));
  const capHours = Math.round(capMinutes / 60);

  // The bill has stopped growing. Said plainly on both sides, because the
  // whole point of a ceiling is that nobody has to argue about the number.
  if (m.capped) {
    return (
      <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3 text-[11px] leading-relaxed text-info">
        <p className="font-bold">
          🛑 {ml ? `ഇന്നത്തെ ബില്ലിംഗ് നിർത്തി (${capHours} മണിക്കൂർ)` : `Billing stopped for today (${capHours}h limit)`}
          {booking.startedAt && (
            <span className="ml-1 font-semibold opacity-80">
              · {ml ? "തുടങ്ങിയത്" : "started"} {clockTime(booking.startedAt)}
            </span>
          )}
        </p>
        <p className="mt-0.5">
          {ml
            ? perspective === "user"
              ? `${capHours} മണിക്കൂറിൽ കൂടുതൽ ഇന്ന് ഈടാക്കില്ല. ജോലി തുടരാം — പക്ഷേ തുക ഇനി കൂടില്ല. ബാക്കിയുണ്ടെങ്കിൽ നാളത്തേക്ക് മാറ്റാം.`
              : `${capHours} മണിക്കൂറിനു ശേഷം ഇന്ന് കൂടുതൽ പണം കിട്ടില്ല. ബാക്കി ജോലി നാളത്തേക്ക് മാറ്റുന്നതാണ് നല്ലത്.`
            : perspective === "user"
              ? `Nothing more is charged today past ${capHours} hours. The work can carry on, but the amount will not grow. If there's more to do, agree a time tomorrow.`
              : `Past ${capHours} hours nothing more is earned today. If there's more to do, it's better to agree a return time tomorrow.`}
        </p>
      </div>
    );
  }

  let note: string;
  if (m.elapsed <= BASE_MINUTES) {
    note = ml
      ? perspective === "user"
        ? "ബേസ് അവറിനുള്ളിൽ — അധിക ചാർജില്ല"
        : "ബേസ് അവറിനുള്ളിൽ"
      : perspective === "user"
        ? "within the base hour — no extra charge"
        : "within the base hour";
  } else if (m.inGrace) {
    note = ml
      ? `ഗ്രേസ് സമയം (${BASE_MINUTES + GRACE_MINUTES} മിനിറ്റ്) — ഇപ്പോഴും അധിക ചാർജില്ല`
      : `grace period (${BASE_MINUTES + GRACE_MINUTES} min) — still no extra charge`;
  } else {
    const extra = m.elapsed - BASE_MINUTES;
    note = ml
      ? perspective === "user"
        ? `${extra} അധിക മിനിറ്റ് · +${inr(m.extraSoFar)} + GST — ജോലി ചെയ്ത മിനിറ്റുകൾക്ക് മാത്രം`
        : `${extra} അധിക മിനിറ്റ് · +${inr(m.extraSoFar)} അധികം നേടി`
      : perspective === "user"
        ? `${extra} extra min · +${inr(m.extraSoFar)} + GST so far — you only pay for minutes worked`
        : `${extra} extra min · +${inr(m.extraSoFar)} extra earned so far`;
  }

  return (
    <div
      className={`mt-3 rounded-xl border p-3 text-[11px] leading-relaxed ${
        m.extraSoFar > 0
          ? "border-warn-mid bg-warn-light text-warn"
          : "border-good-mid bg-good-light text-good"
      }`}
    >
      <p className="font-bold">
        ⏱ {ml ? "ജോലി ക്ലോക്ക്" : "Job clock"}: {time}
        {booking.startedAt && (
          <span className="ml-1 font-semibold opacity-80">
            · {ml ? "തുടങ്ങിയത്" : "started"} {clockTime(booking.startedAt)}
          </span>
        )}
      </p>
      <p className="mt-0.5">{note}</p>
      {leftToday > 0 && leftToday <= 60 && (
        <p className="mt-1.5 rounded-lg bg-white/70 px-2 py-1 font-bold">
          ⏳ {ml
            ? `ഇന്ന് ഇനി ${leftToday} മിനിറ്റ് മാത്രം ബില്ല് ചെയ്യും`
            : `Only ${leftToday} more minutes are billed today`}
        </p>
      )}
    </div>
  );
}
