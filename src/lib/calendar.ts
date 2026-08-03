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

/**
 * A Google Calendar "add event" URL for a scheduled booking, or null.
 *
 * The worker needs this more than the customer does. A customer waiting at
 * home on Sunday will remember; a worker with eleven jobs across three
 * districts is exactly the person who forgets a function booked six days out,
 * and a forgotten function is the worst failure this platform can have. App
 * reminders help, but they die with a cleared browser or a denied permission
 * — a calendar entry lives in the phone the worker already trusts.
 *
 * So the same event is written twice, from each side's point of view: the
 * customer's says who is coming, the worker's says where to be.
 */
export function googleCalendarUrl(
  booking: Booking,
  durationMin = DEFAULT_DURATION_MIN,
  viewer: "customer" | "worker" = "customer",
): string | null {
  const at = scheduledAt(booking);
  if (at === null) return null;
  const start = new Date(at);
  const end = new Date(at + durationMin * 60_000);
  const where = booking.address ?? "Kerala";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text:
      viewer === "worker"
        ? `KAAM job: ${booking.subService} · ${where}`
        : `KAAM: ${booking.subService} with ${booking.workerName}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details:
      viewer === "worker"
        ? `KAAM booking ${booking.id}. The customer is expecting you at this time — open the app for the address, the chat and the start code.`
        : "Your KAAM booking. Track it live and chat with your worker in the app.",
    location: where,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
