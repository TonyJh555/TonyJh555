import { describe, expect, it } from "vitest";
import {
  breachingCount,
  isSerious,
  slaSortRank,
  slaTargetHours,
  ticketPriority,
  ticketSla,
} from "../support-sla";
import type { SupportTicket } from "../support";

const NOW = new Date("2026-07-15T12:00:00");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function ticket(over: Partial<SupportTicket>): SupportTicket {
  return {
    id: "t1",
    raisedBy: "customer",
    raiserName: "A",
    category: "quality",
    subject: "s",
    message: "m",
    status: "open",
    replies: [],
    createdAt: hoursAgo(1),
    ...over,
  } as SupportTicket;
}

describe("priority & seriousness", () => {
  it("maps categories to the right priority and target", () => {
    expect(ticketPriority(ticket({ category: "safety" }))).toBe("critical");
    expect(slaTargetHours(ticket({ category: "safety" }))).toBe(2);
    expect(slaTargetHours(ticket({ category: "refund" }))).toBe(8);
    expect(slaTargetHours(ticket({ category: "quality" }))).toBe(24);
    expect(slaTargetHours(ticket({ category: "other" }))).toBe(48);
  });

  it("flags safety/refund/payment as serious (email escalation)", () => {
    expect(isSerious(ticket({ category: "safety" }))).toBe(true);
    expect(isSerious(ticket({ category: "refund" }))).toBe(true);
    expect(isSerious(ticket({ category: "quality" }))).toBe(false);
  });
});

describe("ticketSla", () => {
  it("is on_track early in the window", () => {
    expect(ticketSla(ticket({ category: "refund", createdAt: hoursAgo(1) }), NOW).state).toBe("on_track");
  });

  it("is due_soon near the deadline", () => {
    // refund target 8h; 7h elapsed → 1h left < 25% of 8 (=2h) → due_soon
    expect(ticketSla(ticket({ category: "refund", createdAt: hoursAgo(7) }), NOW).state).toBe("due_soon");
  });

  it("is breached past the target", () => {
    const sla = ticketSla(ticket({ category: "safety", createdAt: hoursAgo(3) }), NOW); // 2h target
    expect(sla.state).toBe("breached");
    expect(sla.hoursLeft).toBeLessThan(0);
  });

  it("reports whether a resolved ticket met its target", () => {
    const met = ticket({ category: "refund", createdAt: hoursAgo(10), status: "resolved", resolvedAt: hoursAgo(6) }); // 4h ≤ 8h
    const missed = ticket({ category: "refund", createdAt: hoursAgo(20), status: "resolved", resolvedAt: hoursAgo(2) }); // 18h > 8h
    expect(ticketSla(met, NOW).state).toBe("met");
    expect(ticketSla(missed, NOW).state).toBe("breached");
  });
});

describe("queue ordering & counts", () => {
  it("sorts most-overdue first and resolved last", () => {
    const overdue = ticket({ id: "over", category: "safety", createdAt: hoursAgo(5) });
    const fresh = ticket({ id: "fresh", category: "quality", createdAt: hoursAgo(1) });
    const done = ticket({ id: "done", status: "resolved", resolvedAt: hoursAgo(1) });
    const sorted = [fresh, done, overdue].sort((a, b) => slaSortRank(a, NOW) - slaSortRank(b, NOW));
    expect(sorted.map((t) => t.id)).toEqual(["over", "fresh", "done"]);
  });

  it("counts unresolved breaching tickets", () => {
    const list = [
      ticket({ id: "a", category: "safety", createdAt: hoursAgo(5) }), // breached
      ticket({ id: "b", category: "quality", createdAt: hoursAgo(1) }), // on track
      ticket({ id: "c", category: "safety", createdAt: hoursAgo(9), status: "resolved", resolvedAt: hoursAgo(1) }),
    ];
    expect(breachingCount(list, NOW)).toBe(1);
  });
});
