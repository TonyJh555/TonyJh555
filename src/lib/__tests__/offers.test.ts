import { describe, expect, it } from "vitest";
import {
  applyCoupon,
  couponDiscount,
  couponUsable,
  DEFAULT_COUPONS,
  findCoupon,
  type Coupon,
} from "../coupons";

const NOW = new Date("2026-08-15T10:00:00Z");
const c = (over: Partial<Coupon> = {}): Coupon => ({
  code: "TEST20", label: "20% off", kind: "percent", value: 20,
  maxDiscount: 400, note: "20% off", ...over,
});

describe("an offer is only usable when the owner says so", () => {
  it("is usable by default", () => {
    expect(couponUsable(c(), { now: NOW })).toBe(true);
  });

  it("switching it off stops it immediately", () => {
    expect(couponUsable(c({ active: false }), { now: NOW })).toBe(false);
  });

  it("respects the start date", () => {
    expect(couponUsable(c({ startsOn: "2026-09-01" }), { now: NOW })).toBe(false);
    expect(couponUsable(c({ startsOn: "2026-08-01" }), { now: NOW })).toBe(true);
  });

  it("expires on the day after it ends, not before", () => {
    expect(couponUsable(c({ endsOn: "2026-08-15" }), { now: NOW })).toBe(true);
    expect(couponUsable(c({ endsOn: "2026-08-14" }), { now: NOW })).toBe(false);
  });

  it("can be limited to particular services", () => {
    const onam = c({ categories: ["clean", "cook"] });
    expect(couponUsable(onam, { now: NOW, categoryId: "clean" })).toBe(true);
    expect(couponUsable(onam, { now: NOW, categoryId: "elec" })).toBe(false);
  });

  it("with no category limit works for every service", () => {
    expect(couponUsable(c(), { now: NOW, categoryId: "elec" })).toBe(true);
  });
});

describe("what the customer is told when a code doesn't work", () => {
  const coupons = [c({ code: "EXPIRED", endsOn: "2026-01-01" }),
                   c({ code: "SOON", startsOn: "2026-12-01" }),
                   c({ code: "CLEANONLY", categories: ["clean"] }),
                   c({ code: "OFF", active: false })];

  const msg = (code: string, categoryId?: "elec" | "clean") =>
    applyCoupon(code, 1000, { coupons, now: NOW, categoryId }).message;

  it("says expired, not just invalid", () => {
    expect(msg("EXPIRED")).toMatch(/expired/i);
  });

  it("says when it starts", () => {
    expect(msg("SOON")).toMatch(/starts on 2026-12-01/);
  });

  it("says it's the wrong service", () => {
    expect(msg("CLEANONLY", "elec")).toMatch(/isn't valid for this service/i);
  });

  it("says a switched-off code isn't available", () => {
    expect(msg("OFF")).toMatch(/isn't available/i);
  });

  it("still says invalid for a code that doesn't exist", () => {
    expect(msg("NOPE")).toMatch(/invalid/i);
  });

  it("tells them the minimum spend rather than failing silently", () => {
    const res = applyCoupon("MIN", 200, {
      coupons: [c({ code: "MIN", min: 500 })], now: NOW,
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/₹500\+/);
  });
});

describe("the money an offer takes off", () => {
  it("caps a percentage at the maximum discount", () => {
    expect(couponDiscount(c({ value: 50, maxDiscount: 400 }), 2000)).toBe(400);
  });

  it("never discounts more than the order itself", () => {
    expect(couponDiscount(c({ kind: "flat", value: 500 }), 300)).toBe(300);
  });

  it("never goes negative", () => {
    expect(couponDiscount(c({ kind: "flat", value: -100 }), 300)).toBe(0);
  });

  it("gives nothing below the minimum spend", () => {
    expect(couponDiscount(c({ min: 500, kind: "flat", value: 100 }), 400)).toBe(0);
  });
});

describe("the owner's edited list is what counts", () => {
  it("looks codes up in the list it is given, not the built-ins", () => {
    const custom = [c({ code: "OWNERCODE" })];
    expect(findCoupon("OWNERCODE", custom)).toBeDefined();
    expect(findCoupon("KAAM50", custom)).toBeUndefined();
  });

  it("falls back to the built-ins when no list is passed", () => {
    expect(findCoupon("KAAM50")).toBeDefined();
    expect(applyCoupon("KAAM50", 1000, { now: NOW }).ok).toBe(true);
  });

  it("matches codes however they were typed", () => {
    expect(findCoupon("  kaam50  ")).toBeDefined();
  });

  it("every built-in offer is valid by its own rules", () => {
    for (const coupon of DEFAULT_COUPONS) {
      expect(coupon.value).toBeGreaterThan(0);
      if (coupon.kind === "percent") expect(coupon.value).toBeLessThanOrEqual(100);
      expect(coupon.code).toBe(coupon.code.toUpperCase());
    }
  });
});
