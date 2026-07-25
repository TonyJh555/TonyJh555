import { describe, expect, it } from "vitest";
import {
  acceptPatch,
  awaitingCustomerAction,
  confirmPatch,
  policyFor,
  readyToStart,
  splitPayment,
} from "../payment-policy";
import type { Booking } from "../types";

const T0 = new Date("2026-07-25T10:00:00Z");
const repair = policyFor("elec", "hr");

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1", workerId: "w1", workerName: "Tijo Antony", categoryId: "elec",
    subService: "Fan Repair", tenureId: "hr", stateId: "KL",
    quote: { serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0, totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420 },
    paymentMethod: "gpay", status: "accepted", startCode: "7201",
    createdAt: T0.toISOString(),
    payment: splitPayment(590, repair, "gpay"),
    ...over,
  } as Booking;
}

describe("nothing starts before the customer has settled up", () => {
  it("an accepted-but-unpaid job is waiting on the customer", () => {
    expect(awaitingCustomerAction(booking())).toBe(true);
    expect(readyToStart(booking())).toBe(false);
  });

  it("a cash job waits too — the price still has to be agreed", () => {
    const cash = booking({ paymentMethod: "cash", payment: splitPayment(590, repair, "cash") });
    expect(awaitingCustomerAction(cash)).toBe(true);
    expect(readyToStart(cash)).toBe(false);
  });

  it("paying releases the job, and only then", () => {
    const accepted = booking({ ...acceptPatch(booking(), T0)! });
    const paid = booking({ ...confirmPatch(accepted, T0) });
    expect(awaitingCustomerAction(paid)).toBe(false);
    expect(readyToStart(paid)).toBe(true);
  });

  it("a request nobody has accepted yet is not asking for money", () => {
    expect(awaitingCustomerAction(booking({ status: "requested" }))).toBe(false);
    expect(readyToStart(booking({ status: "requested" }))).toBe(false);
  });

  it("a running job stays released — payment already happened", () => {
    const paid = booking({ ...confirmPatch(booking(), T0), status: "in_progress" });
    expect(readyToStart(paid)).toBe(true);
  });

  it("legacy bookings with no payment record aren't stranded", () => {
    expect(readyToStart(booking({ payment: undefined }))).toBe(true);
  });
});

describe("the price is reviewed and discounted after acceptance, not before", () => {
  it("a plain payment collects exactly what was due", () => {
    const { payment } = confirmPatch(booking(), T0);
    expect(payment.paidNow).toBe(590);
    expect(payment.confirmedAt).toBe(T0.toISOString());
    expect(payment.confirmBy).toBeUndefined();
  });

  it("Plus, coupon and KAAM Cash all come off what is charged", () => {
    const { payment } = confirmPatch(booking(), T0, {
      memberDiscount: 59, couponCode: "KAAM100", couponDiscount: 100, walletApplied: 50,
    });
    expect(payment.paidNow).toBe(590 - 59 - 100 - 50);
    expect(payment.couponCode).toBe("KAAM100");
  });

  it("discounts bigger than the bill charge zero, never a negative", () => {
    const { payment } = confirmPatch(booking(), T0, { walletApplied: 5000 });
    expect(payment.paidNow).toBe(0);
  });

  it("a discount never turns into an outstanding balance", () => {
    const { payment } = confirmPatch(booking(), T0, { couponDiscount: 200 });
    expect(payment.balanceDue).toBe(0);
  });

  it("the deductions are recorded, so the invoice can show them", () => {
    const { payment } = confirmPatch(booking(), T0, { memberDiscount: 59, walletApplied: 20 });
    expect(payment.memberDiscount).toBe(59);
    expect(payment.walletApplied).toBe(20);
  });
});
