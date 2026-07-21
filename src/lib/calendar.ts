import type { Booking } from "./types";
import { scheduledAt } from "./reminders";

/**
 * "Add to calendar" for scheduled bookings — so a KAAM appointment lands in
 * the customer's own calendar with its own reminder, the way every booking
 * app offers. Pure link generation, unit-tested. Returns null for ASAP jobs
 * (nothing to schedule).
 */

/** Default block length when we can't infer one. */
const DEFAULT_DURATION_MIN = 60;

/** Local floating time as YYYYMMDDTHHMMSS (calendar apps localise it). */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

/** A Google Calendar "add event" URL for a scheduled booking, or null. */
export function googleCalendarUrl(booking: Booking, durationMin = DEFAULT_DURATION_MIN): string | null {
  const at = scheduledAt(booking);
  if (at === null) return null;
  const start = new Date(at);
  const end = new Date(at + durationMin * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `KAAM: ${booking.subService} with ${booking.workerName}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: "Your KAAM booking. Track it live and chat with your worker in the app.",
    location: booking.address ?? "Kerala",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
