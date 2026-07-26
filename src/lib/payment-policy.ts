import { getCategory } from "@/data/categories";
import type { Booking, BookingPayment, CategoryId, TenureId } from "./types";

/**
 * Per-category payment timing — money at risk before the job always equals
 * the commitment the worker is making, and that commitment is only locked
 * once a worker actually accepts:
 *
 * - Maintenance & repair (hourly, metered): the base hour is paid at
 *   booking — it covers the worker's time and travel, and becomes
 *   non-refundable once a worker accepts, so "it fixed itself on your way
 *   here" can't happen. Only the metered extra minutes settle after.
 * - Everything else one-off (events, performances, fixed visits, day-rate):
 *   a 30% advance blocks the slot; the balance is collected after the job.
 * - Care & health and weekly/monthly plans: prepaid — a committed booking
 *   the worker plans their schedule around.
 * - Cash always means everything is payable at completion.
 *
 * Refundability (see `cancelRefund`): fully refundable before a worker
 * accepts; the upfront commitment is forfeited to the worker after
 * acceptance; and always fully refunded on a worker-side or
 * no-availability failure (handled where those happen).
 */

export type PaymentTiming = "full_prepay" | "base_then_settle" | "advance_then_balance";

export interface PaymentPolicy {
  timing: PaymentTiming;
  /** Fraction of the booking total due at booking time (0..1). */
  upfrontShare: number;
  /** Short checkout copy explaining the split. */
  note: string;
}

/** Advance share for one-off visits & event gigs (industry standard 30%). */
export const ADVANCE_SHARE = 0.3;

/** Weekly/monthly tenures represent a subscription-style commitment. */
const PLAN_TENURES = new Set<TenureId>(["wk", "mo", "3mo"]);

export function policyFor(categoryId: CategoryId, tenureId: TenureId): PaymentPolicy {
  const group = getCategory(categoryId).group;

  // 1. Repair & maintenance, hourly → metered base hour.
  if (group === "maintenance" && tenureId === "hr") {
    return {
      timing: "base_then_settle",
      upfrontShare: 1,
      note: "You pay the base hour now — it covers the worker's time and travel, and is non-refundable once a worker accepts. Extra minutes (if any) are billed after the job at the per-minute rate.",
    };
  }

  // 2. Care & health, and any weekly/monthly plan → prepaid commitment.
  if (group === "care" || PLAN_TENURES.has(tenureId)) {
    return {
      timing: "full_prepay",
      upfrontShare: 1,
      note: "Fixed price, paid upfront — a committed booking your worker plans their schedule around. Nothing more to pay after the job.",
    };
  }

  // 3. Everything else one-off (events, performances, fixed visits, day-rate)
  //    → advance blocks the slot; balance after.
  return {
    timing: "advance_then_balance",
    upfrontShare: ADVANCE_SHARE,
    note: `${Math.round(ADVANCE_SHARE * 100)}% advance blocks your slot; the balance is collected only after the job. The advance is non-refundable once a worker accepts.`,
  };
}

/** Split a payable total per policy. Cash pushes everything to completion. */
/**
 * How long the customer has to pay once a worker accepts. Past this the job
 * quietly returns to the dispatch queue — so a worker never travels for a
 * booking that was never paid for.
 */
export const CONFIRM_WINDOW_SECONDS = 300;

/**
 * Split a booking's money. **Nothing is charged at booking time**: a customer
 * should never pay before a worker has agreed to come. The upfront share
 * becomes `dueOnAccept`, collected the moment a worker accepts (see
 * `acceptPatch` / `confirmPatch`), and the remainder settles after the job.
 */
export function splitPayment(
  payable: number,
  policy: PaymentPolicy,
  paymentMethod: string,
): BookingPayment {
  if (paymentMethod === "cash") {
    return { timing: policy.timing, paidNow: 0, dueOnAccept: 0, balanceDue: payable };
  }
  const dueOnAccept = Math.round(payable * policy.upfrontShare);
  return {
    timing: policy.timing,
    paidNow: 0,
    dueOnAccept,
    balanceDue: payable - dueOnAccept,
  };
}

/**
 * The worker has accepted and the customer hasn't dealt with the money yet.
 *
 * This is the gate between "accepted" and "the worker sets off": until it
 * clears, the start code stays hidden and the job cannot begin. It covers
 * cash too — there is nothing to collect online, but the customer still has
 * to see the price and agree to it before a worker travels to them.
 */
export function awaitingCustomerAction(
  booking: Pick<Booking, "status" | "payment">,
): boolean {
  if (booking.status !== "accepted") return false;
  const p = booking.payment;
  // No payment record at all — an older booking from before money was tracked.
  // There is nothing to collect, so never ambush the customer with a ₹0
  // payment screen for it.
  if (!p) return false;
  // Likewise when the record exists but adds up to nothing owed.
  if ((p.dueOnAccept ?? 0) <= 0 && p.balanceDue <= 0) return false;
  return !p.confirmedAt;
}

/**
 * Everything the customer had to do is done, so the code can be shown and the
 * work can start. A booking with no payment record at all (legacy demo data)
 * is treated as settled rather than stranded.
 */
