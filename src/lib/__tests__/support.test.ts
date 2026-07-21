import { describe, expect, it } from "vitest";
import { inferTicketCategory, ticketsFor, openTicketCount, supportMetrics, type SupportTicket } from "../support";

describe("inferTicketCategory", () => {
  it("routes a safety complaint first, even if other words appear", () => {
    expect(inferTicketCategory("the worker was rude and I want a refund")).toBe("safety");
  });
  it("routes refund wording", () => {
    expect(inferTicketCategory("please give my money back")).toBe("refund");
  });
  it("routes payment/payout wording", () => {
    expect(inferTicketCategory("my payout did not reach my bank")).toBe("payment");
  });
  it("routes account/login wording", () => {
    expect(inferTicketCategory("I can't login, OTP not coming")).toBe("account");
  });
  it("falls back to other for anything unrecognised", () => {
    expect(inferTicketCategory("just a general question")).toBe("other");
  });
});

function ticket(over: Partial<SupportTicket>): SupportTicket {
  return {
    id: Math.random().toString(36).slice(2),
    raisedBy: "customer",
    raiserId: "c1",
    raiserName: "A",
    category: "refund",
    subject: "s",
    message: "m",
    status: "open",
    replies: [],
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("support helpers", () => {
  it("filters tickets to a given raiser", () => {
    const list = [ticket({ raiserId: "c1" }), ticket({ raiserId: "c2" }), ticket({ raiserId: "c1" })];
    expect(ticketsFor(list, "c1")).toHaveLength(2);
  });

  it("returns unowned tickets when no id given", () => {
    const list = [ticket({ raiserId: "c1" }), ticket({ raiserId: undefined })];
    expect(ticketsFor(list, undefined)).toHaveLength(1);
  });

  it("counts open + in-review (unresolved) tickets", () => {
    const list = [
      ticket({ status: "open" }),
      ticket({ status: "in_review" }),
      ticket({ status: "resolved" }),
    ];
    expect(openTicketCount(list)).toBe(2);
  });
});

describe("supportMetrics", () => {
  it("computes status counts and average resolution time", () => {
    const base = new Date("2026-07-16T00:00:00.000Z").toISOString();
    const m = supportMetrics([
      ticket({ status: "open" }),
      ticket({ status: "in_review" }),
      ticket({ status: "resolved", createdAt: base, resolvedAt: new Date("2026-07-16T12:00:00.000Z").toISOString() }), // 12h
      ticket({ status: "resolved", createdAt: base, resolvedAt: new Date("2026-07-17T00:00:00.000Z").toISOString() }), // 24h
    ]);
    expect(m.open).toBe(1);
    expect(m.inReview).toBe(1);
    expect(m.resolved).toBe(2);
    expect(m.avgResolutionHours).toBeCloseTo(18);
  });
});
