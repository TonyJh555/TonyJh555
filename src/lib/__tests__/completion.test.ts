import { describe, expect, it } from "vitest";
import {
  awaitingCompletionFrom,
  canRequestCompletion,
  clockTime,
  completionCodeMatches,
  makeCompletionCode,
} from "../completion";
import { pausePatch, settleBooking } from "../metered";
import type { Booking, CompletionRequest } from "../types";

const T0 = new Date("2026-07-24T10:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);
const worker = { unit: "hr" as const, rate: 600 };

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    workerId: "w1",
    workerName: "Tijo",
    categoryId: "elec",
    subService: "Fan Repair",
    tenureId: "hr",
    stateId: "KL",
    quote: { serviceAmount: 600, surgeApplied: false, gst: 108, cess: 0, totalUserPays: 708, platformFee: 90, tds: 6, workerPayout: 504 },
    paymentMethod: "gpay",
    status: "in_progress",
    startCode: "1234",
    createdAt: T0.toISOString(),
    startedAt: T0.toISOString(),
    ...over,
  } as Booking;
}

const req: CompletionRequest = { by: "worker", at: at(67).toISOString(), code: "8421" };

describe("who can end a job, and who confirms", () => {
  it("a running job can be declared finished", () => {
    expect(canRequestCompletion(booking())).toBe(true);
  });

  it("a job that hasn't started can't be", () => {
    expect(canRequestCompletion(booking({ status: "accepted" }))).toBe(false);
  });

  it("only one completion request at a time", () => {
    expect(canRequestCompletion(booking({ completion: req }))).toBe(false);
  });

  it("the OTHER side confirms, never the one who raised it", () => {
    expect(awaitingCompletionFrom(req, "customer")).toBe(true); // worker raised it
    expect(awaitingCompletionFrom(req, "worker")).toBe(false);
  });

  it("either side may raise it — a customer can stop a runaway meter", () => {
    const byCustomer: CompletionRequest = { ...req, by: "customer" };
    expect(awaitingCompletionFrom(byCustomer, "worker")).toBe(true);
  });

  it("matches the 4-digit code exactly (trimmed)", () => {
    expect(completionCodeMatches(req, " 8421 ")).toBe(true);
    expect(completionCodeMatches(req, "0000")).toBe(false);
    expect(completionCodeMatches(undefined, "8421")).toBe(false);
  });

  it("generates a 4-digit code", () => {
    for (let i = 0; i < 50; i++) expect(makeCompletionCode()).toMatch(/^\d{4}$/);
  });
});

describe("the clock stops when work is declared done — not when it's confirmed", () => {
  it("a slow confirmation cannot inflate the bill", () => {
    // Work declared finished at 67 minutes; the meter freezes right there.
    const frozen = booking({ ...pausePatch(booking(), at(67)), completion: req });

    // The other side confirms 40 minutes later — the bill must not move.
    const settledLate = settleBooking(frozen, worker, at(107));
    const settledNow = settleBooking(frozen, worker, at(67));
    expect(settledLate!.settlement.billedMinutes).toBe(67);
    expect(settledLate!.settlement.billedMinutes).toBe(settledNow!.settlement.billedMinutes);
    expect(settledLate!.quote.totalUserPays).toBe(settledNow!.quote.totalUserPays);
  });

  it("a customer ending a runaway job is billed only to that moment", () => {
    // Worker never marked it complete; customer stops it at 70 minutes.
    const stopped = booking({ ...pausePatch(booking(), at(70)) });
    // Two hours pass before the worker confirms.
    const settled = settleBooking(stopped, worker, at(190));
    expect(settled!.settlement.billedMinutes).toBe(70); // not 190
  });
});

describe("the timestamp both sides see", () => {
  // Rendered in the viewer's own timezone (IST on a Kerala phone), so assert
  // the shape rather than a fixed hour — the test runner is UTC.
  it("renders a readable 12-hour clock time", () => {
    expect(clockTime("2026-07-24T18:37:00+05:30")).toMatch(/^\d{1,2}:\d{2}\s*(am|pm)$/i);
  });

  it("keeps the minutes exact — the record must match the real moment", () => {
    expect(clockTime("2026-07-24T18:37:00Z")).toMatch(/:37\s*(am|pm)$/i);
  });
});
