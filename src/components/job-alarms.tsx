"use client";

import { useEffect, useRef, useState } from "react";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { findWorker } from "@/lib/roster";
import { finishAlarmDue } from "@/lib/metered";
import { minutesUntil } from "@/lib/reminders";
import { notify } from "@/lib/notify";
import { formatSchedule, isScheduled, jobStampLine } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

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
  /** Which job — what, who, when, and the reference the receipt prints. */
  stamp: string;
  body: string;
}

export function JobAlarms({ viewer, workerId }: { viewer: "customer" | "worker"; workerId?: string }) {
  const ml = useLanguage().lang === "ml";
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

    const fire = (key: string, title: string, stamp: string, body: string) => {
      sent.current!.add(key);
      try {
        window.localStorage.setItem(SENT_KEY, JSON.stringify([...sent.current!]));
      } catch {
        /* ignore */
      }
      // The stamp leads, so a phone holding six KAAM alerts still says which
      // job each one is about before the reader has to think.
      notify(title, `${stamp}\n${body}`, viewer === "worker" ? "/worker" : "/app/bookings");
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* not supported */
      }
      setAlarm({ key, title, stamp, body });
    };

    const tick = () => {
      for (const b of mine) {
        const worker = findWorker(b.workerId);
        if (!worker) continue;

        // 1. Base hour almost up.
        if (finishAlarmDue(b, worker)) {
          const key = `${b.id}:finish`;
          if (!sent.current!.has(key)) {
            const first = b.workerName.split(" ")[0];
            fire(
              key,
              ml ? `⏰ ബേസ് അവർ തീരാറായി — ${b.subService}` : `⏰ Base hour almost up — ${b.subService}`,
              jobStampLine({ bookingId: b.id, workerName: b.workerName, at: b.startedAt }),
              viewer === "worker"
                ? ml
                  ? "ഏകദേശം 55 മിനിറ്റായി. ജോലി കഴിഞ്ഞെങ്കിൽ പൂർത്തിയായി എന്ന് അടയാളപ്പെടുത്തൂ — അല്ലെങ്കിൽ മിനിറ്റ് കണക്കിന് ബില്ല് തുടരും."
                  : "About 55 minutes worked. Mark the job complete if it's done — or it keeps billing by the minute."
                : ml
                  ? `ഏകദേശം ഒരു മണിക്കൂറായി. ജോലി കഴിഞ്ഞെങ്കിൽ ${first}-നോട് പൂർത്തിയായി എന്ന് അടയാളപ്പെടുത്താൻ പറയൂ — അപ്പോൾ ബില്ല് നിൽക്കും.`
                  : `Nearly an hour worked. If the job's done, ask ${first} to mark it complete so billing stops.`,
            );
          }
        }

        // 2. Payment landed. For an ASAP job that is the green light to set
        //    off; for a dated one it is only a confirmation, and telling a
        //    caterer to drive to a wedding six days early is how a worker
        //    learns to stop reading these.
        if (viewer === "worker" && b.status === "accepted" && b.payment?.confirmedAt) {
          const key = `${b.id}:paid`;
          if (!sent.current!.has(key)) {
            const dated = isScheduled(b.schedule);
            fire(
              key,
              dated
                ? ml ? `✅ സ്ലോട്ട് ഉറപ്പിച്ചു — ${b.subService}` : `✅ Slot confirmed — ${b.subService}`
                : ml ? `✅ പണം ലഭിച്ചു — ${b.subService}` : `✅ Payment done — ${b.subService}`,
              jobStampLine({ bookingId: b.id, at: b.createdAt }),
              dated
                ? ml
                  ? `ഉപഭോക്താവ് പണമടച്ചു. ${formatSchedule(b.schedule)}-ന് ${b.address ?? "അവിടെ"} എത്തണം — കലണ്ടറിൽ ചേർക്കൂ.`
                  : `The customer has paid. Be at ${b.address ?? "the address"} on ${formatSchedule(b.schedule)} — add it to your calendar.`
                : ml
                  ? `ഉപഭോക്താവ് പണമടച്ചു. ${b.address ?? "ഉപഭോക്താവിന്റെ അടുത്തേക്ക്"} ഇപ്പോൾ പുറപ്പെടാം.`
                  : `The customer has paid. Set off to ${b.address ?? "the customer"} now.`,
            );
          }
        }

        // 3. Rescheduled visit about an hour away.
        if (b.pausedAt && b.status === "in_progress" && b.schedule?.when === "scheduled") {
          const m = minutesUntil(b);
          if (m !== null && m >= 0 && m <= 60) {
            const key = `${b.id}:resched:${b.schedule.date}${b.schedule.time}`;
            if (!sent.current!.has(key)) {
              fire(
                key,
                ml ? `⏰ വീണ്ടും വരുന്ന സമയമായി — ${b.subService}` : `⏰ Rescheduled visit soon — ${b.subService}`,
                jobStampLine({ bookingId: b.id, workerName: b.workerName }),
                ml
                  ? "ഏകദേശം ഒരു മണിക്കൂറിനുള്ളിൽ ജോലി തുടരും — ബാക്കി തീർക്കാൻ വരുന്നു."
                  : "Resumes in about an hour — the worker returns to finish the job.",
              );
            }
          }
        }
      }
    };

    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [mine, viewer, ml]);

  if (!alarm) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[400] flex justify-center px-3 pt-3">
      <div className="fade-up flex w-full max-w-[430px] items-start gap-3 rounded-2xl border border-warn-mid bg-warn-light p-3.5 shadow-pop">
        <span className="text-xl">⏰</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-warn">{alarm.title}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-mid">{alarm.stamp}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink">{alarm.body}</p>
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
