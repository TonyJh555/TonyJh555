import { describe, expect, it } from "vitest";
import {
  activeRoles,
  crewCapable,
  crewHeads,
  crewProblem,
  crewQuote,
  crewRate,
  crewSummary,
  splitPayout,
  suggestCrew,
  tooBigForCrew,
  CREW_ROLES,
  LEAD_SHARE,
  MAX_CREW,
  type CrewRole,
} from "../crew";
import { getCategory } from "@/data/categories";

const roles = (cooks: number, staff: number, catering = 0): CrewRole[] => [
  { categoryId: "cook", count: cooks },
  { categoryId: "events", count: staff },
  { categoryId: "catering", count: catering },
];

describe("who can be booked as a crew", () => {
  it("covers the trades a function needs", () => {
    for (const id of ["cook", "events", "catering"] as const) {
      expect(crewCapable(id), id).toBe(true);
    }
  });

  it("does not offer a crew of electricians", () => {
    // Two plumbers is two bookings. A crew is a function, not a bigger job.
    for (const id of ["elec", "plumb", "nurse", "tutor", "photo"] as const) {
      expect(crewCapable(id), id).toBe(false);
    }
  });

  it("describes every role in both languages", () => {
    for (const role of CREW_ROLES) {
      expect(role.labelMl.length, role.categoryId).toBeGreaterThan(2);
      expect(role.hint.length, role.categoryId).toBeGreaterThan(10);
      expect(role.hintMl.length, role.categoryId).toBeGreaterThan(5);
      expect(role.perGuests, role.categoryId).toBeGreaterThan(0);
    }
  });
});

describe("a first guess at the crew", () => {
  it("scales with the guest count", () => {
    const small = suggestCrew(50);
    const big = suggestCrew(300);
    expect(crewHeads(big)).toBeGreaterThan(crewHeads(small));
  });

  it("suggests a sadya crew a caterer would recognise", () => {
    // 200 guests: 4 cooks, 8 serving. Not a rule — the family edits it.
    const crew = suggestCrew(200);
    const count = (id: string) => crew.find((r) => r.categoryId === id)?.count ?? 0;
    expect(count("cook")).toBe(4);
    expect(count("events")).toBe(8);
  });

  it("never suggests nobody, however few the guests", () => {
    for (const guests of [0, 1, 10]) {
      const crew = suggestCrew(guests);
      expect(crewHeads(crew), `${guests} guests`).toBeGreaterThanOrEqual(2);
    }
  });

  it("leaves the extras off until they're asked for", () => {
    // Live counters are a choice, not something to quietly add to the bill.
    expect(suggestCrew(200).some((r) => r.categoryId === "catering")).toBe(false);
  });

  it("always includes the trade of the person being booked", () => {
    const crew = suggestCrew(120, "catering");
    expect(crew.find((r) => r.categoryId === "catering")?.count).toBeGreaterThan(0);
  });
});

describe("what can and cannot be booked", () => {
  it("turns one person away to the normal booking flow", () => {
    expect(crewProblem(roles(1, 0))).toMatch(/at least 2|book them normally/i);
    expect(crewProblem(roles(1, 0), true)).toMatch(/രണ്ട്/);
  });

  it("sends a wedding-sized job to the event companies instead", () => {
    const huge = roles(8, 15);
    expect(crewHeads(huge)).toBeGreaterThan(MAX_CREW);
    expect(tooBigForCrew(huge)).toBe(true);
    expect(crewProblem(huge)).toMatch(/event/i);
  });

  it("is happy with a real crew", () => {
    expect(crewProblem(roles(4, 6))).toBeNull();
    expect(tooBigForCrew(roles(4, 6))).toBe(false);
  });

  it("ignores the roles nobody filled", () => {
    expect(activeRoles(roles(4, 6, 0))).toHaveLength(2);
    expect(crewHeads(roles(4, 6, 0))).toBe(10);
  });
});

