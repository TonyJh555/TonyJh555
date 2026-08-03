import { describe, expect, it } from "vitest";
import {
  APOLOGY_CREDIT,
  ARRIVAL_BREACH_MINUTES,
  ARRIVAL_GRACE_MINUTES,
  arrivalState,
  breachCancelPatch,
  breachRefund,
  countsAsLateStrike,
  lateStrikes,
  minutesLate,
  noticeGivenInTime,
  noticePatch,
  promisedArrival,
} from "../arrival";
import type { Booking, Worker } from "../types";

const WORKER: Pick<Worker, "etaMinutes"> = { etaMinutes: 30 };

/** A job accepted and paid for, with the worker due at 15:00. */
function scheduled(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk-1",
    workerId: "kw-1",
    workerName: "Rahul Kumar",
    categoryId: "elec",
    subService: "Fan Repair",
    tenureId: "hr",
    stateId: "KL",
    quote: {
      serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0,
      totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420,
    },
    paymentMethod: "upi",
    status: "accepted",
    startCode: "1234",
    createdAt: "2026-08-03T09:00:00",
    schedule: { when: "scheduled", date: "2026-08-03", time: "15:00" },
    payment: { timing: "base_then_settle", paidNow: 590, balanceDue: 0, confirmedAt: "2026-08-03T09:05:00" },
    ...over,
  };
}

const at = (time: string) => new Date(`2026-08-03T${time}`);

describe("when the worker said they would be there", () => {
  it("is the slot, for a scheduled job", () => {
    expect(promisedArrival(scheduled(), WORKER)).toEqual(at("15:00"));
  });

  it("is payment plus their own ETA, for an ASAP job", () => {
    // Payment is when the app tells them to set off, so it is when the
    // promise starts. Before that nobody has agreed to travel anywhere.
    const asap = scheduled({ schedule: { when: "asap" } });
    expect(promisedArrival(asap, WORKER)).toEqual(at("09:35"));
  });

  it("is nothing at all before the customer has paid", () => {
    const unpaid = scheduled({
      schedule: { when: "asap" },
      payment: { timing: "base_then_settle", paidNow: 0, balanceDue: 590 },
    });
    expect(promisedArrival(unpaid, WORKER)).toBeNull();
  });
});

describe("how late they are", () => {
  it("counts from the promised time while the customer is still waiting", () => {
    expect(minutesLate(scheduled(), WORKER, at("15:25"))).toBe(25);
  });

  it("stops counting once they arrive — the start code is the proof", () => {
    const arrived = scheduled({ startedAt: "2026-08-03T15:40:00" });
    expect(minutesLate(arrived, WORKER, at("18:00"))).toBe(40);
  });

  it("is zero when they were early", () => {
    expect(minutesLate(scheduled(), WORKER, at("14:45"))).toBe(0);
  });
});

describe("the state the customer sees", () => {
  it("says nothing at all inside the grace — traffic is not a failure", () => {
    expect(arrivalState(scheduled(), WORKER, at("15:00"))).toBe("on_time");
    const edge = ARRIVAL_GRACE_MINUTES - 1;
    expect(arrivalState(scheduled(), WORKER, at(`15:${edge}`))).toBe("on_time");
  });

  it("shows late past the grace", () => {
    expect(arrivalState(scheduled(), WORKER, at("15:25"))).toBe("late");
  });

  it("offers the way out only after a full hour", () => {
    expect(arrivalState(scheduled(), WORKER, at("15:59"))).toBe("late");
    expect(arrivalState(scheduled(), WORKER, at("16:00"))).toBe("breached");
    expect(ARRIVAL_BREACH_MINUTES).toBe(60);
  });

  it("goes quiet once the job is actually running", () => {
    const running = scheduled({ status: "in_progress", startedAt: "2026-08-03T16:30:00" });
    expect(arrivalState(running, WORKER, at("18:00"))).toBe("unknown");
  });

  it("never calls a worker late when they arrived and nobody was home", () => {
    const absent = scheduled({ arrivalNotice: { reason: "customer_absent", at: "2026-08-03T15:05:00" } });
    expect(arrivalState(absent, WORKER, at("17:00"))).toBe("on_time");
  });
});

