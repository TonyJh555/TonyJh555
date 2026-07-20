import { getCategory } from "@/data/categories";
import type { Booking, BookingPayment, CategoryId, TenureId } from "./types";

/**
 * Per-category payment timing — money at risk before the job always equals
 * the commitment the worker is making, never more:
 *
 * - Maintenance & repair (hourly, metered): the base hour is paid at
 *   booking — MANDATORY, so the worker's time and travel are covered and
 *   "it fixed itself on your way here" can't happen. Only the metered
 *   extra minutes settle after the job.
 * - Art & hospitality one-off gigs (weddings, events, shoots): 30%
 *   advance blocks the date; the balance is collected after the event.
 * - Care & health, lessons, monthly plans, and fixed one-visit jobs:
 *   prepaid as before — the price is known and the commitment is real.
 * - Cash always means everything is payable at completion (existing
 *   behaviour, unchanged).
 */

export type PaymentTiming = "full_prepay" | "base_then_settle" | "advance_then_balance";

export interface PaymentPolicy {
  timing: PaymentTiming;
  /** Fraction of the booking total due at booking time (0..1). */
  upfrontShare: number;
  /** Short checkout copy explaining the split. */
  note: string;
}

/** Advance share for event-type gigs (industry standard 30%). */
export const EVENT_ADVANCE_SHARE = 0.3;

export function policyFor(categoryId: CategoryId, tenureId: TenureId): PaymentPolicy {
  const group = getCategory(categoryId).group;
  if (group === "maintenance" && tenureId === "hr") {
    return {
      timing: "base_then_settle",
      upfrontShare: 1,
      note: "You pay the base hour now — it covers the worker's time and travel. Extra minutes (if any) are billed after the job at the per-minute rate.",
    };
  }
  if ((group === "art" || group === "hospitality") && (tenureId === "hr" || tenureId === "hd" || tenureId === "day")) {
    return {
      timing: "advance_then_balance",
      upfrontShare: EVENT_ADVANCE_SHARE,
      note: "30% advance blocks your date; the remaining balance is collected only after the event.",
    };
  }
  return {
    timing: "full_prepay",
    upfrontShare: 1,
    note: "Fixed price, paid upfront — nothing more to pay after the job.",
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
