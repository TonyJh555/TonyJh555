import { describe, expect, it } from "vitest";
import { ticketsFor, openTicketCount, type SupportTicket } from "../support";

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
