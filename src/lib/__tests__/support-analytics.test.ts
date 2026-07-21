import { describe, expect, it } from "vitest";
import { supportAnalytics } from "../support-analytics";
import type { SupportTicket } from "../support";

const NOW = new Date("2026-07-15T12:00:00");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function ticket(over: Partial<SupportTicket>): SupportTicket {
  return {
    id: `t${Math.random()}`,
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

describe("supportAnalytics", () => {
  it("counts totals and open vs resolved", () => {
    const a = supportAnalytics(
      [ticket({}), ticket({ status: "in_review" }), ticket({ status: "resolved", resolvedAt: hoursAgo(0.5) })],
      NOW,
    );
    expect(a.total).toBe(3);
    expect(a.open).toBe(2);
    expect(a.resolved).toBe(1);
  });

  it("computes the SLA-met rate over resolved tickets", () => {
    const met = ticket({ category: "refund", createdAt: hoursAgo(10), status: "resolved", resolvedAt: hoursAgo(6) }); // 4h ≤ 8h ✅
    const missed = ticket({ category: "refund", createdAt: hoursAgo(30), status: "resolved", resolvedAt: hoursAgo(2) }); // 28h > 8h ❌
    expect(supportAnalytics([met, missed], NOW).slaMetRate).toBe(0.5);
  });

  it("averages first-response time from support replies only", () => {
    const t = ticket({
      createdAt: hoursAgo(5),
      replies: [
        { from: "customer", text: "hi", at: hoursAgo(4.5) },
        { from: "support", text: "on it", at: hoursAgo(3) }, // responded after 2h
      ],
    });
    expect(supportAnalytics([t], NOW).avgFirstResponseHours).toBeCloseTo(2, 5);
  });

  it("breaks volume down by category and priority, busiest first", () => {
    const a = supportAnalytics(
      [ticket({ category: "refund" }), ticket({ category: "refund" }), ticket({ category: "safety" })],
      NOW,
    );
    expect(a.byCategory[0]).toEqual({ category: "refund", count: 2 });
    expect(a.byPriority[0].count).toBe(2); // refund=high
  });

  it("reports a perfect SLA rate when nothing is resolved yet", () => {
    expect(supportAnalytics([ticket({})], NOW).slaMetRate).toBe(1);
  });
});
