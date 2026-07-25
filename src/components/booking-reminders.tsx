"use client";

import { useEffect, useRef } from "react";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { getWorker } from "@/data/workers";
import { dueReminder } from "@/lib/reminders";
import { notify } from "@/lib/notify";

/**
 * Reminder engine — fires a device notification ahead of a scheduled booking
 * (a day before, then an hour before), once each, so nobody forgets an
 * appointment. Sent reminders persist so they don't repeat across reloads.
 *
 * Mounted on BOTH sides: a rescheduled job ("come back tomorrow at 10") only
 * works if the worker is reminded too — reminding the customer alone leaves
 * them waiting at home for someone who forgot.
 */
const SENT_KEY = "kaam.remindersSent.v1";

function loadSent(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function BookingReminders({ workerId }: { workerId?: string } = {}) {
  const customer = useCustomer();
  const bookings = useBookings();
  const sent = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (sent.current === null) sent.current = loadSent();
    const tick = () => {
      const mine = workerId
        ? bookings.filter((b) => b.workerId === workerId)
        : bookings.filter((b) => (customer ? b.customerId === customer.id : !b.customerId));
      for (const b of mine) {
        const due = dueReminder(b, sent.current!, new Date(), workerId ? "w" : "c");
        if (!due) continue;
        sent.current!.add(due.key);
        try {
          window.localStorage.setItem(SENT_KEY, JSON.stringify([...sent.current!]));
        } catch {
          /* ignore */
        }
        const worker = getWorker(b.workerId);
        if (workerId) {
          notify(
            "⏰ Job coming up · ജോലി വരുന്നു",
            `${b.subService} at ${b.address ?? "the customer's place"} — ${due.when}.`,
            "/worker",
          );
        } else {
          notify(
            "⏰ Upcoming booking",
            `${b.subService} with ${worker?.name.split(" ")[0] ?? b.workerName.split(" ")[0]} — ${due.when}.`,
            "/app/bookings",
          );
        }
      }
    };
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [bookings, customer, workerId]);

  return null;
}
