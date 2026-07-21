import { afterEach, describe, expect, it } from "vitest";
import { isRealAuth, toE164 } from "../auth";

describe("toE164", () => {
  it("prefixes a bare 10-digit Indian mobile with +91", () => {
    expect(toE164("9876543210")).toBe("+919876543210");
  });

  it("strips spaces and dashes from a 10-digit number", () => {
    expect(toE164(" 98765 43210 ")).toBe("+919876543210");
  });

  it("passes an already-E.164 number through, keeping the +", () => {
    expect(toE164("+919876543210")).toBe("+919876543210");
    expect(toE164("+14155550123")).toBe("+14155550123");
  });

  it("keeps only digits after a leading +", () => {
    expect(toE164("+91 98765-43210")).toBe("+919876543210");
  });
});

describe("isRealAuth", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_AUTH;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_AUTH;
    else process.env.NEXT_PUBLIC_SUPABASE_AUTH = original;
  });

  it("defaults to the demo flow when the flag is unset", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_AUTH;
    expect(isRealAuth()).toBe(false);
  });

  it("stays demo for any value other than 1/true", () => {
    process.env.NEXT_PUBLIC_SUPABASE_AUTH = "0";
    expect(isRealAuth()).toBe(false);
    process.env.NEXT_PUBLIC_SUPABASE_AUTH = "off";
    expect(isRealAuth()).toBe(false);
  });

  it("switches on real auth when the flag is 1 or true (Supabase is configured by default)", () => {
    process.env.NEXT_PUBLIC_SUPABASE_AUTH = "1";
    expect(isRealAuth()).toBe(true);
    process.env.NEXT_PUBLIC_SUPABASE_AUTH = "true";
    expect(isRealAuth()).toBe(true);
  });
});
