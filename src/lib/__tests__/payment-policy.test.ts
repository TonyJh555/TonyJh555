import { describe, expect, it } from "vitest";
import { completionDue, EVENT_ADVANCE_SHARE, policyFor, splitPayment } from "../payment-policy";
import type { Booking } from "../types";

describe("policyFor — payment timing follows the behaviour of the work", () => {
  it("metered repair jobs: base hour mandatory at booking, extras settle after", () => {
    for (const cat of ["elec", "plumb", "ac", "mech"] as const) {
      const p = policyFor(cat, "hr");
      expect(p.timing).toBe("base_then_settle");
      expect(p.upfrontShare).toBe(1); // the whole base hour — no free call-outs
    }
  });

  it("event gigs (weddings, shoots, catering): 30% advance blocks the date", () => {
    expect(policyFor("violin", "hr").timing).toBe("advance_then_balance");
    expect(policyFor("photo", "day").upfrontShare).toBe(EVENT_ADVANCE_SHARE);
    expect(policyFor("catering", "hd").timing).toBe("advance_then_balance");
  });

  it("care & health and lessons prepay — monthly commitments stay as they are", () => {
    expect(policyFor("nurse", "mo").timing).toBe("full_prepay");
    expect(policyFor("nurse", "hr").timing).toBe("full_prepay");
    expect(policyFor("violin", "mo").timing).toBe("full_prepay"); // lessons ≠ gigs
  });

  it("fixed one-visit and everyday jobs prepay", () => {
    expect(policyFor("clean", "day").timing).toBe("full_prepay");
    expect(policyFor("elec", "day").timing).toBe("full_prepay"); // day-long ≠ metered hour
  });
});

describe("splitPayment", () => {
  it("splits an event booking 30/70", () => {
    const p = splitPayment(10000, policyFor("violin", "hr"), "upi");
    expect(p.paidNow).toBe(3000);
    expect(p.balanceDue).toBe(7000);
  });

  it("collects the full base hour upfront for repairs", () => {
    const p = splitPayment(590, policyFor("elec", "hr"), "upi");
    expect(p.paidNow).toBe(590);
    expect(p.balanceDue).toBe(0);
  });

  it("cash means everything is payable at completion", () => {
    const p = splitPayment(590, policyFor("elec", "hr"), "cash");
    expect(p.paidNow).toBe(0);
    expect(p.balanceDue).toBe(590);
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
