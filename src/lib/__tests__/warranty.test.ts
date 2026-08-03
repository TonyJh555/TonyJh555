import { describe, expect, it } from "vitest";
import {
  revisitFrom,
  revisitQuote,
  warrantyApplies,
  warrantyDaysLeft,
  warrantyEndsAt,
  warrantyOpen,
  warrantyUsedPatch,
} from "../warranty";
import { CAP_LIMITS, sanitiseCaps } from "../site-settings";
import type { Booking, Quote } from "../types";

/**
 * If the same fault comes back, someone comes back — free.
 *
 * The promise only works if two things hold: it covers the same fault rather
 * than any new job, and KAAM funds it rather than the worker. A warranty the
 * worker pays for is unpaid labour, and the predictable result is that good
 * workers stop taking hard repairs.
 */

const DONE = new Date("2026-08-02T17:00:00");
const DAYS = 7;

function quote(over: Partial<Quote> = {}): Quote {
  return {
    serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0,
    totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420, ...over,
  };
}

function finished(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk1", customerId: "c1", workerId: "w1", workerName: "Rahul Sharma",
    categoryId: "elec", subService: "Fan Repair", tenureId: "hr", stateId: "KL",
    quote: quote(), paymentMethod: "gpay", status: "completed", startCode: "1234",
    address: "Kakkanad", createdAt: DONE.toISOString(), completedAt: DONE.toISOString(),
    ...over,
  };
}

const days = (n: number) => new Date(DONE.getTime() + n * 86_400_000);

describe("what is covered", () => {
  it("covers a finished repair", () => {
    expect(warrantyApplies(finished())).toBe(true);
  });

  it("does not cover a job that never finished", () => {
    expect(warrantyApplies(finished({ status: "in_progress" }))).toBe(false);
    expect(warrantyApplies(finished({ status: "cancelled" }))).toBe(false);
  });

  it("does not cover a performance or a care visit", () => {
    // A violinist's Tuesday cannot come back broken.
    expect(warrantyApplies(finished({ categoryId: "violin" }))).toBe(false);
    expect(warrantyApplies(finished({ categoryId: "nurse" }))).toBe(false);
  });
});

describe("the window", () => {
  it("runs from the day the work finished", () => {
    expect(warrantyEndsAt(finished(), DAYS)!.toDateString()).toBe(days(7).toDateString());
  });

  it("is open inside it and shut after", () => {
    expect(warrantyOpen(finished(), DAYS, days(1))).toBe(true);
    expect(warrantyOpen(finished(), DAYS, days(6.9))).toBe(true);
    expect(warrantyOpen(finished(), DAYS, days(8))).toBe(false);
  });

  it("counts down honestly", () => {
    expect(warrantyDaysLeft(finished(), DAYS, days(0))).toBe(7);
    expect(warrantyDaysLeft(finished(), DAYS, days(5))).toBe(2);
    expect(warrantyDaysLeft(finished(), DAYS, days(30))).toBe(0);
  });

  it("shuts once the free visit has been claimed", () => {
    // One recurrence is covered automatically. A second is a conversation with
    // support, not an endless chain of free visits.
    const used = finished({ warrantyUsedAt: days(1).toISOString() });
    expect(warrantyOpen(used, DAYS, days(2))).toBe(false);
  });

  it("does not give a revisit its own warranty", () => {
    const revisit = finished({ revisitOf: "bk1" });
    expect(warrantyOpen(revisit, DAYS, days(1))).toBe(false);
  });
});

describe("who pays", () => {
  it("charges the customer nothing", () => {
    const q = revisitQuote(quote());
    expect(q.totalUserPays).toBe(0);
    expect(q.gst).toBe(0);
    expect(q.cess).toBe(0);
  });

  it("pays the worker exactly what they would have earned", () => {
    // The whole point. A warranty the worker funds is unpaid labour.
    expect(revisitQuote(quote()).workerPayout).toBe(420);
    expect(revisitQuote(quote({ workerPayout: 900 })).workerPayout).toBe(900);
  });

  it("takes no commission on its own promise", () => {
    expect(revisitQuote(quote()).platformFee).toBe(0);
  });

  it("never inflates GMV with a job nobody paid for", () => {
    // The books should read what happened: a payout with no revenue behind it.
    expect(revisitQuote(quote()).serviceAmount).toBe(0);
  });
});

describe("the revisit booking", () => {
  const revisit = revisitFrom(finished(), "Fan started making the same noise", days(3));

  it("is a new job linked to the old one", () => {
    expect(revisit.id).not.toBe("bk1");
    expect(revisit.revisitOf).toBe("bk1");
    expect(revisit.revisitReason).toBe("Fan started making the same noise");
  });

  it("goes to the worker who did it, first", () => {
    // They know the fault, the house and what they already tried. If they
    // decline it dispatches onward like any other offer.
    expect(revisit.workerId).toBe("w1");
    expect(revisit.status).toBe("requested");
  });

  it("keeps the same customer, service and address", () => {
    expect(revisit.customerId).toBe("c1");
    expect(revisit.subService).toBe("Fan Repair");
    expect(revisit.address).toBe("Kakkanad");
  });

  it("owes nothing, so no payment step ever appears", () => {
    expect(revisit.payment!.balanceDue).toBe(0);
    expect(revisit.payment!.dueOnAccept).toBe(0);
    expect(revisit.payment!.confirmedAt).toBeTruthy();
  });

  it("starts clean — none of the first visit's history", () => {
    // A revisit that inherited the old meter would bill the customer for work
    // they already paid for.
    expect(revisit.startedAt).toBeUndefined();
    expect(revisit.completedAt).toBeUndefined();
    expect(revisit.bankedMs).toBeUndefined();
    expect(revisit.settlement).toBeUndefined();
    expect(revisit.completion).toBeUndefined();
    expect(revisit.rating).toBeUndefined();
    expect(revisit.report).toBeUndefined();
  });

  it("marks the original as spent", () => {
    expect(warrantyUsedPatch(days(3)).warrantyUsedAt).toBe(days(3).toISOString());
  });
});

describe("the owner can move the window, within reason", () => {
  it("ships at seven days", () => {
    expect(sanitiseCaps({}).warrantyDays).toBe(7);
  });

  it("can be switched off entirely", () => {
    // Zero is a legitimate choice — it means "no free revisit".
    expect(sanitiseCaps({ warrantyDays: 0 }).warrantyDays).toBe(0);
  });

  it("cannot be set to a year by accident", () => {
    expect(sanitiseCaps({ warrantyDays: 999 }).warrantyDays).toBe(CAP_LIMITS.warrantyDays.max);
  });

  it("falls back to the shipped value for nonsense", () => {
    expect(sanitiseCaps({ warrantyDays: "ages" }).warrantyDays).toBe(7);
  });
});
