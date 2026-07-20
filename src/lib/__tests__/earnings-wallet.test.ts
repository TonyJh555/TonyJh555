import { describe, expect, it } from "vitest";
import {
  availableBalance,
  INSTANT_FEE_MAX,
  INSTANT_FEE_MIN,
  instantFee,
  lifetimeEarned,
  nextSettlement,
  totalWithdrawn,
  withdrawalsFor,
  type Withdrawal,
} from "../earnings-wallet";
import type { Booking } from "../types";

const job = (workerId: string, payout: number, status = "completed") =>
  ({ workerId, status, quote: { workerPayout: payout } }) as Booking;

const wd = (workerId: string, amount: number, at: string): Withdrawal =>
  ({ id: `${workerId}-${amount}`, workerId, amount, fee: 0, net: amount, kind: "weekly", upi: "a@b", at, status: "scheduled" }) as Withdrawal;

describe("instantFee", () => {
  it("is 1% of the amount, clamped to the ₹5–₹50 band", () => {
    expect(instantFee(200)).toBe(INSTANT_FEE_MIN); // 1% = 2 → floored to 5
    expect(instantFee(2000)).toBe(20); // 1% = 20
    expect(instantFee(100000)).toBe(INSTANT_FEE_MAX); // 1% = 1000 → capped at 50
    expect(instantFee(0)).toBe(0);
  });
});

describe("balances", () => {
  const bookings = [job("w1", 500), job("w1", 300), job("w2", 999), job("w1", 100, "cancelled")];

  it("lifetime earned counts only this worker's completed payouts", () => {
    expect(lifetimeEarned(bookings, "w1")).toBe(800);
  });

  it("available = lifetime earned − everything withdrawn", () => {
    const list = [wd("w1", 300, "2026-07-10")];
    expect(availableBalance(bookings, "w1", list)).toBe(500);
    expect(totalWithdrawn(list, "w1")).toBe(300);
  });

  it("never goes negative", () => {
    const list = [wd("w1", 800, "2026-07-10"), wd("w1", 100, "2026-07-11")];
    expect(availableBalance(bookings, "w1", list)).toBe(0);
  });
});

describe("withdrawalsFor", () => {
  it("returns only this worker's entries, newest first", () => {
    const list = [wd("w1", 100, "2026-07-01"), wd("w2", 50, "2026-07-05"), wd("w1", 200, "2026-07-09")];
    const mine = withdrawalsFor(list, "w1");
    expect(mine).toHaveLength(2);
    expect(mine[0].amount).toBe(200); // newest first
  });
});

describe("nextSettlement", () => {
  it("always lands on the upcoming Friday", () => {
    // 2026-07-15 is a Wednesday → Friday the 17th.
    expect(nextSettlement(new Date("2026-07-15T12:00:00")).getDate()).toBe(17);
    // On a Friday it rolls to the next one, never today.
    const onFriday = nextSettlement(new Date("2026-07-17T12:00:00"));
    expect(onFriday.getDay()).toBe(5);
    expect(onFriday.getDate()).toBe(24);
  });
});
