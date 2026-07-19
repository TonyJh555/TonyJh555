import { describe, expect, it } from "vitest";
import {
  billedMinutesFor,
  elapsedMinutes,
  isMetered,
  meteredQuote,
  meterNow,
  settleBooking,
} from "../metered";
import { computeQuote } from "../pricing";
import type { Booking, Worker } from "../types";

const START = "2026-07-19T10:00:00.000Z";
const after = (minutes: number) => new Date(new Date(START).getTime() + minutes * 60_000);

const electrician = { unit: "hr", rate: 600 } as Worker;
const plumberPerVisit = { unit: "visit", rate: 450 } as Worker;

function hourlyBooking(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    workerId: "w1",
    workerName: "Test",
    categoryId: "elec",
    subService: "Wiring",
    tenureId: "hr",
    stateId: "KL",
    quote: computeQuote({ rate: 600, tenureId: "hr", stateId: "KL", unit: "hr" }),
    paymentMethod: "upi",
    status: "in_progress",
    startCode: "1234",
    createdAt: START,
    startedAt: START,
    ...over,
  } as Booking;
}

describe("billedMinutesFor", () => {
  it("bills the base hour for quick jobs — it's the minimum charge", () => {
    expect(billedMinutesFor(40)).toBe(60);
    expect(billedMinutesFor(60)).toBe(60);
  });

  it("gives a 5-minute grace so 1h03 isn't nickel-and-dimed", () => {
    expect(billedMinutesFor(63)).toBe(60);
    expect(billedMinutesFor(65)).toBe(60);
  });

  it("past the grace, bills the minutes actually worked", () => {
    expect(billedMinutesFor(66)).toBe(66);
    expect(billedMinutesFor(68)).toBe(68);
    expect(billedMinutesFor(125)).toBe(125);
  });
});

describe("meteredQuote", () => {
  it("matches computeQuote exactly at the base hour", () => {
    expect(meteredQuote(600, 60, false, "KL")).toEqual(
      computeQuote({ rate: 600, tenureId: "hr", stateId: "KL", unit: "hr" }),
    );
  });

  it("prices 68 minutes as 68/60 of the hourly rate — the user's example", () => {
    const q = meteredQuote(600, 68, false, "KL");
    expect(q.serviceAmount).toBe(680); // 600 + 8 × 10/min
    expect(q.gst).toBe(Math.round(680 * 0.18));
    expect(q.totalUserPays).toBe(680 + q.gst);
  });
});

describe("settleBooking", () => {
  it("settles a 68-minute job fairly for both sides", () => {
    const b = hourlyBooking();
    const s = settleBooking(b, electrician, after(68))!;
    expect(s.settlement.actualMinutes).toBe(68);
    expect(s.settlement.billedMinutes).toBe(68);
    expect(s.settlement.extraMinutes).toBe(8);
    // User pays the extra ₹80 + GST on it; worker keeps their share of it.
    expect(s.settlement.extraUserPays).toBe(s.quote.totalUserPays - b.quote.totalUserPays);
    expect(s.settlement.extraUserPays).toBeGreaterThan(80); // 80 + tax
    expect(s.settlement.extraWorkerPayout).toBeGreaterThan(0);
    expect(s.quote.workerPayout).toBeGreaterThan(b.quote.workerPayout);
  });

  it("a job inside the grace settles at the original price, minutes recorded", () => {
    const s = settleBooking(hourlyBooking(), electrician, after(63))!;
    expect(s.settlement.extraMinutes).toBe(0);
    expect(s.settlement.extraUserPays).toBe(0);
    expect(s.quote).toEqual(hourlyBooking().quote);
    expect(s.settlement.actualMinutes).toBe(63);
  });

  it("a quick 40-minute job still bills the base hour (minimum charge)", () => {
    const s = settleBooking(hourlyBooking(), electrician, after(40))!;
    expect(s.settlement.billedMinutes).toBe(60);
    expect(s.settlement.extraUserPays).toBe(0);
  });

  it("does not meter per-visit work or jobs whose clock never started", () => {
    expect(settleBooking(hourlyBooking(), plumberPerVisit, after(90))).toBeNull();
    expect(settleBooking(hourlyBooking({ startedAt: undefined }), electrician, after(90))).toBeNull();
    expect(isMetered({ tenureId: "day" } as Booking, electrician)).toBe(false);
  });

  it("keeps surge pricing on the extra minutes too", () => {
    const surged = computeQuote({ rate: 600, tenureId: "hr", stateId: "KL", unit: "hr", surge: true });
    const s = settleBooking(hourlyBooking({ quote: surged }), electrician, after(90))!;
    expect(s.quote.surgeApplied).toBe(true);
    expect(s.quote.serviceAmount).toBe(Math.round((600 * 90 * 1.2) / 60));
  });
});

describe("live meter", () => {
  it("shows elapsed time and the running extra charge", () => {
    const b = hourlyBooking();
    expect(meterNow(b, electrician, after(42))).toEqual({ elapsed: 42, extraSoFar: 0, inGrace: false });
    expect(meterNow(b, electrician, after(63))).toEqual({ elapsed: 63, extraSoFar: 0, inGrace: true });
    expect(meterNow(b, electrician, after(68))).toEqual({ elapsed: 68, extraSoFar: 80, inGrace: false });
  });

  it("elapsedMinutes floors to whole minutes and never goes negative", () => {
    expect(elapsedMinutes(START, after(5.9))).toBe(5);
    expect(elapsedMinutes(START, new Date(new Date(START).getTime() - 60_000))).toBe(0);
  });
});
