import { describe, expect, it } from "vitest";
import {
  getPlusPlan,
  isMember,
  MEMBER_DISCOUNT_RATE,
  memberDiscount,
  memberSavings,
  PLUS_PLANS,
  type Membership,
} from "../membership";
import type { Booking } from "../types";

describe("memberDiscount", () => {
  it("is 10% for members, nothing for non-members", () => {
    expect(memberDiscount(1000, true)).toBe(100);
    expect(memberDiscount(1000, false)).toBe(0);
    expect(MEMBER_DISCOUNT_RATE).toBe(0.1);
  });

  it("never goes negative", () => {
    expect(memberDiscount(-50, true)).toBe(0);
  });
});

describe("isMember", () => {
  const now = new Date("2026-07-15T12:00:00");
  it("is false when inactive", () => {
    expect(isMember({ active: false }, now)).toBe(false);
    expect(isMember(undefined, now)).toBe(false);
  });

  it("is true while the term is unexpired", () => {
    const m: Membership = { active: true, renewsOn: "2026-08-01T00:00:00" };
    expect(isMember(m, now)).toBe(true);
  });

  it("lapses once the renewal date passes", () => {
    const m: Membership = { active: true, renewsOn: "2026-07-01T00:00:00" };
    expect(isMember(m, now)).toBe(false);
  });
});

describe("memberSavings", () => {
  const bookings = [
    { status: "completed", customerId: "c1", quote: { totalUserPays: 1000 } },
    { status: "completed", customerId: "c1", quote: { totalUserPays: 500 } },
    { status: "completed", customerId: "c2", quote: { totalUserPays: 900 } },
    { status: "cancelled", customerId: "c1", quote: { totalUserPays: 800 } },
  ] as Booking[];

  it("sums 10% of the customer's completed booking value", () => {
    expect(memberSavings(bookings, "c1")).toBe(150); // 10% of 1500
  });

  it("ignores other customers and non-completed jobs", () => {
    expect(memberSavings(bookings, "c2")).toBe(90);
  });
});

describe("plans", () => {
  it("the yearly plan is cheaper per month than monthly", () => {
    const monthly = getPlusPlan("monthly");
    const yearly = getPlusPlan("yearly");
    expect(yearly.price / yearly.months).toBeLessThan(monthly.price);
    expect(PLUS_PLANS).toHaveLength(2);
  });
});
