import { describe, expect, it } from "vitest";
import { calloutPayFor } from "../payment-policy";
import { workerCredit, workerEarningsSummary } from "../analytics";
import { lifetimeEarned } from "../earnings-wallet";
import { weekProgress } from "../weekly-goal";
import { billedMinutesFor } from "../metered";
import type { Booking, Quote } from "../types";

/**
 * The money follows whoever turned up.
 *
 * A worker who travelled out and gave up the slot is owed the hour whether or
 * not there turned out to be anything to fix. A worker who never arrived, or
 * whose own mistake ended the job, is owed nothing and the customer is made
 * whole.
 *
 * The rule was already written down — in `cancelRefund`, on the cancel sheet,
 * in the message the customer gets, on the front page. It was delivered
 * nowhere: the booking became `cancelled`, and every worker-facing total
 * counted `completed` alone. The worker drove out, the customer changed their
 * mind, and every screen the worker owned showed ₹0.
 */

const NOW = new Date("2026-07-16T18:00:00");

function quote(over: Partial<Quote> = {}): Quote {
  return {
    serviceAmount: 500,
    surgeApplied: false,
    gst: 90,
    cess: 0,
    totalUserPays: 590,
    platformFee: 75,
    tds: 5,
    workerPayout: 420,
    ...over,
  };
}

/** A job the customer paid for and then called off. */
function cancelled(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk1",
    workerId: "w1",
    workerName: "Rahul Sharma",
    categoryId: "elec",
    subService: "Fan Repair",
    tenureId: "hr",
    stateId: "KL",
    quote: quote(),
    paymentMethod: "gpay",
    status: "cancelled",
    startCode: "1234",
    createdAt: NOW.toISOString(),
    completedAt: NOW.toISOString(),
    payment: {
      timing: "base_then_settle",
      paidNow: 590,
      dueOnAccept: 590,
      balanceDue: 0,
      confirmedAt: NOW.toISOString(),
    },
    ...over,
  };
}

describe("what the worker is owed when a job is called off", () => {
  it("pays the hour when the customer cancels after the worker committed", () => {
    // He travelled out and held the slot. That is the hour.
    expect(calloutPayFor(cancelled({ status: "accepted" }))).toBe(420);
  });

  it("pays nothing when no worker had accepted yet", () => {
    // Nobody set off, so nobody is out of pocket.
    expect(calloutPayFor(cancelled({ status: "requested" }))).toBe(0);
  });

  it("pays nothing when the customer was never charged", () => {
    const unpaid = cancelled({
      status: "accepted",
      payment: {
        timing: "base_then_settle",
        paidNow: 0,
        dueOnAccept: 590,
        balanceDue: 0,
      },
    });
    expect(calloutPayFor(unpaid)).toBe(0);
  });

  it("pays nothing on a cash job, where no money ever moved", () => {
    expect(calloutPayFor(cancelled({ status: "accepted", paymentMethod: "cash" }))).toBe(0);
  });

  it("scales to the part actually paid", () => {
    // An advance-then-balance job forfeits only the advance.
    const half = cancelled({
      status: "accepted",
      payment: {
        timing: "advance_then_balance",
        paidNow: 295,
        dueOnAccept: 295,
        balanceDue: 295,
        confirmedAt: NOW.toISOString(),
      },
    });
    expect(calloutPayFor(half)).toBe(210);
  });
});

describe("the call-out reaches the worker", () => {
  const job = cancelled({ calloutPay: 420 });

  it("counts as money in the day's takings", () => {
    expect(workerEarningsSummary([job], "w1", NOW).today).toBe(420);
  });

  it("is not counted as a job done", () => {
    // He was paid for the trip, not for work he never got to do. Counting it
    // would inflate the completion record customers rank him by.
    expect(workerEarningsSummary([job], "w1", NOW).jobs).toBe(0);
    expect(weekProgress([job], "w1", 5000, NOW).jobs).toBe(0);
  });

  it("fills the weekly goal ring", () => {
    expect(weekProgress([job], "w1", 5000, NOW).earned).toBe(420);
  });

  it("is withdrawable from the wallet", () => {
    // The point of the whole thing: promised money he can actually take out.
    expect(lifetimeEarned([job], "w1")).toBe(420);
  });

  it("is worth nothing when the failure was the worker's", () => {
    // Worker never arrived: calloutPay is 0, the customer was made whole, and
    // no screen pretends otherwise.
    const noShow = cancelled({ calloutPay: 0 });
    expect(workerCredit(noShow)).toBe(0);
    expect(workerEarningsSummary([noShow], "w1", NOW).today).toBe(0);
    expect(lifetimeEarned([noShow], "w1")).toBe(0);
  });

  it("does not turn an old cancelled booking into money", () => {
    // Rows written before this field existed have no calloutPay and must stay
    // at zero rather than suddenly paying out a full payout.
    const legacy = cancelled();
    delete (legacy as { calloutPay?: number }).calloutPay;
    expect(workerCredit(legacy)).toBe(0);
    expect(lifetimeEarned([legacy], "w1")).toBe(0);
  });
});

describe("a finished job is unaffected", () => {
  it("still pays its full payout, once", () => {
    const done = cancelled({ status: "completed", calloutPay: undefined });
    expect(workerCredit(done)).toBe(420);
    expect(workerEarningsSummary([done], "w1", NOW).today).toBe(420);
    expect(workerEarningsSummary([done], "w1", NOW).jobs).toBe(1);
  });
});

describe("the worker attended and found nothing wrong", () => {
  it("still bills — and pays — the full hour", () => {
    // The scenario this whole rule came from: he travelled out, checked the
    // fan, and it was working. Ten minutes of his time, but an hour of his
    // day. The base hour covers time and travel, so a short visit bills sixty
    // minutes and no separate call-out is needed — the job simply completes.
    expect(billedMinutesFor(1)).toBe(60);
    expect(billedMinutesFor(10)).toBe(60);
    expect(billedMinutesFor(60)).toBe(60);
    // Past the grace he is paid for the minutes he actually worked.
    expect(billedMinutesFor(80)).toBe(80);
  });
});
