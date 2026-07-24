import { describe, expect, it } from "vitest";
import {
  acceptPatch,
  awaitingConfirmation,
  confirmPatch,
  confirmSecondsLeft,
  confirmWindowLapsed,
  CONFIRM_WINDOW_SECONDS,
  policyFor,
  splitPayment,
} from "../payment-policy";
import type { Booking } from "../types";

const T0 = new Date("2026-07-24T10:00:00Z");
const at = (sec: number) => new Date(T0.getTime() + sec * 1000);

const repairPolicy = policyFor("elec", "hr"); // base_then_settle, upfrontShare 1

describe("no money is taken at booking time", () => {
  it("charges nothing upfront and defers the base hour to acceptance", () => {
    const p = splitPayment(708, repairPolicy, "gpay");
    expect(p.paidNow).toBe(0); // ← the fix: nothing charged before a worker commits
    expect(p.dueOnAccept).toBe(708);
    expect(p.balanceDue).toBe(0);
  });

  it("keeps an event advance deferred too (30% due on accept, rest after)", () => {
    const p = splitPayment(1000, policyFor("violin", "hr"), "gpay");
    expect(p.paidNow).toBe(0);
    expect(p.dueOnAccept).toBe(300);
    expect(p.balanceDue).toBe(700);
  });

  it("cash still owes everything at completion, nothing on accept", () => {
    const p = splitPayment(708, repairPolicy, "cash");
    expect(p.paidNow).toBe(0);
    expect(p.dueOnAccept).toBe(0);
    expect(p.balanceDue).toBe(708);
  });
});

function booking(over: Partial<Booking> = {}): Booking {
  return {
    status: "accepted",
    payment: splitPayment(708, repairPolicy, "gpay"),
    ...over,
  } as Booking;
}

describe("pay-to-confirm window", () => {
  it("a just-accepted unpaid job is awaiting confirmation", () => {
    expect(awaitingConfirmation(booking())).toBe(true);
  });

  it("a still-requested job is not awaiting confirmation", () => {
    expect(awaitingConfirmation(booking({ status: "requested" }))).toBe(false);
  });

  it("a cash job never waits on payment to start", () => {
    expect(awaitingConfirmation(booking({ payment: splitPayment(708, repairPolicy, "cash") }))).toBe(false);
  });

  it("acceptance starts a 2-minute clock", () => {
    const patch = acceptPatch(booking(), T0)!;
    expect(CONFIRM_WINDOW_SECONDS).toBe(120);
    expect(confirmSecondsLeft({ payment: patch.payment }, T0)).toBe(120);
    expect(confirmSecondsLeft({ payment: patch.payment }, at(90))).toBe(30);
  });

  it("lapses once the window runs out, so the job can return to the queue", () => {
    const b = booking({ ...acceptPatch(booking(), T0)! });
    expect(confirmWindowLapsed(b, at(119))).toBe(false);
    expect(confirmWindowLapsed(b, at(120))).toBe(true);
  });

  it("paying collects the money, locks the job in and stops the clock", () => {
    const accepted = booking({ ...acceptPatch(booking(), T0)! });
    const paid = booking({ ...confirmPatch(accepted, at(30)) });
    expect(paid.payment!.paidNow).toBe(708); // money moves only now
    expect(paid.payment!.confirmedAt).toBe(at(30).toISOString());
    expect(paid.payment!.confirmBy).toBeUndefined();
    expect(awaitingConfirmation(paid)).toBe(false);
    expect(confirmWindowLapsed(paid, at(600))).toBe(false); // paid jobs never lapse
  });
});
