import { describe, expect, it } from "vitest";
import {
  balanceMilestones,
  canInvite,
  canQuote,
  comparableQuotes,
  daysToEvent,
  linesSubtotal,
  MAX_INVITES,
  milestoneAmount,
  milestoneProblem,
  nextDueMilestone,
  paidSoFar,
  payMilestonePatch,
  quoteTotals,
  SUGGESTED_MILESTONES,
  type EventQuote,
  type EventRequest,
  type QuoteMilestone,
  eventPlatformFee,
  EVENT_FEE_CAP,
  quoteVersion,
  revisionOf,
  canRevise,
  currentQuote,
  quoteHistory,
} from "../events";

const req = (over: Partial<EventRequest> = {}): EventRequest => ({
  id: "r1", kind: "wedding", date: "2026-12-20", venue: "Kalyana Mandapam",
  district: "Ernakulam", guests: 400, budget: 300000, invitedIds: ["c1", "c2"],
  status: "open", stateId: "KL", createdAt: "2026-07-27", ...over,
});

const quote = (over: Partial<EventQuote> = {}): EventQuote => ({
  id: "q1", requestId: "r1", companyId: "c1", companyName: "Kerala Events",
  lines: [
    { label: "Stage & backdrop", amount: 45000 },
    { label: "Lighting", amount: 30000 },
    { label: "Crew of 12", amount: 25000 },
  ],
  milestones: SUGGESTED_MILESTONES,
  status: "sent", createdAt: "2026-07-27", ...over,
});

describe("a quote is built one line at a time", () => {
  it("adds the lines up before tax", () => {
    expect(linesSubtotal(quote().lines)).toBe(100_000);
  });

  it("ignores a negative line rather than crediting the customer for it", () => {
    expect(linesSubtotal([{ label: "Oops", amount: -500 }, { label: "Real", amount: 1000 }])).toBe(1000);
  });

  it("produces the same breakdown shape as every other booking", () => {
    const q = quoteTotals(quote().lines, "KL");
    expect(q.serviceAmount).toBe(100_000);
    expect(q.gst).toBe(18_000);
    expect(q.totalUserPays).toBe(118_000);
    expect(q.platformFee).toBe(15_000); // KAAM's 15%
    expect(q.tds).toBe(1_000);
    expect(q.workerPayout).toBe(84_000);
  });

  it("never applies surge to a function booked months ahead", () => {
    expect(quoteTotals(quote().lines, "KL").surgeApplied).toBe(false);
  });

  it("is zero all the way down for an empty quote", () => {
    expect(quoteTotals([], "KL").totalUserPays).toBe(0);
  });
});

describe("the company's payment stages must account for the price exactly", () => {
  const total = 118_000;

  it("accepts a plan that adds to 100%", () => {
    expect(milestoneProblem(SUGGESTED_MILESTONES, total)).toBeNull();
  });

  it("refuses a plan that does not", () => {
    const short: QuoteMilestone[] = [{ label: "Advance", percent: 40, when: "now" }];
    expect(milestoneProblem(short, total)).toMatch(/must total 100/i);
  });

  it("refuses a plan with no stages, or an unnamed one", () => {
    expect(milestoneProblem([], total)).toMatch(/at least one/i);
    expect(
      milestoneProblem([{ label: "  ", percent: 100, when: "now" }], total),
    ).toMatch(/needs a name/i);
  });

  it("refuses a zero or negative stage", () => {
    const bad: QuoteMilestone[] = [
      { label: "A", percent: 100, when: "now" },
      { label: "B", percent: 0, when: "later" },
    ];
    expect(milestoneProblem(bad, total)).toMatch(/more than 0/i);
  });

  it("charges the quoted rupee exactly, never one more", () => {
    // Three equal stages of an odd total is where rounding bites.
    const thirds: QuoteMilestone[] = [
      { label: "A", percent: 33.34, when: "now" },
      { label: "B", percent: 33.33, when: "soon" },
      { label: "C", percent: 33.33, when: "after" },
    ];
    const spread = balanceMilestones(thirds, 100_001);
    expect(spread.reduce((s, x) => s + x.amount, 0)).toBe(100_001);
  });

  it("balances even a single stage onto the exact total", () => {
    const one: QuoteMilestone[] = [{ label: "All of it", percent: 100, when: "now" }];
    expect(balanceMilestones(one, 99_999)[0].amount).toBe(99_999);
  });

  it("works out what one stage costs", () => {
    expect(milestoneAmount(118_000, SUGGESTED_MILESTONES[0])).toBe(35_400);
  });
});