export function readyToStart(
  booking: Pick<Booking, "status" | "payment">,
): boolean {
  if (booking.status !== "accepted" && booking.status !== "in_progress") return false;
  if (!booking.payment) return true;
  return Boolean(booking.payment.confirmedAt);
}

/** Is this booking accepted but still waiting for the customer to pay? */
export function awaitingConfirmation(
  booking: Pick<Booking, "status" | "payment">,
): boolean {
  const p = booking.payment;
  return (
    booking.status === "accepted" &&
    (p?.dueOnAccept ?? 0) > 0 &&
    !p?.confirmedAt
  );
}

/** Seconds left to pay after acceptance (0 once the window has lapsed). */
export function confirmSecondsLeft(
  booking: Pick<Booking, "payment">,
  now: Date = new Date(),
): number {
  const by = booking.payment?.confirmBy;
  if (!by) return 0;
  return Math.max(0, Math.round((new Date(by).getTime() - now.getTime()) / 1000));
}

/**
 * Has the pay-to-confirm window run out on an unpaid accepted job?
 *
 * A booking with no `confirmBy` has no deadline, so it cannot have missed one.
 * Reading a missing deadline as an expired one would bounce the job back to
 * the queue the instant it was accepted, and the customer would never get the
 * chance to pay at all.
 */
export function confirmWindowLapsed(
  booking: Pick<Booking, "status" | "payment">,
  now: Date = new Date(),
): boolean {
  if (!booking.payment?.confirmBy) return false;
  return awaitingConfirmation(booking) && confirmSecondsLeft(booking, now) === 0;
}

/** Payment patch applied when a worker accepts: start the pay-to-confirm clock. */
export function acceptPatch(
  booking: Pick<Booking, "payment">,
  now: Date = new Date(),
): { payment: BookingPayment } | null {
  const p = booking.payment;
  if (!p || (p.dueOnAccept ?? 0) <= 0) return null;
  return {
    payment: {
      ...p,
      confirmBy: new Date(now.getTime() + CONFIRM_WINDOW_SECONDS * 1000).toISOString(),
    },
  };
}

/** Deductions the customer chose on the payment screen, after acceptance. */
export interface PayDeductions {
  memberDiscount?: number;
  couponCode?: string;
  couponDiscount?: number;
  walletApplied?: number;
}

/**
 * Payment patch when the customer pays to confirm — the job is locked in and
 * the start code is released. Discounts are applied here, not at booking
 * time, because the price is only reviewed once a worker has accepted.
 */
export function confirmPatch(
  booking: Pick<Booking, "payment">,
  now: Date = new Date(),
  deductions: PayDeductions = {},
): { payment: BookingPayment } {
  // Defensive: a booking that somehow reaches here without a payment record
  // still gets a valid one, rather than throwing mid-payment and stranding
  // the customer on a screen they can't leave.
  const p: BookingPayment = booking.payment ?? {
    timing: "full_prepay",
    paidNow: 0,
    balanceDue: 0,
  };
  const off =
    (deductions.memberDiscount ?? 0) +
    (deductions.couponDiscount ?? 0) +
    (deductions.walletApplied ?? 0);
  const due = p.dueOnAccept ?? 0;
  return {
    payment: {
      ...p,
      ...deductions,
      // Never charge below zero, and never let a discount create a balance.
      paidNow: Math.max(0, due - Math.min(off, due)),
      confirmedAt: now.toISOString(),
      confirmBy: undefined,
    },
  };
}

/** ₹ still to collect when the job completes (advance balance + metered extra). */
export function completionDue(booking: Pick<Booking, "payment">, meteredExtra = 0): number {
  return (booking.payment?.balanceDue ?? 0) + meteredExtra;
}

/**
 * ₹ the customer still owes on a finished job — the advance balance plus any
 * metered extra minutes. This is money that has NOT been collected: a job is
 * only settled once `balancePaidAt` is stamped, and that stamp belongs to the
 * moment payment actually happens, never to the moment the amount is worked
 * out. Returns 0 for anything already paid or still running.
 */
export function outstandingBalance(booking: Pick<Booking, "status" | "payment">): number {
  const p = booking.payment;
  if (!p || booking.status !== "completed" || p.balancePaidAt) return 0;
  return Math.max(0, p.balanceDue);
}

/** True when a finished job is holding the customer to a final payment. */
export function needsFinalPayment(booking: Pick<Booking, "status" | "payment">): boolean {
  return outstandingBalance(booking) > 0;
}

/**
 * How long a worker has to confirm they received cash before KAAM settles the
 * job on their behalf. Long enough for someone to finish their day and open
 * the app; short enough that nobody's earnings sit stuck.
 */
export const CASH_CONFIRM_MINUTES = 12 * 60;

/**
 * The customer says they paid in cash and the worker hasn't confirmed yet.
 *
 * Cash is the one payment KAAM cannot see. Letting the customer's tap settle
 * the job on its own makes "I paid him, honest" the end of the argument, so
 * the worker gets the final word — and the customer isn't chased again in the
 * meantime.
 */
