import { billingNature } from "./price-model";
import type { Booking, CategoryId, RescheduleRequest } from "./types";

/**
 * Mid-job pause-and-reschedule — the real-world "worker needs to buy parts and
 * come back" flow. Either side proposes a new time, the meter freezes (see
 * metered.ts pausePatch), and the OTHER side agrees by entering a 4-digit code.
 * Capped at 3 reschedules so a job can't drift forever.
 */
export const MAX_RESCHEDULES = 3;

/**
 * Only a job billed by the clock can be paused.
 *
 * Pausing exists for one situation: an electrician opens the wall, finds he
 * needs a part, and comes back tomorrow — and the meter must not run while he
 * is at the shop. That is a repair, and repairs are the only work KAAM bills
 * by the minute.
 *
 * Everywhere else the button was nonsense on the screen. A mehendi sitting, a
 * massage, a nurse's visit and a cook's function are all bought as a whole,
 * not by the clock, so there is no clock to stop and nothing a pause would
 * save anyone. Half-done work in those trades is a conversation, then either
 * finishing it or cancelling — never a job left open for three days with the
 * customer wondering what they are paying for.
 */
export function pausable(categoryId: CategoryId): boolean {
  return billingNature(categoryId) === "metered";
}

/** Whether a running job can still be paused & rescheduled. */
export function canReschedule(
  booking: Pick<Booking, "status" | "reschedule" | "rescheduleCount" | "categoryId">,
): boolean {
  return (
    pausable(booking.categoryId) &&
    booking.status === "in_progress" &&
    !booking.reschedule &&
    (booking.rescheduleCount ?? 0) < MAX_RESCHEDULES
  );
}

/** Reschedules still allowed for this job. */
export function reschedulesLeft(booking: Pick<Booking, "rescheduleCount">): number {
  return Math.max(0, MAX_RESCHEDULES - (booking.rescheduleCount ?? 0));
}

/** A fresh 4-digit reschedule code (never starts with 0, so it stays 4 digits). */
export function makeRescheduleCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Does the entered code match the pending request? (trims + exact match) */
export function codeMatches(req: RescheduleRequest | undefined, entered: string): boolean {
  return Boolean(req) && req!.code === entered.trim();
}

/** Whether `viewer` is the side that must approve (i.e. the one who didn't propose). */
export function awaitingApprovalFrom(
  req: RescheduleRequest | undefined,
  viewer: "customer" | "worker",
): boolean {
  return Boolean(req) && req!.by !== viewer;
}