describe("the customer chooses who may quote — the app never does", () => {
  it("lets them invite up to the cap", () => {
    expect(canInvite(req({ invitedIds: [] }), "c9")).toBe(true);
    expect(canInvite(req({ invitedIds: ["a", "b", "c"] }), "c9")).toBe(true);
    expect(canInvite(req({ invitedIds: ["a", "b", "c", "d"] }), "c9")).toBe(false);
    expect(MAX_INVITES).toBe(4);
  });

  it("never invites the same company twice", () => {
    expect(canInvite(req({ invitedIds: ["c1"] }), "c1")).toBe(false);
  });

  it("stops inviting once the job is awarded", () => {
    expect(canInvite(req({ status: "awarded" }), "c9")).toBe(false);
  });

  it("refuses a quote from a company nobody invited", () => {
    // An uninvited quote is exactly the open-tender pit this design avoids.
    expect(canQuote(req(), "c1")).toBe(true);
    expect(canQuote(req(), "stranger")).toBe(false);
  });

  it("refuses a quote once the job is awarded", () => {
    expect(canQuote(req({ status: "awarded" }), "c1")).toBe(false);
  });
});

describe("comparing what came back", () => {
  it("shows only finished quotes, cheapest first", () => {
    const cheap = quote({ id: "q2", companyId: "c2", lines: [{ label: "All in", amount: 80_000 }] });
    const draft = quote({ id: "q3", companyId: "c3", status: "draft" });
    const other = quote({ id: "q4", requestId: "r9" });
    const list = comparableQuotes([quote(), cheap, draft, other], "r1", "KL");
    expect(list.map((q) => q.id)).toEqual(["q2", "q1"]);
  });

  it("shows nothing before anyone has replied", () => {
    expect(comparableQuotes([quote({ status: "draft" })], "r1", "KL")).toEqual([]);
  });
});

describe("paying the stages", () => {
  it("points at the first unpaid stage", () => {
    expect(nextDueMilestone(quote())?.label).toBe("To confirm the date");
  });

  it("records what was actually taken, and moves on", () => {
    const after = { ...quote(), ...payMilestonePatch(quote(), 0, 35_400) };
    expect(after.milestones[0].paidAt).toBeTruthy();
    expect(paidSoFar(after)).toBe(35_400);
    expect(nextDueMilestone(after)?.label).toBe("Before the function");
  });

  it("counts nothing for a stage that was never charged", () => {
    // A milestone marked paid without an amount must not inflate the total.
    const ghost = quote({
      milestones: [{ label: "A", percent: 100, when: "now", paidAt: "2026-07-27" }],
    });
    expect(paidSoFar(ghost)).toBe(0);
  });

  it("has nothing due once every stage is settled", () => {
    let q = quote();
    q = { ...q, ...payMilestonePatch(q, 0, 1) };
    q = { ...q, ...payMilestonePatch(q, 1, 1) };
    q = { ...q, ...payMilestonePatch(q, 2, 1) };
    expect(nextDueMilestone(q)).toBeNull();
  });
});

describe("how long until the function", () => {
  it("counts the days ahead", () => {
    expect(daysToEvent({ date: "2026-07-30" }, new Date("2026-07-27T18:00:00"))).toBe(3);
  });

  it("goes negative once it has passed", () => {
    expect(daysToEvent({ date: "2026-07-20" }, new Date("2026-07-27T01:00:00"))).toBe(-7);
  });

  it("survives a broken date", () => {
    expect(daysToEvent({ date: "" }, new Date("2026-07-27"))).toBe(0);
  });
});

