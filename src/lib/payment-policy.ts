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
export function splitPayment(
  payable: number,
  policy: PaymentPolicy,
  paymentMethod: string,
): BookingPayment {
  if (paymentMethod === "cash") {
    return { timing: policy.timing, paidNow: 0, balanceDue: payable };
  }
  const paidNow = Math.round(payable * policy.upfrontShare);
  return { timing: policy.timing, paidNow, balanceDue: payable - paidNow };
}

/** ₹ still to collect when the job completes (advance balance + metered extra). */
export function completionDue(booking: Pick<Booking, "payment">, meteredExtra = 0): number {
  return (booking.payment?.balanceDue ?? 0) + meteredExtra;
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
  if (booking.status === "requested") {
    return {
      amount: paidNow,
      forfeited: false,
      reason: "Free cancellation — no worker has accepted yet, so your full amount returns to KAAM Cash.",
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