export function awaitingCashConfirmation(
  booking: Pick<Booking, "status" | "payment">,
): boolean {
  return outstandingBalance(booking) > 0 && Boolean(booking.payment?.cashClaimedAt);
}

/** The customer's side of a cash handover: a claim, never a settlement. */
export function claimCashPatch(
  booking: Pick<Booking, "payment">,
  now: Date = new Date(),
): { payment: BookingPayment } {
  return { payment: { ...booking.payment!, cashClaimedAt: now.toISOString() } };
}

/** Has the worker's window to dispute a cash claim run out? */
export function cashClaimExpired(
  booking: Pick<Booking, "status" | "payment">,
  now: Date = new Date(),
): boolean {
  const at = booking.payment?.cashClaimedAt;
  if (!at || !awaitingCashConfirmation(booking)) return false;
  return now.getTime() - new Date(at).getTime() >= CASH_CONFIRM_MINUTES * 60_000;
}

/** Payment patch for the final collection — the only place `balancePaidAt` is set. */
export function finalPaidPatch(
  booking: Pick<Booking, "payment">,
  now: Date = new Date(),
): { payment: BookingPayment } {
  const p = booking.payment!;
  return {
    payment: {
      ...p,
      paidNow: p.paidNow + p.balanceDue,
      balanceDue: 0,
      balancePaidAt: now.toISOString(),
    },
  };
}

/** What an invoice must show: the gross, every deduction, and the real total. */
export interface InvoiceTotals {
  /** Service + GST + cess, before anything is taken off. */
  subtotal: number;
  memberDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  walletApplied: number;
  /** What the customer genuinely pays — the only figure that may be called "paid". */
  totalPaid: number;
}

/**
 * Invoice arithmetic. The booking's quote is the *list* price: it stays whole
 * so the worker's payout is never cut by a discount KAAM chose to give. What
 * the customer actually pays is the quote minus their Plus discount, coupon
 * and KAAM Cash — and an invoice that prints the quote as "total paid"
 * overstates it by exactly those deductions.
 */
export function invoiceTotals(booking: Pick<Booking, "quote" | "payment">): InvoiceTotals {
  const p = booking.payment;
  const subtotal = booking.quote.totalUserPays;
  const memberDiscount = p?.memberDiscount ?? 0;
  const couponDiscount = p?.couponDiscount ?? 0;
  const walletApplied = p?.walletApplied ?? 0;
  return {
    subtotal,
    memberDiscount,
    couponCode: p?.couponCode,
    couponDiscount,
    walletApplied,
    totalPaid: Math.max(0, subtotal - memberDiscount - couponDiscount - walletApplied),
  };
}

export interface CancelRefund {
  /** ₹ returned to the customer as KAAM Cash. */
  amount: number;
  /** True when the upfront commitment is kept by the worker. */
  forfeited: boolean;
  /** Plain-language explanation shown on the cancel sheet. */
  reason: string;
}

/**
 * Refund due when the CUSTOMER cancels. Free before a worker commits;
 * the upfront amount is forfeited to the worker afterwards (that's what it
 * protects). Worker-side failures refund fully and are handled elsewhere.
 */
export function cancelRefund(
  booking: Pick<Booking, "status" | "paymentMethod" | "payment" | "quote">,
): CancelRefund {
  const paidNow = booking.payment?.paidNow ?? booking.quote.totalUserPays;

  if (booking.paymentMethod === "cash") {
    return { amount: 0, forfeited: false, reason: "You hadn't paid yet — nothing to refund." };
  }
  // Free cancellation while no worker has accepted.
  //
  // A request is never charged — that is the whole point of asking the worker
  // first. So the amount refunded here is strictly what the payment record
  // says was taken, never the quote. Falling back to `quote.totalUserPays` (as
  // the legacy path below still does for older bookings) would credit KAAM
  // Cash with money that was never collected.
  if (booking.status === "requested") {
    const takenSoFar = booking.payment?.paidNow ?? 0;
    return {
      amount: takenSoFar,
      forfeited: false,
      reason: takenSoFar > 0
        ? "Free cancellation — no worker has accepted yet, so your full amount returns to KAAM Cash."
        : "Free cancellation — you haven't paid anything yet, so there's nothing to refund.",
    };
  }

  // Accepted, but the customer never completed the pay-to-confirm step: no
  // money was taken, so nothing can be forfeited. Saying otherwise frightens
  // a customer who is ₹0 out of pocket.
  if (paidNow <= 0) {
    return {
      amount: 0,
      forfeited: false,
      reason: "Nothing was charged for this booking, so there's nothing to refund.",
    };
  }
  // A worker has committed their time: the upfront amount is theirs.
  const label =
    booking.payment?.timing === "base_then_settle"
      ? "base hour"
      : booking.payment?.timing === "advance_then_balance"
        ? "advance"
        : "amount";
  return {
    amount: 0,
    forfeited: true,
    reason: `The ${label} is non-refundable now that a worker has committed their time and travel to you.`,
  };
}
