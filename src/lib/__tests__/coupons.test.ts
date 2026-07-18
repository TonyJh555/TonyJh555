import { describe, expect, it } from "vitest";
import { applyCoupon, couponDiscount, findCoupon } from "../coupons";

describe("coupons", () => {
  it("matches codes case-insensitively", () => {
    expect(findCoupon("kaam50")?.code).toBe("KAAM50");
    expect(findCoupon("  Onam25 ")?.code).toBe("ONAM25");
    expect(findCoupon("nope")).toBeUndefined();
  });

  it("applies a flat discount above the minimum", () => {
    const r = applyCoupon("KAAM50", 800);
    expect(r.ok).toBe(true);
    expect(r.discount).toBe(50);
  });

  it("rejects a flat coupon below its minimum", () => {
    const r = applyCoupon("FIRST100", 400); // min 500
    expect(r.ok).toBe(false);
    expect(r.discount).toBe(0);
    expect(r.message).toMatch(/500/);
  });

  it("caps a percentage discount", () => {
    // 25% of 4000 = 1000, capped at 500
    expect(couponDiscount(findCoupon("ONAM25")!, 4000)).toBe(500);
    // 20% of 1000 = 200, under the ₹400 cap
    expect(couponDiscount(findCoupon("CARE20")!, 1000)).toBe(200);
  });

  it("never discounts more than the order amount", () => {
    expect(couponDiscount(findCoupon("FIRST100")!, 550)).toBeLessThanOrEqual(550);
  });

  it("rejects unknown codes", () => {
    expect(applyCoupon("FREESTUFF", 1000).ok).toBe(false);
  });
});
