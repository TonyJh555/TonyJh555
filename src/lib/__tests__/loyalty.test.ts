import { describe, expect, it } from "vitest";
import { customerTier, TIERS } from "../loyalty";
import type { Booking } from "../types";

function completed(customerId: string, n: number): Booking[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${customerId}-${i}`,
    customerId,
    workerId: "w1",
    workerName: "W",
    categoryId: "elec",
    subService: "Fan",
    tenureId: "hr",
    stateId: "KL",
    quote: { serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0, totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420 },
    paymentMethod: "gpay",
    status: "completed" as const,
    startCode: "1234",
    createdAt: new Date().toISOString(),
  }));
}

describe("customerTier", () => {
  it("starts at Bronze with no bookings", () => {
    const s = customerTier([], undefined);
    expect(s.tier.id).toBe("bronze");
    expect(s.next?.id).toBe("silver");
    expect(s.toNext).toBe(3);
  });

  it("promotes by completed-job thresholds", () => {
    expect(customerTier(completed("c1", 3), "c1").tier.id).toBe("silver");
    expect(customerTier(completed("c1", 10), "c1").tier.id).toBe("gold");
    expect(customerTier(completed("c1", 30), "c1").tier.id).toBe("platinum");
  });

  it("computes progress toward the next tier", () => {
    const s = customerTier(completed("c1", 6), "c1"); // silver(3) → gold(10)
    expect(s.tier.id).toBe("silver");
    expect(s.toNext).toBe(4);
    expect(s.progress).toBeCloseTo((6 - 3) / (10 - 3));
  });

  it("caps at the top tier", () => {
    const s = customerTier(completed("c1", 40), "c1");
    expect(s.tier.id).toBe("platinum");
    expect(s.next).toBeUndefined();
    expect(s.progress).toBe(1);
  });

  it("only counts the given customer's completed jobs", () => {
    const mixed = [...completed("c1", 4), ...completed("c2", 20)];
    expect(customerTier(mixed, "c1").tier.id).toBe("silver");
  });

  it("has strictly increasing thresholds", () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].minJobs).toBeGreaterThan(TIERS[i - 1].minJobs);
    }
  });
});
