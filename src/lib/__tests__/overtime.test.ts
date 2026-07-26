import { describe, expect, it } from "vitest";
import { explainOvertime } from "../overtime";
import { settleBooking } from "../metered";
import type { Booking, Worker } from "../types";

const T0 = new Date("2026-07-26T09:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);
const worker = { id: "w1", rate: 500, unit: "hr" } as Worker;

function job(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1", workerId: "w1", workerName: "Rahul Sharma", categoryId: "elec",
    subService: "Fan Repair", tenureId: "hr", stateId: "KL",
    quote: { serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0, totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420 },
    paymentMethod: "gpay", status: "in_progress", startCode: "1111",
    createdAt: T0.toISOString(), startedAt: T0.toISOString(),
    ...over,
  } as Booking;
}

/** The 215-minute job from the reported screenshot. */
function settled215() {
  const b = job();
  const s = settleBooking(b, worker, at(215))!;
  return { ...b, quote: s.quote, settlement: s.settlement, status: "completed" } as Booking;
}

describe("the explanation matches the charge, to the rupee", () => {
  it("the extra shown equals the extra actually billed", () => {
    const b = settled215();
    const line = explainOvertime(b, worker)!;
    expect(line.extraTotal).toBe(b.settlement!.extraUserPays);
  });

  it("its own arithmetic adds up", () => {
    const line = explainOvertime(settled215(), worker)!;
    expect(line.extraService + line.extraGst + line.extraCess).toBe(line.extraTotal);
  });

  it("the per-minute rate is the hourly rate divided by sixty", () => {
    const line = explainOvertime(settled215(), worker)!;
    expect(line.ratePerMinute).toBeCloseTo(500 / 60, 2);
  });

  it("charges only the minutes past the base hour", () => {
    const line = explainOvertime(settled215(), worker)!;
    expect(line.actualMinutes).toBe(215);
    expect(line.extraMinutes).toBe(215 - 60);
    expect(line.baseMinutes).toBe(60);
  });

  it("the worker's share of the extra equals the settlement's", () => {
    const b = settled215();
    const line = explainOvertime(b, worker)!;
    expect(line.workerExtra).toBe(b.settlement!.extraWorkerPayout);
  });

  it("the worker's extra is the service amount minus fee and TDS", () => {
    const line = explainOvertime(settled215(), worker)!;
    expect(line.extraService - line.platformFee - line.tds).toBe(line.workerExtra);
  });
});

describe("when there is nothing to explain", () => {
  it("a job inside the base hour has no overtime", () => {
    const b = job();
    const s = settleBooking(b, worker, at(52))!;
    const done = { ...b, quote: s.quote, settlement: s.settlement } as Booking;
    expect(explainOvertime(done, worker)).toBeNull();
  });

  it("a job with no settlement has none either", () => {
    expect(explainOvertime(job(), worker)).toBeNull();
  });

  it("an unknown worker yields nothing rather than a wrong number", () => {
    expect(explainOvertime(settled215(), undefined)).toBeNull();
  });
});

describe("surge is shown, not hidden", () => {
  it("raises the per-minute rate and says so", () => {
    // A surged booking's own base-hour quote is surged too (₹500 × 1.2),
    // otherwise the settlement is comparing two different price bases.
    const b = job({
      quote: {
        serviceAmount: 600, surgeApplied: true, gst: 108, cess: 0,
        totalUserPays: 708, platformFee: 90, tds: 6, workerPayout: 504,
      },
    });
    const s = settleBooking(b, worker, at(215))!;
    const surged = { ...b, quote: s.quote, settlement: s.settlement } as Booking;
    const line = explainOvertime(surged, worker)!;
    expect(line.surgeApplied).toBe(true);
    expect(line.ratePerMinute).toBeCloseTo((500 * 1.2) / 60, 2);
    expect(line.extraTotal).toBe(surged.settlement!.extraUserPays);
  });
});
