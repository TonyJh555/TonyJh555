import { describe, expect, it } from "vitest";
import { PRO_TIERS, proStatus, proTier, tierRank, workerProStats, workerTier } from "../pro-tiers";
import type { Booking, Worker } from "../types";

function stats(jobs: number, rating: number, completionRate = 1) {
  return { jobs, rating, completionRate };
}

describe("proTier", () => {
  it("starts everyone at Rising", () => {
    expect(proTier(stats(0, 0)).id).toBe("rising");
    expect(proTier(stats(99, 5)).id).toBe("rising");
  });

  it("awards Gold at 100 jobs with a 4.5★ record", () => {
    expect(proTier(stats(100, 4.5)).id).toBe("gold");
    expect(proTier(stats(100, 4.49)).id).toBe("rising"); // rating gate
  });

  it("awards Platinum and Diamond at their bars", () => {
    expect(proTier(stats(300, 4.7)).id).toBe("platinum");
    expect(proTier(stats(700, 4.85)).id).toBe("diamond");
  });

  it("high volume alone is not enough — ratings gate every Pro tier", () => {
    expect(proTier(stats(2000, 4.3)).id).toBe("rising");
  });

  it("a poor completion record blocks promotion", () => {
    expect(proTier(stats(700, 4.9, 0.8)).id).toBe("rising");
    expect(proTier(stats(700, 4.9, 0.9)).id).toBe("platinum"); // clears 0.9, not 0.95
  });

  it("never rated (rating 0) stays Rising regardless of jobs", () => {
    expect(proTier(stats(1000, 0)).id).toBe("rising");
  });
});

describe("proStatus", () => {
  it("shows the path to the next tier with met flags", () => {
    const s = proStatus(stats(80, 4.6));
    expect(s.tier.id).toBe("rising");
    expect(s.next?.id).toBe("gold");
    const [jobs, rating, completion] = s.requirements;
    expect(jobs.met).toBe(false);
    expect(rating.met).toBe(true);
    expect(completion.met).toBe(true);
    expect(s.progress).toBeGreaterThan(0.9); // 80/100 jobs, rest met
    expect(s.progress).toBeLessThan(1);
  });

  it("is complete at Diamond", () => {
    const s = proStatus(stats(1000, 4.95));
    expect(s.tier.id).toBe("diamond");
    expect(s.next).toBeUndefined();
    expect(s.requirements).toHaveLength(0);
    expect(s.progress).toBe(1);
  });

  it("tiers are ordered and ranked lowest to highest", () => {
    expect(PRO_TIERS.map((t) => tierRank(t.id))).toEqual([0, 1, 2, 3]);
  });
});

/* ── Live blending ─────────────────────────────────────────────────────── */

const worker = {
  id: "w1",
  jobsDone: 98,
  rating: 4.4,
  reviewCount: 10,
} as Worker;

function booking(over: Partial<Booking>): Booking {
  return { id: "b", workerId: "w1", status: "completed", createdAt: "2026-07-01", ...over } as Booking;
}

describe("workerProStats", () => {
  it("blends live completed jobs and mandatory ratings into the record", () => {
    const bookings = [
      booking({ id: "b1", rating: 5 }),
      booking({ id: "b2", rating: 5 }),
      booking({ id: "b3", workerId: "other", rating: 1 }), // someone else's
    ];
    const s = workerProStats(worker, bookings);
    expect(s.jobs).toBe(100); // 98 seed + 2 live
    // (4.4×10 + 5 + 5) / 12
    expect(s.rating).toBeCloseTo(54 / 12, 5);
    expect(s.completionRate).toBe(1);
  });

  it("live cancellations pull the completion rate down", () => {
    const bookings = [booking({ id: "b1", rating: 5 }), booking({ id: "b2", status: "cancelled" })];
    const s = workerProStats(worker, bookings);
    expect(s.completionRate).toBeCloseTo(99 / 100, 5);
  });

  it("two 5★ jobs can tip a 98-job worker into Gold — the flywheel", () => {
    const before = proTier(workerProStats(worker, []));
    const after = proTier(
      workerProStats(worker, [booking({ id: "b1", rating: 5 }), booking({ id: "b2", rating: 5 })]),
    );
    expect(before.id).toBe("rising");
    expect(after.id).toBe("gold");
  });
});

describe("workerTier (seed-only)", () => {
  it("gives a veteran seed worker a Pro badge", () => {
    expect(workerTier({ jobsDone: 900, rating: 4.9, reviewCount: 200 } as Worker).id).toBe("diamond");
    expect(workerTier({ jobsDone: 320, rating: 4.7, reviewCount: 90 } as Worker).id).toBe("platinum");
    expect(workerTier({ jobsDone: 120, rating: 4.5, reviewCount: 40 } as Worker).id).toBe("gold");
    expect(workerTier({ jobsDone: 50, rating: 4.9, reviewCount: 10 } as Worker).id).toBe("rising");
  });
});
