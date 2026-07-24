"use client";

import { useEffect, useRef, useState } from "react";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { getWorker } from "@/data/workers";
import { finishAlarmDue } from "@/lib/metered";
import { minutesUntil } from "@/lib/reminders";
import { notify } from "@/lib/notify";

/**
 * Job alarms — the alarm-clock layer on both apps:
 *
 *  1. "Base hour almost up" — 5 minutes before the base hour of a running
 *     metered job, so a finished job gets closed instead of drifting into
 *     per-minute billing because someone forgot to tap complete.
 *  2. "Rescheduled visit soon" — about an hour before a paused job's agreed
 *     return time, on both sides.
 *
 * Fires once each (persisted), buzzes the phone, raises a device notification,
 * and drops a dismissible banner in-app.
 */
const SENT_KEY = "kaam.jobAlarmsSent.v1";

function loadSent(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

interface Alarm {
  key: string;
  title: string;
  body: string;
}

export function JobAlarms({ viewer, workerId }: { viewer: "customer" | "worker"; workerId?: string }) {
  const customer = useCustomer();
  const all = useBookings();
  const sent = useRef<Set<string> | null>(null);
  const [alarm, setAlarm] = useState<Alarm | null>(null);

  const mine =
    viewer === "worker"
      ? all.filter((b) => b.workerId === workerId)
      : all.filter((b) => (customer ? b.customerId === customer.id : !b.customerId));

  useEffect(() => {
    if (sent.current === null) sent.current = loadSent();

    const fire = (key: string, title: string, body: string) => {
      sent.current!.add(key);
      try {
        window.localStorage.setItem(SENT_KEY, JSON.stringify([...sent.current!]));
      } catch {
        /* ignore */
      }
      notify(title, body, viewer === "worker" ? "/worker" : "/app/bookings");
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* not supported */
      }
      setAlarm({ key, title, body });
    };

    const tick = () => {
      for (const b of mine) {
        const worker = getWorker(b.workerId);
        if (!worker) continue;

        // 1. Base hour almost up.
        if (finishAlarmDue(b, worker)) {
          const key = `${b.id}:finish`;
          if (!sent.current!.has(key)) {
            fire(
              key,
              "⏰ Base hour almost up",
              viewer === "worker"
                ? `${b.subService}: about 55 minutes worked. Mark the job complete if it's done — or it keeps billing by the minute.`
                : `${b.subService}: nearly an hour worked. If the job's done, ask the worker to mark it complete so billing stops.`,
            );
          }
        }

        // 2. Rescheduled visit about an hour away.
        if (b.pausedAt && b.status === "in_progress" && b.schedule?.when === "scheduled") {
          const m = minutesUntil(b);
          if (m !== null && m >= 0 && m <= 60) {
            const key = `${b.id}:resched:${b.schedule.date}${b.schedule.time}`;
            if (!sent.current!.has(key)) {
              fire(
                key,
                "⏰ Rescheduled visit soon",
                `${b.subService} resumes in about an hour — the worker returns to finish the job.`,
              );
            }
          }
        }
      }
    };

    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [mine, viewer]);

  if (!alarm) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[400] flex justify-center px-3 pt-3">
      <div className="fade-up flex w-full max-w-[430px] items-start gap-3 rounded-2xl border border-warn-mid bg-warn-light p-3.5 shadow-pop">
        <span className="text-xl">⏰</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-warn">{alarm.title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink">{alarm.body}</p>
        </div>
        <button
          onClick={() => setAlarm(null)}
          aria-label="Dismiss"
          className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-mid"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
