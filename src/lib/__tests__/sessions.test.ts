import { describe, expect, it } from "vitest";
import {
  describePattern,
  markSessionPatch,
  planProgress,
  plannedSessions,
  sessionsOn,
  unrecordedSessions,
} from "../sessions";
import type { Subscription } from "../types";

/** A 1-month plan starting Mon 6 Jul 2026, running Mon/Wed/Fri at 16:00. */
function plan(over: Partial<Subscription> = {}): Subscription {
  return {
    id: "s1", workerId: "w1", workerName: "Joshua", categoryId: "piano",
    service: "Piano Lessons · 1 Month", planId: "m1", months: 1,
    monthlyAmount: 5000, termAmount: 5000, monthlyPayout: 4000, termPayout: 4000,
    startDate: "2026-07-06", renewsOn: "2026-08-06", autoRenew: true,
    status: "active", paymentRef: "ref", history: [], createdAt: "2026-07-06",
    visits: { days: [1, 3, 5], time: "16:00" },
    ...over,
  } as Subscription;
}

describe("a plan knows which visits it contains", () => {
  it("lays out the term from the weekly rhythm", () => {
    const s = plannedSessions(plan());
    expect(s[0]).toMatchObject({ date: "2026-07-06", time: "16:00", index: 1 });
    // Mon 6th → Wed 8th → Fri 10th
    expect(s.slice(0, 3).map((x) => x.date)).toEqual(["2026-07-06", "2026-07-08", "2026-07-10"]);
    // A month of Mon/Wed/Fri is roughly thirteen sessions.
    expect(s.length).toBeGreaterThan(10);
    expect(s.length).toBeLessThan(16);
    expect(s.every((x) => [1, 3, 5].includes(new Date(`${x.date}T00:00`).getDay()))).toBe(true);
  });

  it("numbers them so a parent can see 'lesson 7 of 13'", () => {
    const s = plannedSessions(plan());
    expect(s.map((x) => x.index)).toEqual(s.map((_, i) => i + 1));
  });

  it("invents nothing when no days have been agreed", () => {
    // Better to show no schedule than a schedule nobody settled on.
    expect(plannedSessions(plan({ visits: undefined }))).toEqual([]);
    expect(plannedSessions(plan({ visits: { days: [], time: "16:00" } }))).toEqual([]);
  });

  it("survives a nonsense term without throwing", () => {
    expect(plannedSessions(plan({ renewsOn: "2026-07-01" }))).toEqual([]);
    expect(plannedSessions(plan({ startDate: "not-a-date" }))).toEqual([]);
  });
});

describe("what actually happened is recorded, never assumed", () => {
  it("counts done and missed separately from what is still ahead", () => {
    const marked = plan({
      sessions: [
        { date: "2026-07-06", status: "done", by: "worker", at: "2026-07-06T17:00:00Z" },
        { date: "2026-07-08", status: "missed", by: "customer", at: "2026-07-08T17:00:00Z" },
      ],
    });
    const p = planProgress(marked, new Date("2026-07-09T12:00:00"));
    expect(p.done).toBe(1);
    expect(p.missed).toBe(1);
    expect(p.next?.date).toBe("2026-07-10");
    expect(p.fraction).toBeGreaterThan(0);
  });

  it("never marks a visit by itself — only the people who were there can", () => {
    // A session whose time has passed with nobody recording it stays open.
    const p = planProgress(plan(), new Date("2026-07-09T12:00:00"));
    expect(p.done).toBe(0);
    expect(p.missed).toBe(0);
    expect(unrecordedSessions(plan(), new Date("2026-07-09T12:00:00")).map((s) => s.date))
      .toEqual(["2026-07-06", "2026-07-08"]);
  });

  it("has no next session once the term is over", () => {
    expect(planProgress(plan(), new Date("2026-09-01")).next).toBeNull();
  });

  it("shows the worker only what is on today", () => {
    expect(sessionsOn(plan(), new Date("2026-07-08T09:00:00")).map((s) => s.date))
      .toEqual(["2026-07-08"]);
    expect(sessionsOn(plan(), new Date("2026-07-07T09:00:00"))).toEqual([]);
  });
});

describe("correcting a record replaces it rather than stacking", () => {
  it("keeps one truth per visit", () => {
    const first = markSessionPatch(plan(), "2026-07-06", "missed", "customer");
    const fixed = markSessionPatch({ sessions: first.sessions }, "2026-07-06", "done", "worker", "Scales & Grade 2 piece");
    expect(fixed.sessions).toHaveLength(1);
    expect(fixed.sessions![0]).toMatchObject({ status: "done", by: "worker", note: "Scales & Grade 2 piece" });
  });

  it("keeps records in date order", () => {
    let s = markSessionPatch(plan(), "2026-07-10", "done", "worker").sessions!;
    s = markSessionPatch({ sessions: s }, "2026-07-06", "done", "worker").sessions!;
    expect(s.map((m) => m.date)).toEqual(["2026-07-06", "2026-07-10"]);
  });

  it("drops an empty note instead of storing whitespace", () => {
    const s = markSessionPatch(plan(), "2026-07-06", "done", "worker", "   ").sessions!;
    expect(s[0].note).toBeUndefined();
  });
});

describe("the rhythm reads as words in both languages", () => {
  it("says the days and the time", () => {
    expect(describePattern({ days: [1, 3, 5], time: "16:00" })).toBe("Mon, Wed, Fri at 16:00");
    expect(describePattern({ days: [3, 1], time: "09:00" })).toBe("Mon, Wed at 09:00");
    expect(describePattern({ days: [1], time: "16:00" }, true)).toContain("തിങ്കൾ");
  });

  it("admits when nothing has been agreed", () => {
    expect(describePattern(undefined)).toMatch(/No days agreed/i);
    expect(describePattern(undefined, true).length).toBeGreaterThan(5);
  });
});
