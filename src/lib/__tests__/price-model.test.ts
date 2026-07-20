import { describe, expect, it } from "vitest";
import { billingNature, priceModelForCategory, PRICE_MODEL_LIST } from "../price-model";
import { policyFor } from "../payment-policy";
import type { CategoryId } from "../types";

describe("billingNature", () => {
  it("classifies maintenance as metered", () => {
    for (const c of ["elec", "plumb", "ac", "carp"] as CategoryId[]) {
      expect(billingNature(c)).toBe("metered");
    }
  });

  it("classifies art & hospitality as event gigs", () => {
    for (const c of ["violin", "singer", "photo", "catering", "events"] as CategoryId[]) {
      expect(billingNature(c)).toBe("event");
    }
  });

  it("classifies care, wellness and everyday as prepay", () => {
    for (const c of ["nurse", "maid", "beauty", "yoga", "driver", "clean"] as CategoryId[]) {
      expect(billingNature(c)).toBe("prepay");
    }
  });
});

describe("stays in sync with the payment-policy engine", () => {
  // The dashboard promise must match what checkout actually does for the
  // default one-off booking (hourly for repairs, its natural tenure otherwise).
  it("metered categories settle after the base hour", () => {
    expect(policyFor("elec", "hr").timing).toBe("base_then_settle");
    expect(priceModelForCategory("elec").nature).toBe("metered");
  });

  it("event categories take an advance then a balance", () => {
    expect(policyFor("violin", "hr").timing).toBe("advance_then_balance");
    expect(priceModelForCategory("photo").nature).toBe("event");
  });

  it("prepay categories are billed upfront", () => {
    expect(policyFor("nurse", "mo").timing).toBe("full_prepay");
    expect(priceModelForCategory("nurse").nature).toBe("prepay");
  });
});

describe("PRICE_MODEL_LIST", () => {
  it("covers all three natures once each", () => {
    expect(PRICE_MODEL_LIST.map((m) => m.nature).sort()).toEqual(["event", "metered", "prepay"]);
  });

  it("only the prepay model has nothing to pay after", () => {
    for (const m of PRICE_MODEL_LIST) {
      expect(m.payAfter === "").toBe(m.nature === "prepay");
    }
  });
});
