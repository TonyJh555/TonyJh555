import { describe, expect, it } from "vitest";
import {
  payoutByMonth,
  payoutByWeekday,
  workerDailyTrend,
  securedNotEarned,
  workerEarningsSummary,
} from "../analytics";
import { weekProgress } from "../weekly-goal";
import type { Booking, Quote } from "../types";

/**
 * Money lands on the day the work finished, not the day it was ordered.
 *
 * A worker finished a job today and their Today meter read ₹0. The booking had
 * been created five days earlier — a customer books on Monday for Saturday, or
 * an offer sits in the queue over a weekend — and every earnings figure in the
 * app bucketed by `createdAt`. So the payout was filed under the day the
 * customer tapped Book, a day that is already closed.
 *
 * The effect on the person: they finish a job, the money is real, and the
 * screen that is supposed to show today's takings still says zero. On a
 * Monday-to-Sunday goal ring the money can land in a week that has already
 * ended, where they can never see it.
 *
 * `completedAt` was already recorded on every completion and already carried
 * to Supabase — it was simply never used for this.
 */

const MON = new Date("2026-07-13T09:00:00"); // booked
const SAT = new Date("2026-07-18T16:00:00"); // worked and finished
const NOW = new Date("2026-07-18T18:00:00"); // looking at the screen

function quote(over: Partial<Quote> = {}): Quote {
  return {
    serviceAmount: 1000,
    surgeApplied: false,
    gst: 180,
    cess: 0,
    totalUserPays: 1180,
    platformFee: 150,
    tds: 10,
    workerPayout: 840,
    ...over,
  };
}

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: Math.random().toString(36).slice(2),
    workerId: "w1",
    workerName: "Rahul Sharma",
    categoryId: "elec",
    subService: "Fan Repair",
    tenureId: "hr",
    stateId: "KL",
    quote: quote(),
    paymentMethod: "gpay",
    status: "completed",
    startCode: "1234",
    createdAt: MON.toISOString(),
    completedAt: SAT.toISOString(),
    ...over,
  };
}

describe("a job booked one day and finished another", () => {
  const jobs = [booking()];

  it("counts toward the day it was finished", () => {
    const s = workerEarningsSummary(jobs, "w1", NOW);
    expect(s.today).toBe(840);
    expect(s.jobsToday).toBe(1);
  });

  it("lands on the finishing weekday in the bar chart", () => {
    const bars = payoutByWeekday(jobs, "w1");
    const sat = bars.find((b) => b.label === "Sat")!;
    const mon = bars.find((b) => b.label === "Mon")!;
    expect(sat.value).toBe(840);
    expect(mon.value).toBe(0);
  });

  it("lands on the finishing day in the 30-day trend", () => {
    const trend = workerDailyTrend(jobs, "w1", 30, NOW);
    const last = trend[trend.length - 1];
    expect(last.value).toBe(840);
  });

  it("fills the goal ring on the day the work was done", () => {
    const p = weekProgress(jobs, "w1", 5000, NOW);
    expect(p.earned).toBe(840);
    // Saturday is index 5 on a Monday-first week.
    expect(p.days[5].value).toBe(840);
    expect(p.days[0].value).toBe(0);
  });
});

describe("a job that crosses a boundary", () => {
  it("is not filed in a week the worker can no longer see", () => {
    // Booked the previous Saturday, finished on the Monday. Bucketing by
    // createdAt drops it into last week, where the goal ring never shows it.
    const job = booking({
      createdAt: new Date("2026-07-11T10:00:00").toISOString(),
      completedAt: new Date("2026-07-13T11:00:00").toISOString(),
    });
    const p = weekProgress([job], "w1", 5000, new Date("2026-07-13T12:00:00"));
    expect(p.earned).toBe(840);
    expect(p.days[0].value).toBe(840);
  });

  it("is not filed in a month that has already been reported", () => {
    const job = booking({
      createdAt: new Date("2026-06-29T10:00:00").toISOString(),
      completedAt: new Date("2026-07-02T11:00:00").toISOString(),
    });
    const s = workerEarningsSummary([job], "w1", new Date("2026-07-02T12:00:00"));
    expect(s.month).toBe(840);
    // payoutByMonth's third argument is a calendar year, not a clock.
    const months = payoutByMonth([job], "w1", 2026);
    expect(months.find((m) => m.label === "Jul")!.value).toBe(840);
    expect(months.find((m) => m.label === "Jun")!.value).toBe(0);
  });
});

describe("bookings that predate the completedAt field", () => {
  it("still count, using the day they were created", () => {
    // Old rows have no completedAt. Falling back keeps their history intact
    // rather than quietly zeroing a worker's past earnings.
    const old = booking({ completedAt: undefined, createdAt: SAT.toISOString() });
    const s = workerEarningsSummary([old], "w1", NOW);
    expect(s.today).toBe(840);
  });
});

describe("work that is paid for but not finished", () => {
  it("is not counted as earned", () => {
    // The customer has paid the base hour and the worker has not started. The
    // money is committed, but it is not takings yet, and the Today meter is a
    // record of work done.
    const accepted = booking({ status: "accepted", completedAt: undefined });
    const s = workerEarningsSummary([accepted], "w1", NOW);
    expect(s.today).toBe(0);
    expect(s.jobs).toBe(0);
  });
});

describe("money paid in but not yet earned", () => {
  const paid = {
    timing: "base_then_settle" as const,
    paidNow: 590,
    dueOnAccept: 590,
    balanceDue: 0,
    confirmedAt: SAT.toISOString(),
  };

  it("counts an accepted job the customer has paid for", () => {
    expect(securedNotEarned([booking({ status: "accepted", payment: paid })], "w1")).toBe(840);
  });

  it("counts a job already under way", () => {
    expect(securedNotEarned([booking({ status: "in_progress", payment: paid })], "w1")).toBe(840);
  });

  it("ignores a job the customer has not paid for yet", () => {
    const unpaid = { ...paid, confirmedAt: undefined };
    expect(securedNotEarned([booking({ status: "accepted", payment: unpaid })], "w1")).toBe(0);
  });

  it("ignores a finished job, which is earnings and counted there", () => {
    // Counting it in both places would show the same rupee twice.
    expect(securedNotEarned([booking({ status: "completed", payment: paid })], "w1")).toBe(0);
  });

  it("ignores another worker's job", () => {
    expect(securedNotEarned([booking({ workerId: "w2", status: "accepted", payment: paid })], "w1")).toBe(0);
  });

  it("never overlaps with what the earnings summary reports", () => {
    const jobs = [
      booking({ id: "a", status: "completed", payment: paid }),
      booking({ id: "b", status: "accepted", payment: paid }),
    ];
    expect(workerEarningsSummary(jobs, "w1", NOW).today).toBe(840);
    expect(securedNotEarned(jobs, "w1")).toBe(840);
  });
});