describe("what the crew costs", () => {
  const lead = { categoryId: "cook" as const, rate: 1000 };

  it("charges the lead their own rate and prices the rest against it", () => {
    // Everyone in the lead's own unit: a peer cook matches the lead, and a
    // serving hand is the lead's rate scaled by the two trades' list prices.
    const staff = Math.round(1000 * (getCategory("events").basePrice / getCategory("cook").basePrice));
    expect(crewRate(roles(4, 6), lead)).toBe(1000 + 3 * 1000 + 6 * staff);
  });

  it("never mixes a per-day rate with a per-hour list price", () => {
    // Sunita is ₹900 a DAY. Her crew must be priced in days too — adding a
    // per-hour list price to it would produce a number meaning nothing.
    const perDayLead = { categoryId: "cook" as const, rate: 900 };
    const crew = crewRate(roles(4, 6), perDayLead);
    // Ten people around a ₹900/day cook: nowhere near a per-hour reading.
    expect(crew).toBeGreaterThan(900 * 5);
    expect(crew).toBeLessThan(900 * 12);
  });

  it("counts the lead once, however many of their trade are on the crew", () => {
    const one = crewRate(roles(1, 2), lead);
    const two = crewRate(roles(2, 2), lead);
    expect(two - one).toBe(1000);
  });

  it("grows with the crew", () => {
    const four = crewQuote({ roles: roles(2, 2), lead, tenureId: "day", stateId: "KL" });
    const ten = crewQuote({ roles: roles(4, 6), lead, tenureId: "day", stateId: "KL" });
    expect(ten.totalUserPays).toBeGreaterThan(four.totalUserPays);
    expect(ten.workerPayout).toBeGreaterThan(four.workerPayout);
  });

  it("still balances: what the customer pays covers tax, fee and payout", () => {
    const q = crewQuote({ roles: roles(4, 6), lead, tenureId: "day", stateId: "KL" });
    expect(q.totalUserPays).toBe(q.serviceAmount + q.gst + q.cess);
    expect(q.workerPayout).toBe(q.serviceAmount - q.platformFee - q.tds);
  });
});

describe("how the crew's money divides", () => {
  it("pays everyone the same, and the lead an allowance on top", () => {
    const split = splitPayout(60_000, 10);
    expect(split.eachShare).toBeGreaterThan(0);
    expect(split.leadAllowance).toBeGreaterThan(0);
    expect(split.leadTotal).toBe(split.leadAllowance + split.eachShare);
    expect(split.leadTotal).toBeGreaterThan(split.eachShare);
  });

  it("adds back to the rupee, always", () => {
    // Money that doesn't reconcile is money somebody is quietly losing.
    for (const [payout, heads] of [
      [60_000, 10], [9_999, 7], [12_345, 3], [1, 2], [7, 6], [100_003, 13],
    ] as const) {
      const s = splitPayout(payout, heads);
      expect(s.leadAllowance + s.eachShare * heads, `${payout}/${heads}`).toBe(payout);
    }
  });

  it("gives the rounding to the lead, never shorts a crew member", () => {
    const s = splitPayout(1000, 3);
    // Every one of the three gets the same; only the leftover moves.
    expect(s.eachShare * 3 + s.leadAllowance).toBe(1000);
    expect(s.leadAllowance).toBeGreaterThanOrEqual(Math.round(1000 * LEAD_SHARE));
  });

  it("pays no allowance to a lead with nobody to lead", () => {
    const s = splitPayout(5000, 1);
    expect(s.leadAllowance).toBe(0);
    expect(s.eachShare).toBe(5000);
    expect(s.leadTotal).toBe(5000);
  });
});

describe("the crew in one line", () => {
  it("reads the way somebody would say it", () => {
    expect(crewSummary(roles(4, 6))).toBe("4 cooks · 6 serving & setup staff");
  });

  it("says it in Malayalam too", () => {
    expect(crewSummary(roles(4, 6), true)).toContain("പാചകക്കാർ");
  });

  it("leaves out what nobody asked for", () => {
    expect(crewSummary(roles(4, 6, 0))).not.toMatch(/catering/i);
  });
});
