import type { Booking } from "./types";

/**
 * Scheduled-booking reminders — nobody should forget an appointment. For a
 * booking scheduled at a future date/time we nudge the customer ahead of it
 * (a day before, and an hour before), exactly once each. Pure and tested;
 * the reminder engine component applies the result.
 */

/** Minutes-before marks at which we remind. Larger first. */
export const REMINDER_WINDOWS = [24 * 60, 60] as const;

/** Milliseconds timestamp of a booking's scheduled start, or null for ASAP. */
export function scheduledAt(booking: Pick<Booking, "schedule">): number | null {
  const s = booking.schedule;
  if (!s || s.when !== "scheduled") return null;
  const t = new Date(`${s.date}T${s.time}:00`).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Whole minutes until the scheduled start (negative once it's passed). */
export function minutesUntil(booking: Pick<Booking, "schedule">, now: Date = new Date()): number | null {
  const at = scheduledAt(booking);
  if (at === null) return null;
  return Math.round((at - now.getTime()) / 60_000);
}

export interface DueReminder {
  bookingId: string;
  /** The window (minutes-before) this reminder fires for. */
  window: number;
  /** Dedup key so each window fires once. */
  key: string;
  /** Human phrase: "in about an hour" / "tomorrow". */
  when: string;
}

/**
 * The reminder (if any) that should fire now for a scheduled booking: the
 * tightest window it has entered but not yet been reminded for. Returns null
 * for ASAP jobs, non-upcoming jobs, or ones already reminded at that window.
 */
export function dueReminder(
  booking: Pick<Booking, "id" | "schedule" | "status">,
  sent: Set<string>,
  now: Date = new Date(),
  /** Which side is being reminded — keeps the two sides' dedup keys apart. */
  side: "c" | "w" = "c",
): DueReminder | null {
  // A mid-job reschedule (worker went for parts, returns tomorrow at 10) keeps
  // the job `in_progress` with a future scheduled time. That job needs the
  // hour-before nudge more than any other — both sides have to show up again.
  const upcoming =
    booking.status === "accepted" ||
    booking.status === "requested" ||
    booking.status === "in_progress";
  if (!upcoming) return null;
  const mins = minutesUntil(booking, now);
  if (mins === null || mins < 0) return null;

  // The tightest window the job has entered is the only one that should fire
  // now — never fall back to a looser one whose moment has already passed.
  const activeWindow = [...REMINDER_WINDOWS].sort((a, b) => a - b).find((w) => mins <= w);
  if (activeWindow === undefined) return null;

  const key = `${side}:${booking.id}:${activeWindow}`;
  if (sent.has(key)) return null;
  return {
    bookingId: booking.id,
    window: activeWindow,
    key,
    when: activeWindow <= 60 ? "in about an hour" : "tomorrow",
  };
}

/** Upcoming scheduled bookings within `withinHours`, soonest first. */
export function upcomingBookings(
  bookings: Booking[],
  customerId: string | undefined,
  now: Date = new Date(),
  withinHours = 48,
): Booking[] {
  return bookings
    .filter((b) => {
      if (customerId ? b.customerId !== customerId : b.customerId) return false;
      if (b.status !== "accepted" && b.status !== "requested") return false;
      const m = minutesUntil(b, now);
      return m !== null && m >= 0 && m <= withinHours * 60;
    })
    .sort((a, b) => (scheduledAt(a) ?? 0) - (scheduledAt(b) ?? 0));
}
