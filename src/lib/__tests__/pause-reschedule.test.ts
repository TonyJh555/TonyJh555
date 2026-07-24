import { describe, expect, it } from "vitest";
import {
  FINISH_ALARM_MINUTES,
  finishAlarmDue,
  pausePatch,
  resumePatch,
  settleBooking,
  workedMinutes,
} from "../metered";
import {
  awaitingApprovalFrom,
  canReschedule,
  codeMatches,
  MAX_RESCHEDULES,
  reschedulesLeft,
} from "../reschedule";
import type { Booking, RescheduleRequest } from "../types";

const T0 = new Date("2026-07-24T10:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

const worker = { unit: "hr" as const, rate: 600 };

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    workerId: "w1",
    workerName: "Rahul",
    categoryId: "elec",
    subService: "Wiring",
    tenureId: "hr",
    stateId: "KL",
    quote: { serviceAmount: 600, surgeApplied: false, gst: 108, cess: 0, totalUserPays: 708, platformFee: 90, tds: 6, workerPayout: 504 },
    paymentMethod: "upi",
    status: "in_progress",
    startCode: "1234",
    createdAt: T0.toISOString(),
    startedAt: T0.toISOString(),
    ...over,
  } as Booking;
}

describe("pause-aware worked time", () => {
  it("counts elapsed minutes on a running job", () => {
    expect(workedMinutes(booking(), at(20))).toBe(20);
  });

  it("freezes worked time while paused (customer pays nothing for the gap)", () => {
    // Worked 20 min, then paused. Banked = 20 min.
    const paused = booking({ ...pausePatch(booking(), at(20)) });
    // Even 3 days later, worked time is still the banked 20 min.
    expect(workedMinutes(paused, at(3 * 24 * 60))).toBe(20);
  });

  it("resumes and adds the second visit's minutes to the banked total", () => {
    const paused = booking({ ...pausePatch(booking(), at(20)) }); // 20 min banked
    const resumed = booking({ ...paused, ...resumePatch(at(24 * 60)) }); // resume next day
    // 40 more minutes worked on the second visit → 20 + 40 = 60 total.
    expect(workedMinutes(resumed, at(24 * 60 + 40))).toBe(60);
  });

  it("settles the whole job on total worked minutes across both visits", () => {
    const paused = booking({ ...pausePatch(booking(), at(20)) });
    const resumed = booking({ ...paused, ...resumePatch(at(24 * 60)) });
    // 20 + 50 = 70 min worked → billed 70 (past base+grace).
    const settled = settleBooking(resumed, worker, at(24 * 60 + 50));
    expect(settled?.settlement.billedMinutes).toBe(70);
    expect(settled?.settlement.extraMinutes).toBe(10);
  });
});

describe("finish alarm (5 min before the base hour)", () => {
  it("fires once a running metered job passes 55 minutes", () => {
    expect(FINISH_ALARM_MINUTES).toBe(55);
    expect(finishAlarmDue(booking(), worker, at(54))).toBe(false);
    expect(finishAlarmDue(booking(), worker, at(55))).toBe(true);
  });

  it("does not fire while paused or once completed", () => {
    const paused = booking({ ...pausePatch(booking(), at(20)) });
    expect(finishAlarmDue(paused, worker, at(24 * 60))).toBe(false);
    expect(finishAlarmDue(booking({ status: "completed" }), worker, at(70))).toBe(false);
  });
});

describe("reschedule rules", () => {
  const req: RescheduleRequest = {
    by: "worker",
    date: "2026-07-25",
    time: "10:00",
    code: "4821",
    requestedAt: T0.toISOString(),
  };

  it("allows up to 3 reschedules on an in-progress job", () => {
    expect(canReschedule(booking())).toBe(true);
    expect(canReschedule(booking({ rescheduleCount: MAX_RESCHEDULES }))).toBe(false);
    expect(reschedulesLeft(booking({ rescheduleCount: 1 }))).toBe(2);
  });

  it("blocks a second request while one is already pending", () => {
    expect(canReschedule(booking({ reschedule: req }))).toBe(false);
  });

  it("matches the 4-digit code exactly (trimmed)", () => {
    expect(codeMatches(req, " 4821 ")).toBe(true);
    expect(codeMatches(req, "0000")).toBe(false);
    expect(codeMatches(undefined, "4821")).toBe(false);
  });

  it("asks the OTHER side to approve", () => {
    expect(awaitingApprovalFrom(req, "customer")).toBe(true); // worker proposed
    expect(awaitingApprovalFrom(req, "worker")).toBe(false);
  });
});
