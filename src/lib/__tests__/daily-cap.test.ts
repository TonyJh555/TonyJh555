import { describe, expect, it } from "vitest";
import {
  capReached,
  cappedWorkedMinutes,
  minutesLeftToday,
  minutesToday,
  resumePatch,
  settleBooking,
  meterNow,
} from "../metered";
import { CAP_LIMITS, sanitiseCaps } from "../site-settings";
import type { Booking, Quote } from "../types";

/**
 * A metered job cannot bill for ever.
 *
 * A fan repair once ran to 11h 27m because nobody closed it. Either side could
 * always stop the clock — that part was right — but nothing bounded it, so an
 * argument about the hours was an argument about a number still growing. The
 * cap does not decide who was right. It makes the disagreement small, and
 * knowable before the job starts.
 *
 * Past the cap the meter stops charging. The work may continue: KAAM can stop
 * money, but it should not order someone out of a customer's house mid-repair.
 */

const START = new Date("2026-08-02T09:00:00");
const CAP = 8 * 60;

function quote(over: Partial<Quote> = {}): Quote {
  return {
    serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0,
    totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420, ...over,
  };
}

function job(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk1", workerId: "w1", workerName: "Rahul Sharma",
    categoryId: "elec", subService: "Fan Repair", tenureId: "hr", stateId: "KL",
    quote: quote(), paymentMethod: "gpay", status: "in_progress", startCode: "1234",
    createdAt: START.toISOString(), startedAt: START.toISOString(), ...over,
  };
}

/** `mins` minutes after the job started. */
const at = (mins: number) => new Date(START.getTime() + mins * 60_000);
const worker = { unit: "hr" as const, rate: 400 };

describe("the daily cap", () => {
  it("does not touch an ordinary job", () => {
    expect(cappedWorkedMinutes(job(), CAP, at(90))).toBe(90);
    expect(capReached(job(), CAP, at(90))).toBe(false);
  });

  it("stops counting at the cap", () => {
    expect(cappedWorkedMinutes(job(), CAP, at(CAP))).toBe(CAP);
    expect(cappedWorkedMinutes(job(), CAP, at(CAP + 200))).toBe(CAP);
    // The 11h 27m case: billed as eight hours, not eleven and a half.
    expect(cappedWorkedMinutes(job(), CAP, at(687))).toBe(CAP);
  });

  it("says how much billing is left", () => {
    expect(minutesLeftToday(job(), CAP, at(0))).toBe(CAP);
    expect(minutesLeftToday(job(), CAP, at(CAP - 60))).toBe(60);
    // Never negative, however long the job runs.
    expect(minutesLeftToday(job(), CAP, at(CAP + 500))).toBe(0);
  });

  it("knows when it has been reached", () => {
    expect(capReached(job(), CAP, at(CAP - 1))).toBe(false);
    expect(capReached(job(), CAP, at(CAP))).toBe(true);
  });
});

describe("what the customer is actually billed", () => {
  it("charges the capped hours, not the elapsed ones", () => {
    const uncapped = settleBooking(job(), worker, at(687), 0)!;
    const capped = settleBooking(job(), worker, at(687), CAP)!;
    expect(capped.quote.totalUserPays).toBeLessThan(uncapped.quote.totalUserPays);
    expect(capped.settlement.billedMinutes).toBe(CAP);
  });

  it("still records how long the job really took", () => {
    // The receipt must not pretend the worker was there for eight hours when
    // they were there for eleven and a half.
    const s = settleBooking(job(), worker, at(687), CAP)!;
    expect(s.settlement.actualMinutes).toBe(687);
    expect(s.settlement.billedMinutes).toBe(CAP);
  });

  it("tells the live meter it has stopped", () => {
    expect(meterNow(job(), worker, at(90), CAP)!.capped).toBe(false);
    expect(meterNow(job(), worker, at(CAP + 30), CAP)!.capped).toBe(true);
  });

  it("is off when no cap is configured", () => {
    // A cap of zero means "no cap" — the old behaviour, so nothing changes for
    // a call site that has not been given one.
    expect(cappedWorkedMinutes(job(), 0, at(687))).toBe(687);
    expect(capReached(job(), 0, at(687))).toBe(false);
  });
});

describe("a job that spans two days", () => {
  const pausedAt = new Date("2026-08-02T17:00:00");

  it("gets a fresh allowance on the second day", () => {
    // Eight hours on Sunday, paused, resumed Monday: Monday starts at zero
    // rather than already being at the ceiling.
    const banked = 8 * 60 * 60_000;
    const paused = job({ bankedMs: banked, pausedAt: pausedAt.toISOString(), startedAt: undefined });
    const nextDay = new Date("2026-08-03T09:00:00");
    const resumed = job({ ...paused, ...resumePatch(nextDay, paused) });

    expect(resumed.dayBaselineMs).toBe(banked);
    expect(minutesToday(resumed, new Date("2026-08-03T11:00:00"))).toBe(120);
    // Two hours in on day two, so the whole day's allowance is still ahead.
    expect(capReached(resumed, CAP, new Date("2026-08-03T11:00:00"))).toBe(false);
  });

  it("keeps one allowance when the job resumes the same day", () => {
    // A short pause for parts is not a new day.
    const paused = job({ bankedMs: 60 * 60_000, pausedAt: pausedAt.toISOString(), startedAt: undefined });
    const sameDay = new Date("2026-08-02T17:30:00");
    const resumed = job({ ...paused, ...resumePatch(sameDay, paused) });
    expect(resumed.dayBaselineMs).toBeUndefined();
    expect(minutesToday(resumed, new Date("2026-08-02T18:30:00"))).toBe(120);
  });

  it("bills day two against day two's ceiling", () => {
    const banked = 8 * 60 * 60_000;
    const paused = job({ bankedMs: banked, pausedAt: pausedAt.toISOString(), startedAt: undefined });
    const nextDay = new Date("2026-08-03T09:00:00");
    const resumed = job({ ...paused, ...resumePatch(nextDay, paused) });
    // Ten hours into day two: billed 8 + 8, not 8 + 10 and not 8.
    const late = new Date("2026-08-03T19:00:00");
    expect(cappedWorkedMinutes(resumed, CAP, late)).toBe(16 * 60);
  });
});

describe("the owner can move the cap, within reason", () => {
  it("ships at eight hours", () => {
    expect(sanitiseCaps({}).dailyHours).toBe(8);
  });

  it("accepts a sensible change", () => {
    expect(sanitiseCaps({ dailyHours: 6 }).dailyHours).toBe(6);
  });

  it("cannot be set low enough to break half-day work", () => {
    expect(sanitiseCaps({ dailyHours: 1 }).dailyHours).toBe(CAP_LIMITS.dailyHours.min);
  });

  it("cannot be raised back to effectively uncapped", () => {
    expect(sanitiseCaps({ dailyHours: 999 }).dailyHours).toBe(CAP_LIMITS.dailyHours.max);
  });

  it("falls back to the shipped value for nonsense", () => {
    // A hand-edited database row must not be able to switch the cap off.
    expect(sanitiseCaps({ dailyHours: 0 }).dailyHours).toBe(CAP_LIMITS.dailyHours.min);
    expect(sanitiseCaps({ dailyHours: "lots" }).dailyHours).toBe(8);
    expect(sanitiseCaps({ dailyHours: Infinity }).dailyHours).toBe(8);
  });
});
