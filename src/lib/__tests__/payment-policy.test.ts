import { describe, expect, it } from "vitest";
import { ADVANCE_SHARE, cancelRefund, completionDue, policyFor, splitPayment } from "../payment-policy";
import type { Booking } from "../types";

describe("policyFor — payment timing follows the behaviour of the work", () => {
  it("metered repair jobs: base hour mandatory at booking, extras settle after", () => {
    for (const cat of ["elec", "plumb", "ac", "mech"] as const) {
      const p = policyFor(cat, "hr");
      expect(p.timing).toBe("base_then_settle");
      expect(p.upfrontShare).toBe(1); // the whole base hour — no free call-outs
    }
  });

  it("all one-off non-repair work takes a 30% advance (events AND fixed visits)", () => {
    // events & performances
    expect(policyFor("violin", "hr").timing).toBe("advance_then_balance");
    expect(policyFor("photo", "day").upfrontShare).toBe(ADVANCE_SHARE);
    expect(policyFor("catering", "hd").timing).toBe("advance_then_balance");
    // fixed visits — cleaner, beautician, yoga, driver: advance now, not prepay
    expect(policyFor("clean", "day").timing).toBe("advance_then_balance");
    expect(policyFor("beauty", "hr").timing).toBe("advance_then_balance");
    expect(policyFor("driver", "hr").timing).toBe("advance_then_balance");
    // day-rate maintenance isn't the metered hour → advance too
    expect(policyFor("painter", "day").timing).toBe("advance_then_balance");
  });

  it("care & health, and any weekly/monthly plan, stay prepaid commitments", () => {
    expect(policyFor("nurse", "hr").timing).toBe("full_prepay");
    expect(policyFor("nurse", "mo").timing).toBe("full_prepay");
    expect(policyFor("maid", "day").timing).toBe("full_prepay"); // care group
    expect(policyFor("violin", "mo").timing).toBe("full_prepay"); // monthly lessons ≠ gig
    expect(policyFor("clean", "mo").timing).toBe("full_prepay"); // monthly plan
  });
});

describe("splitPayment", () => {
  // Money never moves at booking time — the upfront share is collected only
  // once a worker accepts (see pay-on-accept.test.ts).
  it("splits a one-off advance booking 30/70, with the 30% due on accept", () => {
    const p = splitPayment(10000, policyFor("violin", "hr"), "upi");
    expect(p.paidNow).toBe(0);
    expect(p.dueOnAccept).toBe(3000);
    expect(p.balanceDue).toBe(7000);
  });

  it("defers the full base hour for repairs to acceptance", () => {
    const p = splitPayment(590, policyFor("elec", "hr"), "upi");
    expect(p.paidNow).toBe(0);
    expect(p.dueOnAccept).toBe(590);
    expect(p.balanceDue).toBe(0);
  });

  it("cash means everything is payable at completion", () => {
    const p = splitPayment(590, policyFor("elec", "hr"), "cash");
    expect(p.paidNow).toBe(0);
    expect(p.balanceDue).toBe(590);
  });
});

describe("cancelRefund — the non-refundable-after-accept guardrail", () => {
  const repair = {
    status: "requested",
    paymentMethod: "upi",
    payment: { timing: "base_then_settle", paidNow: 590, balanceDue: 0 },
    quote: { totalUserPays: 590 },
  } as Booking;

  it("is fully refundable before a worker accepts", () => {
    const r = cancelRefund(repair);
    expect(r.amount).toBe(590);
    expect(r.forfeited).toBe(false);
  });

  it("forfeits the base hour once a worker has accepted", () => {
    const r = cancelRefund({ ...repair, status: "accepted" } as Booking);
    expect(r.amount).toBe(0);
    expect(r.forfeited).toBe(true);
    expect(r.reason).toContain("base hour");
  });

  it("forfeits the advance (not the full value) once an event is accepted", () => {
    const event = {
      status: "accepted",
      paymentMethod: "upi",
      payment: { timing: "advance_then_balance", paidNow: 3000, balanceDue: 7000 },
      quote: { totalUserPays: 10000 },
    } as Booking;
    const r = cancelRefund(event);
    expect(r.amount).toBe(0);
    expect(r.forfeited).toBe(true);
    expect(r.reason).toContain("advance");
  });

  it("has nothing to refund for cash bookings", () => {
    const r = cancelRefund({ ...repair, paymentMethod: "cash" } as Booking);
    expect(r.amount).toBe(0);
    expect(r.forfeited).toBe(false);
  });
});

describe("completionDue", () => {
  it("adds the metered extra to any advance balance", () => {
    const booking = {
      payment: { timing: "advance_then_balance", paidNow: 3000, balanceDue: 7000 },
    } as Booking;
    expect(completionDue(booking, 94)).toBe(7094);
    expect(completionDue({} as Booking, 94)).toBe(94);
    expect(completionDue({} as Booking)).toBe(0);
  });
});
