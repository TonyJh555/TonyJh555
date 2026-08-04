import { describe, expect, it } from "vitest";
import {
  awaitingConfirmation,
  nextVisit,
  VISIT_KINDS,
  visitKind,
  visitMessage,
  visitProblems,
  visitsFor,
  type EventVisit,
} from "../event-visits";

function visit(over: Partial<EventVisit> = {}): EventVisit {
  return {
    id: "ev-1",
    requestId: "er-1",
    companyId: "ec-1",
    kind: "tasting",
    date: "2026-11-20",
    time: "11:00",
    place: "Company kitchen, Kakkanad",
    proposedBy: "company",
    status: "proposed",
    createdAt: "2026-11-01T09:00:00.000Z",
    ...over,
  };
}

describe("the kinds of meeting a wedding actually needs", () => {
  it("covers tasting, the venue, and seeing past work", () => {
    expect(VISIT_KINDS.map((k) => k.id)).toEqual(["tasting", "site_visit", "showcase"]);
  });

  it("knows which side travels, because that decides where they meet", () => {
    expect(visitKind("tasting").who).toBe("customer");
    expect(visitKind("site_visit").who).toBe("company");
  });

  it("is written in both languages", () => {
    for (const k of VISIT_KINDS) {
      expect(k.labelMl.length).toBeGreaterThan(3);
      expect(k.hintMl.length).toBeGreaterThan(10);
    }
  });
});

describe("who confirms", () => {
  it("is always the side that did not propose it", () => {
    const fromCompany = visit({ proposedBy: "company" });
    expect(awaitingConfirmation(fromCompany, "customer")).toBe(true);
    expect(awaitingConfirmation(fromCompany, "company")).toBe(false);
  });

  it("means nobody can arrange a meeting with themselves", () => {
    // A record of one party writing something down is worth nothing; the
    // agreement's introduction clause rests on two people agreeing.
    const fromCustomer = visit({ proposedBy: "customer" });
    expect(awaitingConfirmation(fromCustomer, "customer")).toBe(false);
  });

  it("stops asking once it is settled", () => {
    for (const status of ["confirmed", "done", "cancelled"] as const) {
      expect(awaitingConfirmation(visit({ status }), "customer")).toBe(false);
    }
  });
});

describe("what will not go in the diary", () => {
  const eventDate = "2026-12-14";

  it("accepts a real proposal", () => {
    expect(visitProblems({ date: "2026-11-20", place: "Kitchen, Kakkanad" }, eventDate)).toEqual([]);
  });

  it("insists on a day", () => {
    expect(visitProblems({ date: "", place: "Kitchen" }, eventDate)[0].field).toBe("date");
  });

  it("refuses a tasting after the wedding it is for", () => {
    const problems = visitProblems({ date: "2026-12-20", place: "Kitchen" }, eventDate);
    expect(problems[0].message).toContain("after the function");
  });

  it("allows the day of the function itself", () => {
    // A site visit on the morning is unusual but not absurd.
    expect(visitProblems({ date: eventDate, place: "Venue" }, eventDate)).toEqual([]);
  });

  it("insists on somewhere to meet", () => {
    expect(visitProblems({ date: "2026-11-20", place: "x" }, eventDate)[0].field).toBe("place");
  });
});

describe("reading the diary", () => {
  const a = visit({ id: "ev-a", date: "2026-11-20", time: "11:00" });
  const b = visit({ id: "ev-b", date: "2026-11-18", time: "16:00" });
  const other = visit({ id: "ev-x", companyId: "ec-2" });

  it("shows soonest first", () => {
    expect(visitsFor([a, b], "er-1", "ec-1").map((v) => v.id)).toEqual(["ev-b", "ev-a"]);
  });

  it("never mixes one company's meetings with another's", () => {
    expect(visitsFor([a, other], "er-1", "ec-1").map((v) => v.id)).toEqual(["ev-a"]);
  });

  it("finds the next one still ahead", () => {
    const now = new Date("2026-11-19T09:00:00");
    expect(nextVisit([a, b], "er-1", "ec-1", now)?.id).toBe("ev-a");
  });

  it("ignores one that was called off", () => {
    const cancelled = visit({ id: "ev-c", date: "2026-11-19", status: "cancelled" });
    const now = new Date("2026-11-18T09:00:00");
    expect(nextVisit([cancelled, a], "er-1", "ec-1", now)?.id).toBe("ev-a");
  });

  it("has nothing to show once everything is past", () => {
    const now = new Date("2026-12-01T09:00:00");
    expect(nextVisit([a, b], "er-1", "ec-1", now)).toBeUndefined();
  });
});

describe("the line that goes in the thread", () => {
  it("says what, when and where", () => {
    const text = visitMessage(visit());
    expect(text).toContain("Food tasting");
    expect(text).toContain("2026-11-20");
    expect(text).toContain("Kakkanad");
  });

  it("translates", () => {
    expect(visitMessage(visit(), true)).toContain("രുചി പരിശോധന");
  });
});
