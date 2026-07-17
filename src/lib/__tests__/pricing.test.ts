import { describe, expect, it } from "vitest";
import { computeQuote, TENURES, STATES } from "../pricing";

describe("computeQuote", () => {
  it("matches the build-guide example: ₹500/visit, Daily tenure, Kerala", () => {
    // Guide §2.2: ₹500 × 7 = ₹3,500 service; +₹630 GST; user pays ₹4,130;
    // −₹525 platform fee; −₹35 TDS; worker receives ₹2,940.
    const q = computeQuote({ rate: 500, tenureId: "day", stateId: "KL" });
    expect(q.serviceAmount).toBe(3500);
    expect(q.gst).toBe(630);
    expect(q.cess).toBe(0);
    expect(q.totalUserPays).toBe(4130);
    expect(q.platformFee).toBe(525);
    expect(q.tds).toBe(35);
    expect(q.workerPayout).toBe(2940);
  });

  it("charges no welfare cess in Kerala (levy not yet in force)", () => {
    const q = computeQuote({ rate: 1000, tenureId: "hr", stateId: "KL" });
    expect(q.cess).toBe(0);
    expect(q.totalUserPays).toBe(1000 + 180);
  });

  it("applies 1.2× surge to the service amount", () => {
    const base = computeQuote({ rate: 500, tenureId: "hr", stateId: "KL" });
    const surged = computeQuote({ rate: 500, tenureId: "hr", stateId: "KL", surge: true });
    expect(surged.serviceAmount).toBe(600);
    expect(surged.surgeApplied).toBe(true);
    expect(base.surgeApplied).toBe(false);
  });

  it("keeps the ledger balanced: payout + fee + tds = service amount", () => {
    for (const tenure of TENURES) {
      for (const state of STATES) {
        const q = computeQuote({ rate: 637, tenureId: tenure.id, stateId: state.id });
        expect(q.workerPayout + q.platformFee + q.tds).toBe(q.serviceAmount);
        expect(q.totalUserPays).toBe(q.serviceAmount + q.gst + q.cess);
      }
    }
  });

  it("rejects non-positive rates", () => {
    expect(() => computeQuote({ rate: 0, tenureId: "hr", stateId: "KL" })).toThrow();
  });

  it("prices by the worker's unit — a per-day nurse isn't billed like an hourly rate", () => {
    // ₹1,500/day nurse, Monthly tenure. Hourly assumption (×168) would be an
    // absurd ₹2.52 lakh; per-day (×26) is a realistic ₹39,000 service amount.
    const hourlyAssumption = computeQuote({ rate: 1500, tenureId: "mo", stateId: "KL" });
    const perDay = computeQuote({ rate: 1500, tenureId: "mo", unit: "day", stateId: "KL" });
    expect(hourlyAssumption.serviceAmount).toBe(252000); // unit defaults to "hr"
    expect(perDay.serviceAmount).toBe(39000); // 1500 × 26
    expect(perDay.totalUserPays).toBe(39000 + Math.round(39000 * 0.18));
  });
});
