import { describe, expect, it } from "vitest";
import { availableBalance, lifetimeEarned, pendingEarnings, tipsEarned } from "../earnings-wallet";
import { cancelRefund, invoiceTotals } from "../payment-policy";
import { dueReminder } from "../reminders";
import type { Booking } from "../types";

const T0 = new Date("2026-07-25T10:00:00Z");
const QUOTE = {
  serviceAmount: 700, surgeApplied: false, gst: 126, cess: 0,
  totalUserPays: 826, platformFee: 105, tds: 7, workerPayout: 588,
};

function job(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1", workerId: "w1", workerName: "Rahul Sharma", categoryId: "elec",
    subService: "Fan Repair", tenureId: "hr", stateId: "KL", quote: QUOTE,
    paymentMethod: "gpay", status: "completed", startCode: "1234",
    createdAt: T0.toISOString(), completedAt: T0.toISOString(),
    payment: { timing: "base_then_settle", paidNow: 289, balanceDue: 0 },
    ...over,
  } as Booking;
}

describe("a worker is never paid out money the customer hasn't paid", () => {
  const unpaid = job({ id: "unpaid", payment: { timing: "base_then_settle", paidNow: 289, balanceDue: 537 } });
  const settled = job({ id: "settled" });

  it("an uncollected job is pending, not withdrawable", () => {
    expect(lifetimeEarned([unpaid], "w1")).toBe(0);
    expect(pendingEarnings([unpaid], "w1")).toBe(588);
    expect(availableBalance([unpaid], "w1", [])).toBe(0);
  });

  it("a settled job is withdrawable", () => {
    expect(lifetimeEarned([settled], "w1")).toBe(588);
    expect(pendingEarnings([settled], "w1")).toBe(0);
  });

  it("the pending amount moves across on its own once paid", () => {
    const paid = { ...unpaid, payment: { ...unpaid.payment!, balanceDue: 0, balancePaidAt: T0.toISOString() } };
    expect(pendingEarnings([paid], "w1")).toBe(0);
    expect(lifetimeEarned([paid], "w1")).toBe(588);
  });
});

describe("tips are money, not a message", () => {
  it("an unpaid tip earns the worker nothing", () => {
    expect(tipsEarned([job({ tip: 50 })], "w1")).toBe(0);
  });

  it("a paid tip goes 100% to the worker, on top of the payout", () => {
    const tipped = job({ tip: 50, tipPaidAt: T0.toISOString() });
    expect(tipsEarned([tipped], "w1")).toBe(50);
    expect(lifetimeEarned([tipped], "w1")).toBe(638);
  });
});

describe("the invoice states what was actually paid", () => {
  it("subtracts the Plus discount, the coupon and KAAM Cash", () => {
    const t = invoiceTotals(job({
      payment: {
        timing: "base_then_settle", paidNow: 0, balanceDue: 0,
        memberDiscount: 83, couponCode: "KAAM100", couponDiscount: 100, walletApplied: 50,
      },
    }));
    expect(t.subtotal).toBe(826);
    expect(t.totalPaid).toBe(826 - 83 - 100 - 50);
    expect(t.couponCode).toBe("KAAM100");
  });

  it("equals the quote when no discount was used", () => {
    expect(invoiceTotals(job()).totalPaid).toBe(826);
  });

  it("never goes negative, however large the deductions", () => {
    const t = invoiceTotals(job({
      payment: { timing: "base_then_settle", paidNow: 0, balanceDue: 0, walletApplied: 5000 },
    }));
    expect(t.totalPaid).toBe(0);
  });
});

describe("cancelling never claims money that was never taken", () => {
  it("says nothing was charged when a worker accepted but payment never happened", () => {
    const r = cancelRefund(job({
      status: "accepted",
      payment: { timing: "base_then_settle", paidNow: 0, dueOnAccept: 826, balanceDue: 0 },
    }));
    expect(r.forfeited).toBe(false);
    expect(r.amount).toBe(0);
    expect(r.reason).toMatch(/nothing/i);
  });

  it("still forfeits the upfront amount when it really was paid", () => {
    const r = cancelRefund(job({
      status: "accepted",
      payment: { timing: "base_then_settle", paidNow: 826, balanceDue: 0 },
    }));
    expect(r.forfeited).toBe(true);
  });
});

describe("a rescheduled job reminds both sides", () => {
  const inOneHour = new Date(T0.getTime() + 50 * 60_000);
  const tomorrow = {
    when: "scheduled" as const,
    date: inOneHour.toISOString().slice(0, 10),
    time: inOneHour.toISOString().slice(11, 16),
  };

  it("fires for a paused in-progress job — the come-back-tomorrow case", () => {
    const b = { id: "b1", status: "in_progress" as const, schedule: tomorrow };
    // The reminder engine compares against UTC-parsed local time; assert the
    // status gate specifically by checking it is no longer rejected outright.
    const due = dueReminder(b, new Set(), new Date(inOneHour.getTime() - 30 * 60_000));
    expect(due).not.toBeNull();
  });

  it("keeps the two sides' reminders separate so neither swallows the other", () => {
    const b = { id: "b1", status: "accepted" as const, schedule: tomorrow };
    const at = new Date(inOneHour.getTime() - 30 * 60_000);
    const customer = dueReminder(b, new Set(), at, "c")!;
    const worker = dueReminder(b, new Set([customer.key]), at, "w");
    expect(worker).not.toBeNull();
    expect(worker!.key).not.toBe(customer.key);
  });

  it("still ignores a job that has already come and gone", () => {
    const past = { when: "scheduled" as const, date: "2020-01-01", time: "10:00" };
    expect(dueReminder({ id: "b1", status: "in_progress", schedule: past }, new Set())).toBeNull();
  });
});
