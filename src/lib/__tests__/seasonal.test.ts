import { describe, expect, it } from "vitest";
import { seasonalOffer } from "../seasonal";
import { findCoupon } from "../coupons";

describe("seasonalOffer", () => {
  it("shows the Onam offer in Aug/Sep with a real coupon", () => {
    const o = seasonalOffer(new Date("2026-08-20"))!;
    expect(o.name).toBe("Onam");
    expect(o.code).toBe("ONAM25");
    expect(findCoupon(o.code)).toBeDefined();
  });

  it("maps the other festivals to their months", () => {
    expect(seasonalOffer(new Date("2026-04-10"))?.name).toBe("Vishu");
    expect(seasonalOffer(new Date("2026-07-15"))?.name).toBe("Monsoon home-care");
    expect(seasonalOffer(new Date("2026-10-25"))?.name).toBe("Diwali");
    expect(seasonalOffer(new Date("2026-01-05"))?.name).toBe("New Year");
  });

  it("is null off-season (Feb, May)", () => {
    expect(seasonalOffer(new Date("2026-02-14"))).toBeNull();
    expect(seasonalOffer(new Date("2026-05-14"))).toBeNull();
  });

  it("every seasonal code resolves to a real coupon", () => {
    for (const month of [3, 6, 8, 10, 0]) {
      const o = seasonalOffer(new Date(2026, month, 15));
      if (o) expect(findCoupon(o.code)).toBeDefined();
    }
  });
});
