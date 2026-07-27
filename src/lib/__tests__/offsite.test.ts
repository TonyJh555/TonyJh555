import { describe, expect, it } from "vitest";
import {
  findContactDetails,
  looksOffsite,
  offsiteAttemptFrom,
  offsiteWarning,
} from "../offsite";

const kinds = (text: string) => findContactDetails(text).map((h) => h.kind);

describe("catching an attempt to move the deal off KAAM", () => {
  it("finds a plain mobile number", () => {
    expect(kinds("Call 9847012345 to confirm")).toContain("phone");
  });

  it("finds one that has been spaced or dashed to hide it", () => {
    expect(kinds("my no 98470 12345")).toContain("phone");
    expect(kinds("9847-01-2345")).toContain("phone");
    expect(kinds("98 47 01 23 45")).toContain("phone");
  });

  it("finds one with a country code or a leading zero", () => {
    expect(kinds("+91 9847012345")).toContain("phone");
    expect(kinds("09847012345")).toContain("phone");
  });

  it("finds an email, however it is disguised", () => {
    expect(kinds("mail me at suresh@events.com")).toContain("email");
    expect(kinds("suresh (at) events.com")).toContain("email");
  });

  it("finds links and social handles", () => {
    expect(kinds("see www.malabarweddings.com")).toContain("link");
    expect(kinds("portfolio at malabarweddings.in")).toContain("link");
    expect(kinds("dm me @malabar_weddings")).toContain("handle");
  });

  it("finds the intent even when no digits are given", () => {
    expect(looksOffsite("whatsapp me and we settle directly")).toBe(true);
    expect(looksOffsite("we can do a cash deal outside the app")).toBe(true);
    expect(looksOffsite("call me before you decide")).toBe(true);
  });
});

describe("a quote is full of numbers — none of them are phone numbers", () => {
  // The cost of a false positive is a company unable to send a legitimate
  // quote, which is worse than one leaked number.
  it("leaves prices alone", () => {
    expect(looksOffsite("Stage and backdrop ₹45,000, lighting ₹30000")).toBe(false);
  });

  it("leaves guest counts, dates and years alone", () => {
    expect(looksOffsite("400 guests, 20 December 2026, we have run 12 years")).toBe(false);
  });

  it("leaves a GST number alone", () => {
    expect(looksOffsite("Our GSTIN is 32AABCU9603R1ZM")).toBe(false);
  });

  it("leaves an ordinary friendly note alone", () => {
    expect(
      looksOffsite("Thank you for asking us. We can do the sadya and a live counter too."),
    ).toBe(false);
  });

  it("does not read a plain number as a mobile", () => {
    expect(looksOffsite("Crew of 25, budget 300000")).toBe(false);
  });
});

describe("what the sender is told", () => {
  it("says nothing when there is nothing to say", () => {
    expect(offsiteWarning("Happy to take this on.", "company")).toBeNull();
  });

  it("tells a company what it would be giving up", () => {
    const w = offsiteWarning("call 9847012345", "company")!;
    expect(w.title).toMatch(/take the contact details out/i);
    expect(w.body).toMatch(/payment plan|record/i);
    expect(w.bodyMl.length).toBeGreaterThan(20);
  });

  it("tells a customer what THEY would be giving up, not what KAAM loses", () => {
    // The customer is about to hand lakhs to a stranger; the argument that
    // works is their own protection, not the platform's revenue.
    const w = offsiteWarning("reach me on 9847012345", "customer")!;
    expect(w.body).toMatch(/refund|don't turn up|stages/i);
    expect(w.body).not.toMatch(/commission|our cut|KAAM earns/i);
  });

  it("shows exactly what to remove", () => {
    const w = offsiteWarning("ring 9847012345 or mail a@b.com", "company")!;
    expect(w.hits.map((h) => h.kind).sort()).toEqual(["email", "phone"]);
  });
});

describe("recording attempts for the admin desk", () => {
  it("records nothing for a clean message", () => {
    expect(offsiteAttemptFrom("All good", "company", "ec_1")).toBeNull();
  });

  it("records who, when and what kind", () => {
    const a = offsiteAttemptFrom("9847012345", "company", "ec_1", "er_9", new Date("2026-07-27"))!;
    expect(a.by).toBe("company");
    expect(a.actorId).toBe("ec_1");
    expect(a.requestId).toBe("er_9");
    expect(a.kinds).toEqual(["phone"]);
  });

  it("collapses repeats of the same kind into one", () => {
    const a = offsiteAttemptFrom("9847012345 or 9847012399", "company", "ec_1")!;
    expect(a.kinds).toEqual(["phone"]);
  });
});
