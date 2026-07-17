import { describe, expect, it } from "vitest";
import {
  inPeriod,
  revenueMetrics,
  jobBreakdown,
  onboardingFunnel,
  workerEarnings,
  dailyRevenue,
  workerEarningsSummary,
  payoutByWeekday,
  payoutByMonth,
  subscriptionMetrics,
  subscriptionsByCategory,
} from "../analytics";
import type { Booking, Quote, Subscription } from "../types";
import type { WorkerApplication } from "../applications";

const NOW = new Date("2026-07-16T12:00:00");

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
    workerName: "Anand K",
    categoryId: "plumb",
    subService: "Leak fix",
    tenureId: "hr",
    stateId: "KL",
    quote: quote(),
    paymentMethod: "gpay",
    status: "completed",
    startCode: "1234",
    createdAt: NOW.toISOString(),
    ...over,
  };
}

describe("inPeriod", () => {
  it("buckets by today / month / year / all", () => {
    const today = new Date("2026-07-16T09:00:00").toISOString();
    const earlierMonth = new Date("2026-05-01T09:00:00").toISOString();
    const lastYear = new Date("2025-07-16T09:00:00").toISOString();
    expect(inPeriod(today, "today", NOW)).toBe(true);
    expect(inPeriod(earlierMonth, "today", NOW)).toBe(false);
    expect(inPeriod(earlierMonth, "month", NOW)).toBe(false);
    expect(inPeriod(earlierMonth, "year", NOW)).toBe(true);
    expect(inPeriod(lastYear, "year", NOW)).toBe(false);
    expect(inPeriod(lastYear, "all", NOW)).toBe(true);
  });
});

describe("revenueMetrics", () => {
  it("counts commission only from completed bookings in the period", () => {
    const bookings = [
      booking({ status: "completed" }),
      booking({ status: "completed" }),
      booking({ status: "cancelled" }), // excluded
      booking({ status: "requested" }), // excluded
    ];
    const m = revenueMetrics(bookings, "today", NOW);
    expect(m.completedJobs).toBe(2);
    expect(m.commission).toBe(300); // 2 × 150
    expect(m.gmv).toBe(2000);
    expect(m.gst).toBe(360);
  });
});

describe("jobBreakdown", () => {
  it("counts statuses, scheduled slots, and distinct active workers", () => {
    const bookings = [
      booking({ status: "completed", workerId: "w1" }),
      booking({ status: "in_progress", workerId: "w1" }), // same worker
      booking({ status: "accepted", workerId: "w2", schedule: { when: "scheduled", date: "2026-07-20", time: "10:00" } }),
      booking({ status: "cancelled", workerId: "w3" }),
    ];
    const b = jobBreakdown(bookings, "today", NOW);
    expect(b.total).toBe(4);
    expect(b.completed).toBe(1);
    expect(b.cancelled).toBe(1);
    expect(b.scheduled).toBe(1);
    expect(b.activeWorkers).toBe(2); // w1, w2 (w3 only cancelled)
  });
});

describe("onboardingFunnel + workerEarnings", () => {
  const app = (over: Partial<WorkerApplication>): WorkerApplication => ({
    id: Math.random().toString(36).slice(2),
    name: "X",
    phone: "9",
    city: "Kochi",
    categoryId: "plumb",
    experienceYears: 1,
    bio: "",
    docs: {},
    media: [],
    status: "pending",
    submittedAt: NOW.toISOString(),
    ...over,
  });

  it("summarises the onboarding funnel", () => {
    const f = onboardingFunnel(
      [app({ status: "approved" }), app({ status: "rejected" }), app({ status: "pending" })],
      "today",
      NOW,
    );
    expect(f.submitted).toBe(3);
    expect(f.approved).toBe(1);
    expect(f.rejected).toBe(1);
    expect(f.pending).toBe(1);
  });

  it("ranks workers by commission", () => {
    const rows = workerEarnings(
      [
        booking({ workerId: "w1", workerName: "A", quote: quote({ platformFee: 150 }) }),
        booking({ workerId: "w2", workerName: "B", quote: quote({ platformFee: 500 }) }),
        booking({ workerId: "w2", workerName: "B", quote: quote({ platformFee: 500 }) }),
      ],
      "all",
      NOW,
    );
    expect(rows[0].workerId).toBe("w2");
    expect(rows[0].commission).toBe(1000);
    expect(rows[0].jobs).toBe(2);
    expect(rows[1].workerId).toBe("w1");
  });
});

