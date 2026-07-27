import { describe, expect, it } from "vitest";
import {
  minutesOverdue,
  noShowGraceLapsed,
  NO_SHOW_GRACE_MINUTES,
  noShowPatch,
  noShowSettlement,
  resumeDueAt,
} from "../no-show";
import type { Booking, Worker } from "../types";

const WORKER = { unit: "hr", rate: 500 } as Pick<Worker, "unit" | "rate">;

/** A job paused mid-way, with the worker due back at 15:00. */
function paused(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    workerId: "w1",
    workerName: "Arun",
    categoryId: "elec",
    subService: "Wiring",
    tenureId: "hr",
    stateId: "KL",
    quote: { serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0,
             totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420 },
    paymentMethod: "gpay",
    status: "in_progress",
    startCode: "1234",
    createdAt: "2026-07-26T09:00:00",
    schedule: { when: "scheduled", date: "2026-07-26", time: "15:00" },
    pausedAt: "2026-07-26T10:30:00",
    bankedMs: 30 * 60_000, // 30 minutes worked before the pause
    payment: { timing: "base_then_settle", paidNow: 590, balanceDue: 0 },
    ...over,
  } as Booking;
}

const at = (hhmm: string) => new Date(`2026-07-26T${hhmm}`);

describe("being late is not the same as never coming", () => {
  it("knows when the worker was due back", () => {
    expect(resumeDueAt(paused())?.getHours()).toBe(15);
  });

  it("offers nothing while the worker is merely late", () => {
    expect(noShowGraceLapsed(paused(), at("15:20"))).toBe(false);
    expect(minutesOverdue(paused(), at("15:20"))).toBe(20);
  });

  it("offers the way out once the grace has run out", () => {
    const justAfter = at(`15:${NO_SHOW_GRACE_MINUTES}`);
    expect(noShowGraceLapsed(paused(), justAfter)).toBe(true);
  });

  it("counts nothing before the agreed time", () => {
    expect(minutesOverdue(paused(), at("14:00"))).toBe(0);
    expect(noShowGraceLapsed(paused(), at("14:00"))).toBe(false);
  });

  it("says nothing about a job that is running, or was never rescheduled", () => {
    expect(resumeDueAt(paused({ pausedAt: undefined }))).toBeNull();
    expect(resumeDueAt(paused({ schedule: { when: "asap" } }))).toBeNull();
    expect(resumeDueAt(paused({ status: "completed" }))).toBeNull();
  });
});

describe("a no-show charges only for the minutes actually worked", () => {
  it("bills the worked minutes and returns the rest", () => {
    // 30 min at ₹500/hr = ₹250 + 18% GST = ₹295. ₹590 was collected.
    const s = noShowSettlement(paused(), WORKER);
    expect(s.workedMinutes).toBe(30);
    expect(s.fairTotal).toBe(295);
    expect(s.workerKeeps).toBe(295);
    expect(s.refund).toBe(295);
  });

  it("never forfeits the base hour to a worker who did not come", () => {
    // The forfeiture rule protects a committed trip. There was no trip.
    const s = noShowSettlement(paused(), WORKER);
    expect(s.workerKeeps).toBeLessThan(590);
    expect(s.refund).toBeGreaterThan(0);
  });

  it("returns everything when no minutes were worked at all", () => {
    const s = noShowSettlement(paused({ bankedMs: 0 }), WORKER);
    expect(s.workedMinutes).toBe(0);
    expect(s.refund).toBe(590);
    expect(s.workerKeeps).toBe(0);
  });

  it("never refunds more than was collected", () => {
    const s = noShowSettlement(paused({ payment: undefined }), WORKER);
    expect(s.refund).toBe(0);
    expect(s.collected).toBe(0);
  });

  it("returns what was taken for non-metered work", () => {
    // A per-visit job has no per-minute price to settle against.
    const s = noShowSettlement(paused(), { unit: "visit", rate: 500 });
    expect(s.refund).toBe(590);
  });

  it("caps the charge at what was collected, never above it", () => {
    const s = noShowSettlement(
      paused({ bankedMs: 55 * 60_000, payment: { timing: "base_then_settle", paidNow: 100, balanceDue: 0 } }),
      WORKER,
    );
    expect(s.workerKeeps).toBe(100);
    expect(s.refund).toBe(0);
  });
});

describe("closing an abandoned job", () => {
  it("does not call an unfinished job completed", () => {
    const p = noShowPatch(paused(), at("16:00"));
    expect(p.status).toBe("cancelled");
    expect(p.cancelReason).toMatch(/did not return/i);
  });

  it("clears the pause so the job cannot be resumed afterwards", () => {
    const p = noShowPatch(paused(), at("16:00"));
    expect(p.pausedAt).toBeUndefined();
    expect(p.reschedule).toBeUndefined();
  });
});