describe("what KAAM takes from an event", () => {
  it("charges the ordinary rate on an ordinary function", () => {
    // ₹40,000 birthday: 15% is ₹6,000, well under the cap, so nothing changes.
    expect(eventPlatformFee(40_000)).toBe(6_000);
  });

  it("stops at the cap on a wedding", () => {
    // The number that drives a deal off the platform: 15% of ₹3 lakh is
    // ₹45,000, and both sides can do that arithmetic.
    expect(Math.round(300_000 * 0.15)).toBe(45_000);
    expect(eventPlatformFee(300_000)).toBe(EVENT_FEE_CAP);
  });

  it("changes nothing right up to the cap", () => {
    const atCap = Math.round(EVENT_FEE_CAP / 0.15);
    expect(eventPlatformFee(atCap - 1000)).toBeLessThan(EVENT_FEE_CAP);
    expect(eventPlatformFee(atCap + 1000)).toBe(EVENT_FEE_CAP);
  });

  it("hands the whole saving to the company, not off the customer's price", () => {
    const lines = [{ label: "Full catering", amount: 300_000 }];
    const q = quoteTotals(lines, "KL");
    // The customer pays the quoted price plus tax, exactly as before.
    expect(q.serviceAmount).toBe(300_000);
    expect(q.platformFee).toBe(EVENT_FEE_CAP);
    // ₹30,000 that used to be KAAM's is now the company's.
    expect(q.workerPayout).toBe(300_000 - EVENT_FEE_CAP - q.tds);
  });
});

describe("a quote is a negotiation, not an answer", () => {
  const first: EventQuote = {
    id: "eq-1",
    requestId: "er-1",
    companyId: "ec-1",
    companyName: "Renjith Caterers",
    lines: [{ label: "Sadya, 400 heads", amount: 96_000 }],
    milestones: [{ label: "Advance", percent: 100, when: "on booking" }],
    note: "Veg only",
    status: "sent",
    createdAt: "2026-08-01T10:00:00.000Z",
  };

  it("treats a quote written before versions existed as the first", () => {
    expect(quoteVersion(first)).toBe(1);
  });

  it("carries the last version's numbers into the next", () => {
    const next = revisionOf(first);
    expect(next.version).toBe(2);
    expect(next.supersedesId).toBe("eq-1");
    expect(next.lines).toEqual(first.lines);
    expect(next.status).toBe("draft");
  });

  it("starts the next version clean of what was already paid", () => {
    const paid: EventQuote = {
      ...first,
      milestones: [{ label: "Advance", percent: 100, when: "on booking", paidAt: "x", paidAmount: 5 }],
    };
    expect(revisionOf(paid).milestones[0].paidAt).toBeUndefined();
    expect(revisionOf(paid).milestones[0].paidAmount).toBeUndefined();
  });

  it("can be revised while it is still an offer", () => {
    expect(canRevise({ status: "sent" })).toBe(true);
    expect(canRevise({ status: "draft" })).toBe(true);
  });

  it("cannot be revised once accepted — that price is an agreement", () => {
    expect(canRevise({ status: "accepted" })).toBe(false);
    expect(canRevise({ status: "declined" })).toBe(false);
    expect(canRevise({ status: "superseded" })).toBe(false);
  });

  it("shows the version that stands, never a replaced one", () => {
    const second: EventQuote = { ...first, id: "eq-2", version: 2, supersedesId: "eq-1", status: "sent" };
    const superseded: EventQuote = { ...first, status: "superseded" };
    // Deliberately out of order — the newest must win regardless of position.
    const all = [second, superseded];
    expect(currentQuote(all, "er-1", "ec-1")?.id).toBe("eq-2");
    expect(quoteHistory(all, "er-1", "ec-1").map((q) => q.id)).toEqual(["eq-1", "eq-2"]);
  });

  it("keeps a superseded version out of the customer's comparison", () => {
    const second: EventQuote = { ...first, id: "eq-2", version: 2, status: "sent" };
    const superseded: EventQuote = { ...first, status: "superseded" };
    const live = comparableQuotes([superseded, second], "er-1", "KL");
    expect(live.map((q) => q.id)).toEqual(["eq-2"]);
  });
});
