import type { Booking, Quote, StateId, Worker } from "./types";
import { BASE_MINUTES, meteredQuote } from "./metered";
import { noShowPatch, noShowGraceLapsed } from "./no-show";
import { workRemains } from "./job-report";
import { billingNature } from "./price-model";
import { initialDispatch } from "./dispatch";
import { shortId } from "./format";

/**
 * "Get someone else to finish it."
 *
 * A worker opened the wall, found he needed a part, agreed to come back
 * tomorrow — and didn't. Until now the customer's only way out was to end the
 * job, which returned their money and left them exactly where they started:
 * with a hole in the wall and nobody coming. Ending a job is not the same as
 * getting it finished.
 *
 * So the job carries on with somebody else, and three things travel with it:
 *
 *  1. **The report.** What was already done, what is left, which part is
 *     needed, and the photographs. The next worker starts from a real handover
 *     instead of a blank page and a confused customer explaining plumbing.
 *  2. **The bill so far.** The first worker is paid for the minutes they truly
 *     worked and not one more; the customer is refunded the rest. That is
 *     exactly what the no-show settlement already does, so this reuses it
 *     rather than inventing a second opinion about the same money.
 *  3. **The base hour.** The customer bought it once. They do not buy it
 *     again — the second visit bills from its first minute, because a
 *     customer should not pay twice for a trip they didn't cause.
 *
 * And the worker who comes to finish is still guaranteed the base hour for
 * that trip. The two promises together cost more than either visit collects,
 * and the difference is KAAM's to pay. That is the right way round: the
 * platform sent someone who didn't come back, so the platform carries the bill
 * for putting it right. A customer made to pay for it would not book again,
 * and a worker made to absorb it would never take the second job.
 */

/**
 * Can this job be handed to someone else?
 *
 * The same threshold as ending it, on purpose: the point at which a customer
 * is allowed to give up on a worker is one decision, and it should not be two
 * different numbers depending on which button they reach for.
 */
export function handoverAvailable(
  booking: Pick<
    Booking,
    "categoryId" | "status" | "pausedAt" | "schedule" | "handedTo" | "report"
  >,
  now: Date = new Date(),
): boolean {
  if (billingNature(booking.categoryId) !== "metered") return false;
  // Handed on once already — the new job is the live one now.
  if (booking.handedTo) return false;
  // A report that says nothing is left means there is nothing to hand over.
  // No report at all is not the same claim: a worker who walked away often
  // never wrote one, and that is precisely when a handover is needed.
  if (booking.report && !workRemains(booking.report)) return false;
  return noShowGraceLapsed(booking, now);
}

/**
 * The price of finishing someone else's job.
 *
 * Every customer-facing figure is zero: nothing is collected up front, and the
 * settlement at the end bills the minutes actually worked from the first one —
 * see `settleBooking`, which waives the base-hour minimum for a handover.
 *
 * `workerPayout` is not zero, and that is the whole promise. It holds the base
 * hour, so a worker reading the offer sees what the trip is worth before they
 * accept, and `settleBooking` treats it as the floor beneath whatever the
 * minutes come to. A twenty-minute finish still pays the trip.
 *
 * No surge, ever. Charging a premium to repair KAAM's own failure is not a
 * price, it is a penalty pointed at the wrong person.
 */
export function handoverQuote(rate: number, stateId: StateId): Quote {
  const trip = meteredQuote(rate, BASE_MINUTES, false, stateId);
  return {
    serviceAmount: 0,
    surgeApplied: false,
    gst: 0,
    cess: 0,
    totalUserPays: 0,
    platformFee: 0,
    tds: 0,
    workerPayout: trip.workerPayout,
  };
}

/** A fresh 4-digit start code (never leading zero, so it stays 4 digits). */
function makeStartCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * The booking that carries on the abandoned one.
 *
 * Offered to a named worker like any other job, because KAAM does not hand a
 * customer's home to a stranger of its own choosing — the customer asked for
 * someone else, and this is who is nearest and free. If they decline, it
 * cascades exactly as a normal request does.
 */
export function handoverFrom(
  original: Booking,
  next: Pick<Worker, "id" | "name" | "rate">,
  now: Date = new Date(),
): Booking {
  return {
    ...original,
    id: `bk-${shortId()}`,
    workerId: next.id,
    workerName: next.name,
    status: "requested",
    createdAt: now.toISOString(),
    handoverOf: original.id,
    handedTo: undefined,
    quote: handoverQuote(next.rate, original.stateId),
    // Pre-confirmed with nothing collected: the job can start immediately and
    // the whole bill lands at the end, on the minutes actually worked.
    payment: {
      timing: "base_then_settle",
      paidNow: 0,
      dueOnAccept: 0,
      balanceDue: 0,
      confirmedAt: now.toISOString(),
    },
    // The point of the exercise: the next worker reads what the last one did.
    report: original.report,
    // A new code for a new visit. The old one was read out to someone else.
    startCode: makeStartCode(),
    dispatch: initialDispatch(now, original),
    // A fresh visit carries none of the first one's history.
    startedAt: undefined,
    completedAt: undefined,
    pausedAt: undefined,
    bankedMs: undefined,
    dayBaselineMs: undefined,
    settlement: undefined,
    completion: undefined,
    reschedule: undefined,
    rescheduleCount: undefined,
    rating: undefined,
    customerRating: undefined,
    cancelReason: undefined,
    calloutPay: undefined,
    warrantyUsedAt: undefined,
    revisitOf: undefined,
    revisitReason: undefined,
    tip: undefined,
    tipPaidAt: undefined,
    schedule: { when: "asap" },
  };
}

/**
 * Close the abandoned job and point it at its successor.
 *
 * The money is the no-show settlement unchanged — the first worker keeps the
 * minutes they worked, the customer gets the rest back. Only the story
 * differs, and it should: "handed to someone else to finish" is a different
 * thing to read six months later than "cancelled", and the record ought to say
 * which one happened.
 */
export function handoverPatch(
  booking: Booking,
  successorId: string,
  now: Date = new Date(),
  worker?: Pick<Worker, "unit" | "rate">,
): Partial<Booking> {
  return {
    ...noShowPatch(booking, now, worker),
    cancelReason: "Worker did not return — the rest of the work was handed to another worker",
    handedTo: successorId,
  };
}
