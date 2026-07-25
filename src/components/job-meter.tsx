"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { getWorker } from "@/data/workers";
import { BASE_MINUTES, GRACE_MINUTES, meterNow } from "@/lib/metered";
import { inr } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

/**
 * Live fair-billing meter for a running hourly job — shown to customer and
 * worker alike so there are no billing surprises. Inside the base hour it
 * reassures; past the grace it shows exactly what the extra minutes cost
 * (customer) / earn (worker).
 */
export function JobMeter({ booking, perspective }: { booking: Booking; perspective: "user" | "worker" }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const worker = getWorker(booking.workerId);
  if (!worker || booking.status !== "in_progress") return null;
  const m = meterNow(booking, worker, new Date(now));
  if (!m) return null;

  // Paused for a reschedule — the clock is frozen, no charge for the gap.
  if (booking.pausedAt) {
    return (
      <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3 text-[11px] leading-relaxed text-info">
        <p className="font-bold">
          ⏸ {ml ? "ക്ലോക്ക് നിർത്തി" : "Clock paused at"} {Math.floor(m.elapsed / 60)}h {String(m.elapsed % 60).padStart(2, "0")}m
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
      <p className="font-bold">⏱ {ml ? "ജോലി ക്ലോക്ക്" : "Job clock"}: {time}</p>
      <p className="mt-0.5">{note}</p>
    </div>
  );
}
