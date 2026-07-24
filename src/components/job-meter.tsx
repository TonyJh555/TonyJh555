"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { getWorker } from "@/data/workers";
import { BASE_MINUTES, GRACE_MINUTES, meterNow } from "@/lib/metered";
import { inr } from "@/lib/format";

/**
 * Live fair-billing meter for a running hourly job — shown to customer and
 * worker alike so there are no billing surprises. Inside the base hour it
 * reassures; past the grace it shows exactly what the extra minutes cost
 * (customer) / earn (worker).
 */
export function JobMeter({ booking, perspective }: { booking: Booking; perspective: "user" | "worker" }) {
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
        <p className="font-bold">⏸ Clock paused at {Math.floor(m.elapsed / 60)}h {String(m.elapsed % 60).padStart(2, "0")}m</p>
        <p className="mt-0.5">Billing is frozen while the job is rescheduled — you&apos;re not charged for the gap.</p>
      </div>
    );
  }

  const time = `${Math.floor(m.elapsed / 60)}h ${String(m.elapsed % 60).padStart(2, "0")}m`;

  let note: string;
  if (m.elapsed <= BASE_MINUTES) {
    note =
      perspective === "user"
        ? `within the base hour — no extra charge`
        : `within the base hour`;
  } else if (m.inGrace) {
    note = `grace period (${BASE_MINUTES + GRACE_MINUTES} min) — still no extra charge`;
  } else {
    note =
      perspective === "user"
        ? `${m.elapsed - BASE_MINUTES} extra min · +${inr(m.extraSoFar)} + GST so far — you only pay for minutes worked`
        : `${m.elapsed - BASE_MINUTES} extra min · +${inr(m.extraSoFar)} extra earned so far`;
  }

  return (
    <div
      className={`mt-3 rounded-xl border p-3 text-[11px] leading-relaxed ${
        m.extraSoFar > 0
          ? "border-warn-mid bg-warn-light text-warn"
          : "border-good-mid bg-good-light text-good"
      }`}
    >
      <p className="font-bold">⏱ Job clock: {time}</p>
      <p className="mt-0.5">{note}</p>
    </div>
  );
}
