import { describe, expect, it } from "vitest";
import {
  AGREEMENT_CLAUSES,
  AGREEMENT_VERSION,
  agreementCurrent,
  isValidGstin,
  isValidPan,
  mayQuote,
  NON_CIRCUMVENTION_MONTHS,
  panFromGstin,
  registrationProblems,
} from "../partner-agreement";
import { EVENT_FEE_CAP } from "../events";

/** A real-shaped GSTIN whose embedded PAN matches. */
const GSTIN = "32AABCU9603R1ZM";
const PAN = "AABCU9603R";

describe("proving there is a business here", () => {
  it("accepts a well-formed GSTIN and PAN", () => {
    expect(isValidGstin(GSTIN)).toBe(true);
    expect(isValidPan(PAN)).toBe(true);
  });

  it("is not fooled by something that is merely fifteen characters", () => {
    expect(isValidGstin("123456789012345")).toBe(false);
    expect(isValidGstin("32AABCU9603R1XM")).toBe(false); // no Z in position 14
    expect(isValidGstin("32AABCU9603R1Z")).toBe(false); // too short
  });

  it("rejects a PAN that is only nearly one", () => {
    expect(isValidPan("AABCU96038")).toBe(false); // last must be a letter
    expect(isValidPan("AABC9603RX")).toBe(false);
  });

  it("reads the PAN out of the GSTIN", () => {
    expect(panFromGstin(GSTIN)).toBe(PAN);
  });

  it("is case-insensitive, because nobody types a GSTIN in capitals", () => {
    expect(isValidGstin(GSTIN.toLowerCase())).toBe(true);
    expect(isValidPan(PAN.toLowerCase())).toBe(true);
  });
});

describe("what registration will not accept", () => {
  const good = { legalName: "Malabar Weddings Pvt Ltd", gstin: GSTIN, pan: PAN };

  it("passes a complete, consistent registration", () => {
    expect(registrationProblems(good)).toEqual([]);
  });

  it("insists on the registered name, not just a trading one", () => {
    expect(registrationProblems({ ...good, legalName: "MW" })[0].field).toBe("legalName");
  });

  it("reports every fault at once, not one at a time", () => {
    // A form that reveals one problem per attempt is a form people abandon.
    const problems = registrationProblems({ legalName: "", gstin: "nope", pan: "nope" });
    expect(problems.map((p) => p.field).sort()).toEqual(["gstin", "legalName", "pan"]);
  });

  it("catches a PAN that contradicts the GSTIN", () => {
    const problems = registrationProblems({ ...good, pan: "AABCU9603X" });
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain("doesn't match");
  });

  it("says everything in Malayalam too", () => {
    for (const p of registrationProblems({ legalName: "", gstin: "x", pan: "y" })) {
      expect(p.messageMl.length).toBeGreaterThan(10);
      expect(p.messageMl).not.toBe(p.message);
    }
  });
});

describe("the agreement", () => {
  const signed = { version: AGREEMENT_VERSION, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Suresh Nair" };

  it("states the commission and the cap, in the first clause", () => {
    // The argument always starts with a number somebody guessed at. A company
    // that has read the real one has nothing to renegotiate later.
    expect(AGREEMENT_CLAUSES[0].body).toContain("15%");
    expect(AGREEMENT_CLAUSES[0].body).toContain(EVENT_FEE_CAP.toLocaleString("en-IN"));
  });

  it("says plainly that talking costs nothing", () => {
    expect(AGREEMENT_CLAUSES[0].body).toMatch(/tastings|conversations/);
  });

  it("names the introduction rule and its window", () => {
    const clause = AGREEMENT_CLAUSES.find((c) => c.heading.includes("introduced"))!;
    expect(clause.body).toContain(String(NON_CIRCUMVENTION_MONTHS));
    // And is explicit that it claims nothing it did not bring.
    expect(clause.body).toMatch(/already had|another way/);
  });

  it("is written in both languages throughout", () => {
    for (const c of AGREEMENT_CLAUSES) {
      expect(c.headingMl.length).toBeGreaterThan(3);
      expect(c.bodyMl.length).toBeGreaterThan(20);
    }
  });

  it("counts only the version currently in force", () => {
    expect(agreementCurrent(signed)).toBe(true);
    expect(agreementCurrent({ ...signed, version: 0 })).toBe(false);
    expect(agreementCurrent(undefined)).toBe(false);
  });
});

describe("who may price a customer's function", () => {
  const signed = { version: AGREEMENT_VERSION, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "S" };

  it("an approved company that has signed", () => {
    expect(mayQuote({ status: "approved", agreement: signed })).toBe(true);
  });

  it("not one that is approved but has signed nothing", () => {
    expect(mayQuote({ status: "approved" })).toBe(false);
  });

  it("not one still waiting to be checked", () => {
    expect(mayQuote({ status: "pending", agreement: signed })).toBe(false);
    expect(mayQuote({ status: "rejected", agreement: signed })).toBe(false);
  });

  it("not one whose signature is against terms that have since changed", () => {
    expect(mayQuote({ status: "approved", agreement: { ...signed, version: 0 } })).toBe(false);
  });
});
