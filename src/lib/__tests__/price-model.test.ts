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

  it("classifies all one-off non-repair work as advance (events + fixed visits)", () => {
    for (const c of ["violin", "singer", "photo", "catering", "events", "beauty", "yoga", "driver", "clean"] as CategoryId[]) {
      expect(billingNature(c)).toBe("advance");
    }
  });

  it("classifies only care & health as prepay", () => {
    for (const c of ["nurse", "maid", "physio", "babysitter", "eldercare"] as CategoryId[]) {
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

  it("one-off non-repair categories take an advance then a balance", () => {
    expect(policyFor("violin", "hr").timing).toBe("advance_then_balance");
    expect(policyFor("clean", "day").timing).toBe("advance_then_balance");
    expect(priceModelForCategory("photo").nature).toBe("advance");
    expect(priceModelForCategory("clean").nature).toBe("advance");
  });

  it("prepay categories are billed upfront", () => {
    expect(policyFor("nurse", "mo").timing).toBe("full_prepay");
    expect(priceModelForCategory("nurse").nature).toBe("prepay");
  });
});

describe("PRICE_MODEL_LIST", () => {
  it("covers all three natures once each", () => {
    expect(PRICE_MODEL_LIST.map((m) => m.nature).sort()).toEqual(["advance", "metered", "prepay"]);
  });

  it("only the prepay model has nothing to pay after", () => {
    for (const m of PRICE_MODEL_LIST) {
      expect(m.payAfter === "").toBe(m.nature === "prepay");
    }
  });
});
