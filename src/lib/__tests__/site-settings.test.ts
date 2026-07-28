import { describe, expect, it } from "vitest";
import {
  changedFromDefault,
  sanitisePlusPrices,
  sanitiseRewards,
  DEFAULT_PLUS,
  DEFAULT_REWARDS,
  PLUS_LIMITS,
  REWARD_LIMITS,
} from "../site-settings";

describe("what ships when nobody has edited anything", () => {
  it("pays the amounts the app was built with", () => {
    expect(DEFAULT_REWARDS).toEqual({
      joinBonus: 100,
      customerReferral: 100,
      workerReferral: 500,
    });
    expect(DEFAULT_PLUS).toEqual({ monthly: 99, yearly: 799 });
  });

  it("falls back to them for an empty, missing or broken document", () => {
    for (const raw of [undefined, null, {}, "", 0, [], "corrupt", { joinBonus: null }]) {
      expect(sanitiseRewards(raw), String(raw)).toEqual(DEFAULT_REWARDS);
    }
  });

  it("keeps the untouched keys when only one is set", () => {
    expect(sanitiseRewards({ customerReferral: 250 })).toEqual({
      joinBonus: 100,
      customerReferral: 250,
      workerReferral: 500,
    });
  });
});

describe("a typo cannot give the business away", () => {
  it("clamps an extra zero back to the ceiling", () => {
    // ₹1,000 meant, ₹10,000 typed — paid to both sides, on every referral.
    expect(sanitiseRewards({ customerReferral: 10_000 }).customerReferral).toBe(
      REWARD_LIMITS.customerReferral.max,
    );
    expect(sanitiseRewards({ workerReferral: 999_999 }).workerReferral).toBe(
      REWARD_LIMITS.workerReferral.max,
    );
  });

  it("refuses a negative bonus", () => {
    expect(sanitiseRewards({ joinBonus: -50 }).joinBonus).toBe(0);
  });

  it("will not let membership be priced at nothing", () => {
    // ₹0 KAAM Plus is 10% off every booking for everyone, forever.
    expect(sanitisePlusPrices({ monthly: 0 }).monthly).toBe(PLUS_LIMITS.monthly.min);
    expect(sanitisePlusPrices({ yearly: 1 }).yearly).toBe(PLUS_LIMITS.yearly.min);
  });

  it("guards a row edited straight in the database, not just the form", () => {
    // The form can validate; a hand-edited Supabase row cannot be trusted.
    expect(sanitiseRewards({ customerReferral: "500000" }).customerReferral).toBe(500);
    // Not-a-number of any kind means "no usable value", which is the default
    // rather than the ceiling — nothing infinite was ever anybody's intent.
    expect(sanitiseRewards({ customerReferral: NaN }).customerReferral).toBe(100);
    expect(sanitiseRewards({ customerReferral: Infinity }).customerReferral).toBe(100);
    expect(sanitiseRewards({ customerReferral: { amount: 5 } }).customerReferral).toBe(100);
  });

  it("stores whole rupees only", () => {
    expect(sanitiseRewards({ joinBonus: 149.7 }).joinBonus).toBe(150);
  });

  it("accepts a number typed as text, the way a form gives it", () => {
    expect(sanitiseRewards({ joinBonus: "250" }).joinBonus).toBe(250);
    expect(sanitisePlusPrices({ monthly: "149" }).monthly).toBe(149);
  });
});

describe("every value has to be usable in an editor", () => {
  it("gives each one a label and a reason for its ceiling", () => {
    for (const [key, limit] of Object.entries({ ...REWARD_LIMITS, ...PLUS_LIMITS })) {
      expect(limit.label.length, key).toBeGreaterThan(3);
      expect(limit.note.length, key).toBeGreaterThan(10);
      expect(limit.max, key).toBeGreaterThan(limit.min);
      expect(limit.fallback, key).toBeGreaterThanOrEqual(limit.min);
      expect(limit.fallback, key).toBeLessThanOrEqual(limit.max);
    }
  });

  it("can say what has been changed from the shipped default", () => {
    expect(changedFromDefault(DEFAULT_REWARDS, REWARD_LIMITS)).toEqual([]);
    expect(
      changedFromDefault(sanitiseRewards({ joinBonus: 200 }), REWARD_LIMITS),
    ).toEqual(["joinBonus"]);
  });
});
