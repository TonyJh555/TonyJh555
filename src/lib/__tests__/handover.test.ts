import { describe, expect, it } from "vitest";
import {
  handoverAvailable,
  handoverFrom,
  handoverPatch,
  handoverQuote,
} from "../handover";
import { BASE_MINUTES, meteredQuote, settleBooking } from "../metered";
import { NO_SHOW_GRACE_MINUTES } from "../no-show";
import type { JobReport } from "../job-report";
import type { Booking, Worker } from "../types";

const NOW = new Date("2026-08-03T18:00:00");

/** A repair the worker paused and agreed to come back to at 14:00. */
function abandoned(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk-1",
    workerId: "kw-1",
    workerName: "Rahul Kumar",
    categoryId: "elec",
    subService: "Fan Repair",
    tenureId: "hr",
    stateId: "KL",
    address: "Kakkanad, Kochi",
    quote: meteredQuote(400, BASE_MINUTES, false, "KL"),
    paymentMethod: "upi",
    status: "in_progress",
    startCode: "1234",
    createdAt: "2026-08-02T09:00:00.000Z",
    startedAt: "2026-08-02T09:00:00.000Z",
    bankedMs: 45 * 60_000,
    pausedAt: "2026-08-02T09:45:00.000Z",
    schedule: { when: "scheduled", date: "2026-08-03", time: "14:00" },
    payment: {
      timing: "base_then_settle",
      paidNow: meteredQuote(400, BASE_MINUTES, false, "KL").totalUserPays,
      balanceDue: 0,
    },
    ...over,
  };
}

const NEXT: Pick<Worker, "id" | "name" | "rate"> = { id: "kw-9", name: "Suresh Nair", rate: 400 };
const METER: Pick<Worker, "unit" | "rate"> = { unit: "hr", rate: 400 };

const REPORT: JobReport = {
  did: ["diagnosed", "replaced"],
  left: "needs_part",
  part: "capacitor",
  photos: ["data:image/jpeg;base64,x"],
  at: "2026-08-02T09:45:00.000Z",
};

describe("when a job can be handed to someone else", () => {
  it("is offered once the worker is as overdue as ending it would need", () => {
    expect(handoverAvailable(abandoned(), NOW)).toBe(true);
  });

  it("is not offered while the worker is merely late", () => {
    const justLate = new Date("2026-08-03T14:00:00");
    justLate.setMinutes(justLate.getMinutes() + NO_SHOW_GRACE_MINUTES - 1);
    expect(handoverAvailable(abandoned(), justLate)).toBe(false);
  });

  it("is never offered on work that isn't billed by the clock", () => {
    // A singer's booking has no half-finished state to hand over.
    expect(handoverAvailable(abandoned({ categoryId: "singer" }), NOW)).toBe(false);
  });

  it("is not offered twice — the successor is the live job now", () => {
    expect(handoverAvailable(abandoned({ handedTo: "bk-2" }), NOW)).toBe(false);
  });

  it("is not offered when the report says nothing is left to do", () => {
    const done: JobReport = { ...REPORT, left: "nothing" };
    expect(handoverAvailable(abandoned({ report: done }), NOW)).toBe(false);
  });

  it("IS offered when no report was left at all", () => {
    // A worker who walked away often wrote nothing, and that is exactly when
    // the customer most needs someone else to come.
    expect(handoverAvailable(abandoned({ report: undefined }), NOW)).toBe(true);
  });
});

describe("what the handover costs", () => {
  it("asks the customer for nothing up front", () => {
    const q = handoverQuote(400, "KL");
    expect(q.totalUserPays).toBe(0);
    expect(q.serviceAmount).toBe(0);
    expect(q.gst).toBe(0);
  });

  it("shows the worker the base hour as the guaranteed trip", () => {
    const q = handoverQuote(400, "KL");
    expect(q.workerPayout).toBe(meteredQuote(400, BASE_MINUTES, false, "KL").workerPayout);
    expect(q.workerPayout).toBeGreaterThan(0);
  });

  it("never applies surge — a premium to fix KAAM's own failure is a penalty", () => {
    expect(handoverQuote(400, "KL").surgeApplied).toBe(false);
  });
});