describe("worker earnings", () => {
  it("summarises payout by period for one worker", () => {
    const bookings = [
      booking({ workerId: "w1", status: "completed", createdAt: new Date("2026-07-16T09:00:00").toISOString() }),
      booking({ workerId: "w1", status: "completed", createdAt: new Date("2026-07-10T09:00:00").toISOString() }),
      booking({ workerId: "w1", status: "completed", createdAt: new Date("2026-01-02T09:00:00").toISOString() }),
      booking({ workerId: "w2", status: "completed" }), // other worker, excluded
      booking({ workerId: "w1", status: "cancelled" }), // not completed
    ];
    const s = workerEarningsSummary(bookings, "w1", NOW);
    expect(s.jobs).toBe(3);
    expect(s.today).toBe(840); // one job today
    expect(s.week).toBe(1680); // today + 6 days ago
    expect(s.year).toBe(2520); // all three
    expect(s.all).toBe(2520);
  });

  it("buckets payout by weekday (Mon-first) and month", () => {
    const bookings = [
      booking({ workerId: "w1", status: "completed", createdAt: new Date("2026-07-16T09:00:00").toISOString() }), // Thu
    ];
    const wd = payoutByWeekday(bookings, "w1");
    expect(wd).toHaveLength(7);
    expect(wd[0].label).toBe("Mon");
    expect(wd.find((d) => d.label === "Thu")!.value).toBe(840);

    const months = payoutByMonth(bookings, "w1", 2026);
    expect(months).toHaveLength(12);
    expect(months[6].label).toBe("Jul");
    expect(months[6].value).toBe(840);
  });
});

describe("dailyRevenue", () => {
  it("returns one point per day ending today", () => {
    const series = dailyRevenue([booking({ status: "completed" })], 7, NOW);
    expect(series).toHaveLength(7);
    expect(series[6].date).toBe("2026-07-16");
    expect(series[6].commission).toBe(150);
    expect(series[6].jobs).toBe(1);
  });
});

function subscription(over: Partial<Subscription> = {}): Subscription {
  return {
    id: Math.random().toString(36).slice(2),
    workerId: "w2",
    workerName: "Priya Verma",
    categoryId: "nurse",
    service: "Elder Care · 3 Months plan",
    planId: "m3",
    months: 3,
    monthlyAmount: 1180, // incl 18% GST → ₹1000 service/month
    termAmount: 3540,
    monthlyPayout: 840,
    termPayout: 2520,
    startDate: NOW.toISOString(),
    renewsOn: "2026-10-16T12:00:00.000Z",
    autoRenew: true,
    status: "active",
    paymentRef: "sub_x",
    history: [],
    createdAt: NOW.toISOString(),
    ...over,
  };
}

describe("subscriptionMetrics", () => {
  it("counts only active plans toward MRR", () => {
    const subs = [
      subscription(),
      subscription({ status: "expired" }),
      subscription({ status: "cancelled" }),
    ];
    const m = subscriptionMetrics(subs);
    expect(m.activePlans).toBe(1);
    expect(m.totalPlans).toBe(3);
    // MRR = 15% of the ₹1000 pre-GST monthly service = ₹150
    expect(m.mrr).toBe(150);
    expect(m.monthlyGmv).toBe(1000);
    expect(m.contractedValue).toBe(3540);
    expect(m.monthlyWorkerPayout).toBe(840);
  });

  it("ARR run-rate is MRR × 12", () => {
    const m = subscriptionMetrics([subscription(), subscription()]);
    expect(m.mrr).toBe(300);
    expect(m.mrr * 12).toBe(3600);
  });

  it("groups active plans by category, MRR-ranked", () => {
    const rows = subscriptionsByCategory([
      subscription({ categoryId: "nurse" }),
      subscription({ categoryId: "nurse" }),
      subscription({ categoryId: "maid", monthlyAmount: 590 }), // ₹500 service → ₹75
      subscription({ categoryId: "cook", status: "expired" }),
    ]);
    expect(rows.map((r) => r.categoryId)).toEqual(["nurse", "maid"]);
    expect(rows[0].count).toBe(2);
    expect(rows[0].mrr).toBe(300);
    expect(rows[1].mrr).toBe(75);
  });
});
