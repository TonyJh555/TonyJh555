import { describe, expect, it } from "vitest";
import {
  CARE_PLANS,
  getCarePlan,
  planQuote,
  planSavings,
  perMonth,
  effectiveRate,
  isPlanEligible,
  isTeachable,
  isPerformer,
  ONLINE_DISCOUNT,
} from "../plans";
import { computeQuote, tenureMultiplier } from "../pricing";

describe("care plans pricing", () => {
  it("prices a monthly plan by the worker's unit, not a flat multiplier", () => {
    const perMo = tenureMultiplier("day", "mo"); // 26 working days
    const plan = getCarePlan("m3"); // 3 months, 15% off
    const q = planQuote({ rate: 1500, unit: "day", stateId: "KL", plan }); // ₹1,500/day nurse
    // 1500 × 26 × 3 × (1 − 0.15) = 99,450  — a realistic 3-month nurse plan
    expect(q.serviceAmount).toBe(Math.round(1500 * perMo * 3 * 0.85));
    expect(q.serviceAmount).toBe(99450);
  });

  it("keeps the ledger balanced for every plan", () => {
    for (const plan of CARE_PLANS) {
      const q = planQuote({ rate: 812, unit: "day", stateId: "KL", plan });
      expect(q.workerPayout + q.platformFee + q.tds).toBe(q.serviceAmount);
      expect(q.totalUserPays).toBe(q.serviceAmount + q.gst + q.cess);
    }
  });

  it("longer plans always cost less per month", () => {
    const rate = 700;
    const q = (id: "m1" | "m3" | "m6") =>
      perMonth(planQuote({ rate, unit: "session", stateId: "KL", plan: getCarePlan(id) }), getCarePlan(id));
    expect(q("m3")).toBeLessThan(q("m1"));
    expect(q("m6")).toBeLessThan(q("m3"));
  });

  it("reports a positive saving versus month-by-month", () => {
    for (const plan of CARE_PLANS) {
      const save = planSavings({ rate: 600, unit: "day", stateId: "KL", plan });
      expect(save).toBeGreaterThan(0);
    }
  });

  it("online lessons cost 15% less than in-person", () => {
    expect(effectiveRate(1000, true)).toBe(1000 * (1 - ONLINE_DISCOUNT));
    expect(effectiveRate(1000, false)).toBe(1000);
    const offline = computeQuote({ rate: 1000, tenureId: "hr", stateId: "KL" });
    const online = computeQuote({
      rate: effectiveRate(1000, true),
      tenureId: "hr",
      stateId: "KL",
    });
    expect(online.totalUserPays).toBeLessThan(offline.totalUserPays);
  });

  it("classifies categories correctly", () => {
    expect(isPlanEligible("nurse")).toBe(true);
    expect(isPlanEligible("eldercare")).toBe(true);
    expect(isPlanEligible("elec")).toBe(false);
    expect(isTeachable("violin")).toBe(true);
    expect(isTeachable("tutor")).toBe(true);
    expect(isTeachable("plumb")).toBe(false);
    expect(isPerformer("violin")).toBe(true);
    expect(isPerformer("tutor")).toBe(false);
  });
});
