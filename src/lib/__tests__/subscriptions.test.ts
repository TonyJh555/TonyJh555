import { describe, expect, it } from "vitest";
import { addMonths, nextRenewal, daysUntil, subscriptionsFor } from "../subscriptions";
import type { Subscription } from "../types";

describe("subscription date maths", () => {
  it("adds whole months across a year boundary", () => {
    expect(addMonths("2026-01-15T00:00:00.000Z", 3).slice(0, 10)).toBe("2026-04-15");
    expect(addMonths("2026-11-10T00:00:00.000Z", 3).slice(0, 10)).toBe("2027-02-10");
  });

  it("clamps to the last day of a shorter target month", () => {
    // Jan 31 + 1 month → Feb 28 (2026 is not a leap year)
    expect(addMonths("2026-01-31T00:00:00.000Z", 1).slice(0, 10)).toBe("2026-02-28");
  });

  it("nextRenewal is addMonths of the term length", () => {
    expect(nextRenewal("2026-03-01T00:00:00.000Z", 6).slice(0, 10)).toBe("2026-09-01");
  });

  it("daysUntil counts forward and backward", () => {
    const now = new Date("2026-07-17T00:00:00.000Z");
    expect(daysUntil("2026-07-27T00:00:00.000Z", now)).toBe(10);
    expect(daysUntil("2026-07-07T00:00:00.000Z", now)).toBe(-10);
  });
});

describe("subscriptionsFor", () => {
  const mk = (id: string, customerId?: string): Subscription => ({
    id,
    customerId,
    workerId: "w1",
    workerName: "Anu",
    categoryId: "nurse",
    service: "Home Nurse · 3 Months plan",
    planId: "m3",
    months: 3,
    monthlyAmount: 1000,
    termAmount: 3000,
    monthlyPayout: 700,
    termPayout: 2100,
    startDate: "2026-07-17T00:00:00.000Z",
    renewsOn: "2026-10-17T00:00:00.000Z",
    autoRenew: true,
    status: "active",
    paymentRef: "sub_local_x",
    history: [],
    createdAt: "2026-07-17T00:00:00.000Z",
  });

  it("returns a logged-in customer's own subscriptions", () => {
    const list = [mk("a", "c1"), mk("b", "c2"), mk("c", "c1")];
    expect(subscriptionsFor(list, "c1").map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("returns only unowned subscriptions when not logged in", () => {
    const list = [mk("a", "c1"), mk("b", undefined)];
    expect(subscriptionsFor(list, undefined).map((s) => s.id)).toEqual(["b"]);
  });
});
