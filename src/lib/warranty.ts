import type { Booking, Quote } from "./types";
import { billingNature } from "./price-model";
import { shortId } from "./format";

/**
 * If the same fault comes back, someone comes back — free.
 *
 * This is the promise that makes a repair marketplace worth using. Nobody
 * tells a friend about a platform because the paperwork was tidy; they tell a
 * friend because the tap started leaking again on Thursday and it was fixed on
 * Friday for nothing.
 *
 * Two rules make it fair rather than ruinous:
 *
 *  1. **The same fault, not a new one.** A revisit is linked to the job it
 *     repeats. A different problem is a different booking at the normal price.
 *  2. **KAAM pays, not the worker.** The customer pays ₹0; the worker earns
 *     their normal payout. A warranty the worker funds is unpaid labour, and
 *     the predictable result is that good workers stop taking hard jobs. A
 *     warranty KAAM funds makes a worker take the difficult repair and do it
 *     properly, because a redo costs the platform and the platform ranks the
 *     workers who don't need them.
 *
 * One free revisit per job, so a chain of revisits cannot bill KAAM forever —
 * a second recurrence is a conversation with support, not an automatic third
 * visit.
 */

/** Shipped window. Owner-editable via settings — see `WARRANTY_LIMITS`. */
export const DEFAULT_WARRANTY_DAYS = 7;

/** Only the trades that repair things can have a repair come back. */
export function warrantyApplies(booking: Pick<Booking, "categoryId" | "status">): boolean {
  return booking.status === "completed" && billingNature(booking.categoryId) === "metered";
}

/** When the window shuts. Null when this job never had one. */
export function warrantyEndsAt(
  booking: Pick<Booking, "categoryId" | "status" | "completedAt" | "createdAt">,
  days: number,
  ): Date | null {
  if (!warrantyApplies(booking)) return null;
  const from = booking.completedAt ?? booking.createdAt;
  const end = new Date(from);
  if (Number.isNaN(end.getTime())) return null;
  end.setDate(end.getDate() + days);
  return end;
}

/** Whole days left, floored at zero. */
export function warrantyDaysLeft(
  booking: Pick<Booking, "categoryId" | "status" | "completedAt" | "createdAt">,
  days: number,
  now: Date = new Date(),
): number {
  const end = warrantyEndsAt(booking, days);
  if (!end) return 0;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

/**
 * Can this job still be brought back free?
 *
 * False once it has been used: the first recurrence is covered automatically,
 * a second is a conversation with support rather than an endless free visit.
 */
export function warrantyOpen(
  booking: Pick<
    Booking,
    "categoryId" | "status" | "completedAt" | "createdAt" | "warrantyUsedAt" | "revisitOf"
  >,
  days: number,
  now: Date = new Date(),
): boolean {
  if (booking.warrantyUsedAt) return false;
  // A revisit does not itself carry a fresh warranty, or the chain never ends.
  if (booking.revisitOf) return false;
  const end = warrantyEndsAt(booking, days);
  return Boolean(end && now.getTime() <= end.getTime());
}

/**
 * The revisit's price: nothing to the customer, the usual payout to the worker.
 *
 * Everything KAAM would normally take is zero — no commission, no GST on a
 * charge that isn't made. The worker's payout is unchanged, which is the whole
 * point: the platform absorbs the cost of its own promise.
 *
 * `serviceAmount` is zero too, so a free revisit never inflates GMV. The books
 * then read exactly what happened: a payout with no revenue against it.
 */
export function revisitQuote(original: Quote): Quote {
  return {
    serviceAmount: 0,
    surgeApplied: false,
    gst: 0,
    cess: 0,
    totalUserPays: 0,
    platformFee: 0,
    tds: 0,
    workerPayout: original.workerPayout,
  };
}

/**
 * A new booking that repeats an old one, free.
 *
 * Offered to the original worker first — they know the fault, the house and
 * what they already did — but it is an ordinary offer, so if they decline it
 * dispatches onward like any other job.
 */
export function revisitFrom(
  original: Booking,
  reason: string,
  now: Date = new Date(),
): Booking {
  return {
    ...original,
    id: `bk-${shortId()}`,
    status: "requested",
    createdAt: now.toISOString(),
    revisitOf: original.id,
    revisitReason: reason.trim() || undefined,
    quote: revisitQuote(original.quote),
    // Settled on creation: nothing is owed, so no payment step ever appears.
    payment: {
      timing: "base_then_settle",
      paidNow: 0,
      dueOnAccept: 0,
      balanceDue: 0,
      confirmedAt: now.toISOString(),
    },
    // A fresh visit: none of the first one's history comes along.
    startedAt: undefined,
    completedAt: undefined,
    pausedAt: undefined,
    bankedMs: undefined,
    dayBaselineMs: undefined,
    settlement: undefined,
    completion: undefined,
    reschedule: undefined,
    rescheduleCount: undefined,
    dispatch: undefined,
    rating: undefined,
    customerRating: undefined,
    calloutPay: undefined,
    warrantyUsedAt: undefined,
    tip: undefined,
    tipPaidAt: undefined,
    // The report of what was done last time travels with it — that is the
    // brief whoever attends is reading.
    report: undefined,
    schedule: { when: "asap" },
  };
}

/** Marks the original as spent, so the cover is used once. */
export function warrantyUsedPatch(now: Date = new Date()): Partial<Booking> {
  return { warrantyUsedAt: now.toISOString() };
}
