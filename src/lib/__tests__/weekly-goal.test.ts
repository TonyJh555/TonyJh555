import { describe, expect, it } from "vitest";
import { startOfWeek, weeklyGoal, weekProgress, DEFAULT_WEEKLY_GOAL } from "../weekly-goal";
import type { Booking } from "../types";

// Wed 2026-07-15 14:00 — midweek, so "future" days exist.
const NOW = new Date("2026-07-15T14:00:00");

function job(dayISO: string, payout: number, over: Partial<Booking> = {}): Booking {
  return {
    id: `b-${dayISO}-${payout}`,
    workerId: "w1",
    status: "completed",
    createdAt: `${dayISO}T10:00:00`,
    quote: { workerPayout: payout },
    ...over,
  } as Booking;
}

describe("startOfWeek", () => {
  it("anchors to Monday midnight", () => {
    const s = startOfWeek(NOW); // week of Mon 2026-07-13
    expect(s.getFullYear()).toBe(2026);
    expect(s.getMonth()).toBe(6); // July
    expect(s.getDate()).toBe(13);
    expect(s.getHours()).toBe(0);
    expect(s.getDay()).toBe(1); // Monday
  });

  it("treats Sunday as the last day of the week, not the first", () => {
    const sunday = new Date("2026-07-19T09:00:00");
    expect(startOfWeek(sunday).getDate()).toBe(13); // same Monday
  });
});

describe("weeklyGoal", () => {
  it("falls back to the default until a worker sets one", () => {
    expect(weeklyGoal({}, "w1")).toBe(DEFAULT_WEEKLY_GOAL);
    expect(weeklyGoal({ w1: 8000 }, "w1")).toBe(8000);
  });
});

describe("weekProgress", () => {
  it("sums this week's payouts and splits them Mon→Sun", () => {
    const bookings = [
      job("2026-07-13", 1000), // Mon
      job("2026-07-15", 1500), // Wed (today)
      job("2026-07-06", 9999), // last week — excluded
    ];
    const p = weekProgress(bookings, "w1", 5000, NOW);
    expect(p.earned).toBe(2500);
    expect(p.jobs).toBe(2);
    expect(p.days[0].value).toBe(1000); // Mon
    expect(p.days[2].value).toBe(1500); // Wed
    expect(p.days[2].isToday).toBe(true);
    expect(p.days[3].isFuture).toBe(true); // Thu hasn't happened
    expect(p.remaining).toBe(2500);
    expect(p.pct).toBeCloseTo(0.5, 5);
  });

  it("caps the ring at 100% but keeps the true beaten fraction", () => {
    const p = weekProgress([job("2026-07-13", 6000)], "w1", 5000, NOW);
    expect(p.achieved).toBe(true);
    expect(p.remaining).toBe(0);
    expect(p.pct).toBe(1);
    expect(p.rawPct).toBeCloseTo(1.2, 5);
  });

  it("judges pace against how much of the week has elapsed", () => {
    // Wed = 3rd of 7 days → expected 3/7 of target by end of today.
    const expected = 5000 * (3 / 7); // ≈ 2143
    const behind = weekProgress([job("2026-07-13", 2000)], "w1", 5000, NOW);
    const ahead = weekProgress([job("2026-07-13", 2500)], "w1", 5000, NOW);
    expect(behind.earned).toBeLessThan(expected);
    expect(behind.onTrack).toBe(false);
    expect(ahead.earned).toBeGreaterThan(expected);
    expect(ahead.onTrack).toBe(true);
  });

  it("only counts this worker's completed jobs", () => {
    const bookings = [
      job("2026-07-13", 1000, { workerId: "other" }),
      job("2026-07-13", 800, { status: "cancelled" }),
      job("2026-07-14", 1200),
    ];
    const p = weekProgress(bookings, "w1", 5000, NOW);
    expect(p.earned).toBe(1200);
    expect(p.jobs).toBe(1);
  });
});
