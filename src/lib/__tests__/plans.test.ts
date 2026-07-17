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
import { computeQuote, getTenure } from "../pricing";

describe("care plans pricing", () => {
  it("applies the commitment discount to the monthly service amount", () => {
    const mo = getTenure("mo").multiplier; // 168
    const plan = getCarePlan("m3"); // 3 months, 15% off
    const q = planQuote({ rate: 500, stateId: "KL", plan });
    // 500 × 168 × 3 × (1 − 0.15) = 214,200
    expect(q.serviceAmount).toBe(Math.round(500 * mo * 3 * 0.85));
    expect(q.serviceAmount).toBe(214200);
  });

  it("keeps the ledger balanced for every plan", () => {
    for (const plan of CARE_PLANS) {
      const q = planQuote({ rate: 812, stateId: "KL", plan });
      expect(q.workerPayout + q.platformFee + q.tds).toBe(q.serviceAmount);
      expect(q.totalUserPays).toBe(q.serviceAmount + q.gst + q.cess);
    }
  });

  it("longer plans always cost less per month", () => {
    const rate = 700;
    const monthly = perMonth(planQuote({ rate, stateId: "KL", plan: getCarePlan("m1") }), getCarePlan("m1"));
    const quarter = perMonth(planQuote({ rate, stateId: "KL", plan: getCarePlan("m3") }), getCarePlan("m3"));
    const half = perMonth(planQuote({ rate, stateId: "KL", plan: getCarePlan("m6") }), getCarePlan("m6"));
    expect(quarter).toBeLessThan(monthly);
    expect(half).toBeLessThan(quarter);
  });

  it("reports a positive saving versus month-by-month", () => {
    for (const plan of CARE_PLANS) {
      const save = planSavings({ rate: 600, stateId: "KL", plan });
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