describe("what excuses a late arrival", () => {
  it("a warning sent before the promised time — whatever the reason", () => {
    const warned = scheduled({ arrivalNotice: { reason: "weather", minutes: 45, at: "2026-08-03T14:50:00" } });
    expect(noticeGivenInTime(warned, WORKER)).toBe(true);
    // Two hours late, and still no mark: they told the customer in time.
    expect(countsAsLateStrike(warned, WORKER, at("17:00"))).toBe(false);
  });

  it("not a warning sent once the customer has already given up", () => {
    // An explanation at 16:15 is not a warning. The damage is the waiting
    // without knowing, and it has already been done.
    const late = scheduled({ arrivalNotice: { reason: "traffic", minutes: 20, at: "2026-08-03T16:15:00" } });
    expect(noticeGivenInTime(late, WORKER)).toBe(false);
    expect(countsAsLateStrike(late, WORKER, at("16:20"))).toBe(true);
  });

  it("a warning sent exactly on the promised minute still counts as in time", () => {
    const onTheDot = scheduled({ arrivalNotice: { reason: "traffic", at: "2026-08-03T15:00:00" } });
    expect(noticeGivenInTime(onTheDot, WORKER)).toBe(true);
  });

  it("nothing at all is the one thing that counts", () => {
    expect(countsAsLateStrike(scheduled(), WORKER, at("16:05"))).toBe(true);
  });

  it("being merely late, having said nothing, is still not a strike", () => {
    expect(countsAsLateStrike(scheduled(), WORKER, at("15:40"))).toBe(false);
  });

  it("arriving to an empty house is never a strike", () => {
    const absent = scheduled({ arrivalNotice: { reason: "customer_absent", at: "2026-08-03T15:02:00" } });
    expect(countsAsLateStrike(absent, WORKER, at("17:00"))).toBe(false);
  });

  it("a job that was never accepted cannot be arrived at late", () => {
    expect(countsAsLateStrike(scheduled({ status: "requested" }), WORKER, at("18:00"))).toBe(false);
    expect(countsAsLateStrike(scheduled({ status: "cancelled" }), WORKER, at("18:00"))).toBe(false);
  });

  it("judges a finished job by when it actually started", () => {
    const done = scheduled({ status: "completed", startedAt: "2026-08-03T16:30:00" });
    expect(countsAsLateStrike(done, WORKER, at("20:00"))).toBe(true);
    const punctual = scheduled({ status: "completed", startedAt: "2026-08-03T15:05:00" });
    expect(countsAsLateStrike(punctual, WORKER, at("20:00"))).toBe(false);
  });
});

describe("a worker's record", () => {
  const NOW = new Date("2026-08-03T20:00:00");

  it("counts only unwarned breaches, and only recent ones", () => {
    const old = scheduled({
      id: "bk-old",
      createdAt: "2026-05-01T09:00:00",
      schedule: { when: "scheduled", date: "2026-05-01", time: "15:00" },
      status: "completed",
      startedAt: "2026-05-01T17:00:00",
    });
    const recent = scheduled({ id: "bk-recent", status: "completed", startedAt: "2026-08-03T16:30:00" });
    const warned = scheduled({
      id: "bk-warned",
      status: "completed",
      startedAt: "2026-08-03T16:30:00",
      arrivalNotice: { reason: "vehicle", at: "2026-08-03T14:40:00" },
    });

    const strikes = lateStrikes([old, recent, warned], "kw-1", WORKER, NOW);
    expect(strikes.map((b) => b.id)).toEqual(["bk-recent"]);
  });

  it("is empty for a worker who always sends word", () => {
    const warned = scheduled({
      status: "completed",
      startedAt: "2026-08-03T17:00:00",
      arrivalNotice: { reason: "previous_job", at: "2026-08-03T14:30:00" },
    });
    expect(lateStrikes([warned], "kw-1", WORKER, NOW)).toEqual([]);
  });

  it("does not blame one worker for another's booking", () => {
    const someoneElse = scheduled({ workerId: "kw-2", status: "completed", startedAt: "2026-08-03T17:00:00" });
    expect(lateStrikes([someoneElse], "kw-1", WORKER, NOW)).toEqual([]);
  });
});

describe("giving up on a worker who never came", () => {
  it("returns everything the customer paid — the base hour is not forfeited", () => {
    // Nobody travelled, so there is no trip to protect.
    expect(breachRefund(scheduled())).toBe(590);
  });

  it("pays the worker nothing, and fines them nothing", () => {
    const patch = breachCancelPatch(new Date("2026-08-03T16:05:00"));
    expect(patch.status).toBe("cancelled");
    expect(patch.calloutPay).toBe(0);
    expect(patch.cancelReason).toContain("did not arrive");
  });

  it("apologises with KAAM's money", () => {
    expect(APOLOGY_CREDIT).toBeGreaterThan(0);
  });
});

describe("the notice a worker sends", () => {
  it("records the reason and the moment it was sent", () => {
    const now = new Date("2026-08-03T14:50:00");
    const patch = noticePatch("traffic", 20, now);
    expect(patch.arrivalNotice).toEqual({
      reason: "traffic",
      minutes: 20,
      at: now.toISOString(),
    });
  });
});