describe("the booking that carries the job on", () => {
  const original = abandoned({ report: REPORT });
  const next = handoverFrom(original, NEXT, NOW);

  it("is a fresh request offered to the new worker", () => {
    expect(next.id).not.toBe(original.id);
    expect(next.status).toBe("requested");
    expect(next.workerId).toBe("kw-9");
    expect(next.workerName).toBe("Suresh Nair");
  });

  it("points back at the job it continues", () => {
    expect(next.handoverOf).toBe("bk-1");
  });

  it("carries the report and the photographs", () => {
    expect(next.report).toEqual(REPORT);
    expect(next.report?.photos).toHaveLength(1);
  });

  it("carries none of the first visit's clock", () => {
    expect(next.startedAt).toBeUndefined();
    expect(next.bankedMs).toBeUndefined();
    expect(next.pausedAt).toBeUndefined();
    expect(next.completedAt).toBeUndefined();
    expect(next.settlement).toBeUndefined();
    expect(next.rescheduleCount).toBeUndefined();
  });

  it("gets a new start code — the old one was read out to someone else", () => {
    expect(next.startCode).not.toBe(original.startCode);
    expect(next.startCode).toMatch(/^[1-9]\d{3}$/);
  });

  it("is pre-confirmed with nothing collected, so it can start at once", () => {
    expect(next.payment?.confirmedAt).toBe(NOW.toISOString());
    expect(next.payment?.paidNow).toBe(0);
    expect(next.payment?.dueOnAccept).toBe(0);
    expect(next.payment?.balanceDue).toBe(0);
  });

  it("keeps the customer, the address and the work", () => {
    expect(next.address).toBe(original.address);
    expect(next.subService).toBe(original.subService);
    expect(next.categoryId).toBe(original.categoryId);
  });
});

describe("closing the job that was abandoned", () => {
  const original = abandoned();
  const patch = handoverPatch(original, "bk-2", NOW, METER);

  it("points forward at its successor", () => {
    expect(patch.handedTo).toBe("bk-2");
  });

  it("says what actually happened, not just 'cancelled'", () => {
    expect(patch.status).toBe("cancelled");
    expect(patch.cancelReason).toContain("handed to another worker");
  });

  it("pays the first worker for the minutes they really worked", () => {
    // 45 minutes were banked before the pause.
    expect(patch.calloutPay).toBe(
      meteredQuote(400, 45, false, "KL").totalUserPays,
    );
  });

  it("clears the pause so the job cannot be resumed behind the handover", () => {
    expect(patch.pausedAt).toBeUndefined();
    expect(patch.reschedule).toBeUndefined();
  });
});

describe("settling the visit that finished the job", () => {
  const original = abandoned({ report: REPORT });

  /** The handover, started and run for `minutes`. */
  function ran(minutes: number): Booking {
    const next = handoverFrom(original, NEXT, NOW);
    return {
      ...next,
      status: "in_progress",
      startedAt: NOW.toISOString(),
      bankedMs: minutes * 60_000,
      pausedAt: NOW.toISOString(),
    };
  }

  it("bills from the first minute — the base hour was already bought once", () => {
    const settled = settleBooking(ran(20), METER, NOW)!;
    expect(settled.settlement.billedMinutes).toBe(20);
    expect(settled.quote.totalUserPays).toBe(meteredQuote(400, 20, false, "KL").totalUserPays);
  });

  it("charges an ordinary job the whole base hour for the same 20 minutes", () => {
    // The contrast is the point: this rule applies to handovers and nothing else.
    const ordinary: Booking = {
      ...abandoned(),
      status: "in_progress",
      startedAt: NOW.toISOString(),
      bankedMs: 20 * 60_000,
      pausedAt: NOW.toISOString(),
    };
    expect(settleBooking(ordinary, METER, NOW)!.settlement.billedMinutes).toBe(BASE_MINUTES);
  });

  it("still pays the new worker the full trip for a twenty-minute finish", () => {
    const settled = settleBooking(ran(20), METER, NOW)!;
    const trip = meteredQuote(400, BASE_MINUTES, false, "KL").workerPayout;
    expect(settled.quote.workerPayout).toBe(trip);
    // And the customer was not billed for that guarantee.
    expect(settled.quote.totalUserPays).toBeLessThan(trip);
  });

  it("pays more than the trip when the finish takes longer than an hour", () => {
    const settled = settleBooking(ran(90), METER, NOW)!;
    const trip = meteredQuote(400, BASE_MINUTES, false, "KL").workerPayout;
    expect(settled.settlement.billedMinutes).toBe(90);
    expect(settled.quote.workerPayout).toBe(meteredQuote(400, 90, false, "KL").workerPayout);
    expect(settled.quote.workerPayout).toBeGreaterThan(trip);
  });

  it("bills the customer the whole settled amount, since they prepaid nothing", () => {
    const settled = settleBooking(ran(90), METER, NOW)!;
    expect(settled.settlement.extraUserPays).toBe(settled.quote.totalUserPays);
  });

  it("respects the daily cap like any other metered job", () => {
    const settled = settleBooking(ran(600), METER, NOW, 480)!;
    expect(settled.settlement.actualMinutes).toBe(600);
    expect(settled.settlement.billedMinutes).toBe(480);
  });
});
