import { describe, expect, it } from "vitest";
import {
  awaitingCashConfirmation,
  cashClaimExpired,
  CASH_CONFIRM_MINUTES,
  claimCashPatch,
  completionDue,
  finalPaidPatch,
  needsFinalPayment,
  outstandingBalance,
} from "../payment-policy";
import type { Booking, BookingPayment } from "../types";

const T0 = new Date("2026-07-25T10:00:00Z");

function booking(payment: Partial<BookingPayment>, over: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    workerId: "w1",
    workerName: "Rahul Sharma",
    categoryId: "elec",
    subService: "Fan Repair",
    tenureId: "hr",
    stateId: "KL",
    quote: {
      serviceAmount: 700, surgeApplied: false, gst: 126, cess: 0,
      totalUserPays: 826, platformFee: 105, tds: 7, workerPayout: 588,
    },
    paymentMethod: "gpay",
    status: "completed",
    startCode: "1234",
    createdAt: T0.toISOString(),
    completedAt: T0.toISOString(),
    payment: {
      timing: "base_then_settle",
      paidNow: 289,
      balanceDue: 0,
      ...payment,
    },
    ...over,
  } as Booking;
}

describe("overtime is money the customer still owes", () => {
  it("a finished job with extra minutes is outstanding until it is paid", () => {
    const b = booking({ balanceDue: 537 });
    expect(outstandingBalance(b)).toBe(537);
    expect(needsFinalPayment(b)).toBe(true);
  });

  it("is settled only once balancePaidAt is stamped", () => {
    const b = booking({ balanceDue: 537, balancePaidAt: T0.toISOString() });
    expect(outstandingBalance(b)).toBe(0);
    expect(needsFinalPayment(b)).toBe(false);
  });

  it("never chases a job that finished inside the base hour", () => {
    expect(needsFinalPayment(booking({ balanceDue: 0 }))).toBe(false);
  });

  it("never blocks a job that is still running", () => {
    const running = booking({ balanceDue: 537 }, { status: "in_progress" });
    expect(outstandingBalance(running)).toBe(0);
    expect(needsFinalPayment(running)).toBe(false);
  });

  it("a cancelled job is never chased for a balance", () => {
    expect(needsFinalPayment(booking({ balanceDue: 537 }, { status: "cancelled" }))).toBe(false);
  });

  it("cash jobs owe the whole amount at completion", () => {
    const b = booking({ paidNow: 0, balanceDue: 826 }, { paymentMethod: "cash" });
    expect(outstandingBalance(b)).toBe(826);
  });
});

describe("paying clears the debt exactly once", () => {
  it("moves the balance into paidNow and stamps the time", () => {
    const b = booking({ paidNow: 289, balanceDue: 537 });
    const { payment } = finalPaidPatch(b, T0);
    expect(payment.paidNow).toBe(826); // 289 base hour + 537 overtime
    expect(payment.balanceDue).toBe(0);
    expect(payment.balancePaidAt).toBe(T0.toISOString());
  });

  it("the total collected matches what the invoice says", () => {
    const b = booking({ paidNow: 289, balanceDue: 537 });
    const { payment } = finalPaidPatch(b, T0);
    expect(payment.paidNow).toBe(b.quote.totalUserPays);
  });

  it("a paid job is no longer outstanding, so the gate closes", () => {
    const b = booking({ paidNow: 289, balanceDue: 537 });
    const paid = { ...b, payment: finalPaidPatch(b, T0).payment };
    expect(needsFinalPayment(paid)).toBe(false);
    expect(outstandingBalance(paid)).toBe(0);
  });

  it("completionDue still adds the metered extra onto the advance balance", () => {
    expect(completionDue(booking({ balanceDue: 100 }), 537)).toBe(637);
  });
});

describe("cash needs both sides to agree it changed hands", () => {
  const cashJob = () =>
    booking({ paidNow: 0, balanceDue: 826 }, { paymentMethod: "cash" });

  it("the customer's word alone does not settle the job", () => {
    const claimed = { ...cashJob(), payment: claimCashPatch(cashJob(), T0).payment };
    expect(claimed.payment!.balancePaidAt).toBeUndefined();
    expect(outstandingBalance(claimed)).toBe(826);
    expect(awaitingCashConfirmation(claimed)).toBe(true);
  });

  it("but it does stop the customer being chased again", () => {
    const claimed = { ...cashJob(), payment: claimCashPatch(cashJob(), T0).payment };
    // The final-payment gate skips anything awaiting the worker's word.
    expect(needsFinalPayment(claimed) && !awaitingCashConfirmation(claimed)).toBe(false);
  });

  it("the worker's confirmation is what actually settles it", () => {
    const claimed = { ...cashJob(), payment: claimCashPatch(cashJob(), T0).payment };
    const settled = { ...claimed, payment: finalPaidPatch(claimed, T0).payment };
    expect(settled.payment!.balancePaidAt).toBe(T0.toISOString());
    expect(outstandingBalance(settled)).toBe(0);
    expect(awaitingCashConfirmation(settled)).toBe(false);
  });

  it("an unclaimed cash job is not waiting on the worker", () => {
    expect(awaitingCashConfirmation(cashJob())).toBe(false);
  });

  it("an unanswered claim expires so earnings are never stuck", () => {
    const claimed = { ...cashJob(), payment: claimCashPatch(cashJob(), T0).payment };
    const later = new Date(T0.getTime() + CASH_CONFIRM_MINUTES * 60_000);
    expect(cashClaimExpired(claimed, T0)).toBe(false);
    expect(cashClaimExpired(claimed, later)).toBe(true);
  });

  it("a settled job never expires again", () => {
    const claimed = { ...cashJob(), payment: claimCashPatch(cashJob(), T0).payment };
    const settled = { ...claimed, payment: finalPaidPatch(claimed, T0).payment };
    const later = new Date(T0.getTime() + CASH_CONFIRM_MINUTES * 60_000);
    expect(cashClaimExpired(settled, later)).toBe(false);
  });
});
