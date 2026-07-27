import type { Booking, Worker } from "./types";
import { meteredQuote, workedMinutes } from "./metered";
import { isMetered } from "./metered";

/**
 * The worker agreed to come back — and didn't.
 *
 * A paused job is safe by construction: the meter only restarts when the
 * worker is standing there and the customer reads out their start code, so a
 * late worker costs the customer nothing and a no-show costs them nothing
 * either. Nothing auto-resumes, and it must not: a timer that restarted the
 * clock would bill somebody for an empty room.
 *
 * What was missing is the way out. A paused job had no deadline and no
 * ending, so a customer who was stood up could only "cancel" — which reads as
 * their fault and could forfeit the base hour to the very worker who never
 * turned up. This module gives that state an expiry and an honest settlement.
 *
 * Deliberately, there is NO code on the no-show path. A code proves presence;
 * "he never came" is a claim about absence, and it cannot be confirmed by a
 * 4-digit number held by the person who isn't there. Gating it behind an OTP
 * would make the button unusable by exactly the people who need it. The start
 * code still guards resume, where presence is the thing being proved.
 */

/**
 * How long past the agreed time before the customer is offered a way out.
 * Long enough that ordinary Kerala traffic or a delayed previous job isn't
 * treated as abandonment; short enough that nobody loses an afternoon.
 */
export const NO_SHOW_GRACE_MINUTES = 45;

/** The moment the worker agreed to return, or null if this isn't that case. */
export function resumeDueAt(
  booking: Pick<Booking, "status" | "pausedAt" | "schedule">,
): Date | null {
  if (booking.status !== "in_progress" || !booking.pausedAt) return null;
  const s = booking.schedule;
  if (!s || s.when !== "scheduled") return null;
  const at = new Date(`${s.date}T${s.time}`);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** Whole minutes the worker is now overdue (0 before the agreed time). */
export function minutesOverdue(
  booking: Pick<Booking, "status" | "pausedAt" | "schedule">,
  now: Date = new Date(),
): number {
  const due = resumeDueAt(booking);
  if (!due) return 0;
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 60_000));
}

/**
 * True once the customer should be offered the choice. Before this they are
 * simply told the worker is running late — being late is not abandonment.
 */
export function noShowGraceLapsed(
  booking: Pick<Booking, "status" | "pausedAt" | "schedule">,
  now: Date = new Date(),
): boolean {
  return resumeDueAt(booking) !== null && minutesOverdue(booking, now) >= NO_SHOW_GRACE_MINUTES;
}

export interface NoShowSettlement {
  /** Minutes actually worked before the pause — the only minutes billable. */
  workedMinutes: number;
  /** ₹ the customer is fairly charged for those minutes. */
  fairTotal: number;
  /** ₹ already collected. */
  collected: number;
  /** ₹ returned to the customer. */
  refund: number;
  /** ₹ the worker keeps for the minutes they really did work. */
  workerKeeps: number;
}

/**
 * What a no-show costs whom.
 *
 * The customer pays for the minutes actually worked and not one more. The
 * base hour is NOT forfeited here: that rule exists to protect a worker's
 * committed time and travel, and a worker who never came committed neither.
 * Charging it would be the same error as promising a refund that was never
 * collected — a number the company cannot justify out loud.
 */
export function noShowSettlement(
  booking: Booking,
  worker: Pick<Worker, "unit" | "rate"> | undefined,
): NoShowSettlement {
  const collected = booking.payment?.paidNow ?? 0;
  const minutes = workedMinutes(booking);

  // Non-metered work (per-visit, per-day) has no per-minute price to fall back
  // on, so an unfinished job simply returns what was taken.
  const fairTotal =
    worker && isMetered(booking, worker) && minutes > 0
      ? meteredQuote(worker.rate, minutes, booking.quote.surgeApplied, booking.stateId)
          .totalUserPays
      : 0;

  const charged = Math.min(collected, fairTotal);
  return {
    workedMinutes: minutes,
    fairTotal,
    collected,
    refund: Math.max(0, collected - charged),
    workerKeeps: charged,
  };
}

/**
 * Close a booking the worker abandoned. The status is `cancelled` rather than
 * `completed` because the work was never finished — a receipt that called this
 * a completed job would be a lie told in writing.
 */
export function noShowPatch(booking: Booking, now: Date = new Date()): Partial<Booking> {
  return {
    status: "cancelled",
    cancelReason: "Worker did not return for the rescheduled visit",
    completedAt: now.toISOString(),
    pausedAt: undefined,
    reschedule: undefined,
  };
}
