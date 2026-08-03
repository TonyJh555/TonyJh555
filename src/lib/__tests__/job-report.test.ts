import { describe, expect, it } from "vitest";
import {
  handoverBrief,
  reportComplete,
  reportRequired,
  reportSummary,
  workRemains,
  type JobReport,
} from "../job-report";
import {
  AUTO_FINALIZE_MINUTES,
  DISPUTE_HELP_MINUTES,
  completionExpired,
  completionNeedsHelp,
} from "../completion";
import type { Booking } from "../types";

/**
 * What the worker leaves behind, and who gets timed out.
 *
 * The report is the artefact everything else leans on: a replacement worker's
 * brief, the customer's evidence in a complaint, and the worker's evidence
 * when they are the one accused.
 *
 * The completion timeout is the money question. Silence does not mean the same
 * thing on both sides, so it must not be treated the same.
 */

const AT = "2026-08-02T18:00:00.000Z";

function report(over: Partial<JobReport> = {}): JobReport {
  return { did: ["diagnosed", "tested"], left: "nothing", photos: [], at: AT, ...over };
}

describe("who owes a report", () => {
  it("is asked of the repair trades", () => {
    for (const id of ["elec", "plumb", "ac", "carp", "painter"] as const) {
      expect(reportRequired(id), id).toBe(true);
    }
  });

  it("is not asked of a violinist or a carer", () => {
    // A performance has nothing to hand over; a carer writes the richer visit
    // note in care-notes.ts instead.
    expect(reportRequired("violin")).toBe(false);
    expect(reportRequired("nurse")).toBe(false);
    expect(reportRequired("dance")).toBe(false);
  });
});

describe("a report worth saving", () => {
  it("needs what was done and what is left", () => {
    expect(reportComplete(report())).toBe(true);
    expect(reportComplete({ did: [], left: "nothing" })).toBe(false);
    expect(reportComplete({ did: ["tested"] })).toBe(false);
    expect(reportComplete(undefined)).toBe(false);
  });

  it("reads as one line a customer can understand", () => {
    const line = reportSummary(report({ did: ["replaced"], part: "Capacitor 2.5µF" }));
    expect(line).toContain("Replaced a part");
    expect(line).toContain("Capacitor 2.5µF");
    expect(line).toContain("Nothing");
  });

  it("reads in Malayalam for a worker who wants it", () => {
    const line = reportSummary(report({ did: ["cleaned"] }), true);
    expect(line).toContain("വൃത്തിയാക്കി");
    expect(line).not.toMatch(/[a-z]/);
  });

  it("says nothing at all when there is nothing to say", () => {
    // Better an empty string than a confident-looking summary of a blank form.
    expect(reportSummary(undefined)).toBe("");
    expect(reportSummary({ did: [], left: "nothing", photos: [], at: AT })).toBe("");
  });
});

describe("whether the job is actually finished", () => {
  it("is finished when nothing is left", () => {
    expect(workRemains(report({ left: "nothing" }))).toBe(false);
  });

  it("is not finished when a part is needed or a visit remains", () => {
    expect(workRemains(report({ left: "needs_part" }))).toBe(true);
    expect(workRemains(report({ left: "second_visit" }))).toBe(true);
    expect(workRemains(report({ left: "customer_decides" }))).toBe(true);
  });
});

describe("the brief for whoever picks the job up next", () => {
  it("tells them what was already done and what is left", () => {
    const brief = handoverBrief(
      report({ did: ["diagnosed", "cleaned"], left: "needs_part", part: "Fan capacitor", photos: ["a", "b"] }),
    )!;
    expect(brief).toContain("Checked & diagnosed");
    expect(brief).toContain("A part has to be bought");
    expect(brief).toContain("Fan capacitor");
    expect(brief).toContain("2 photos");
  });

  it("does not exist for a job that is finished", () => {
    // Nothing to hand over, so nothing is handed over.
    expect(handoverBrief(report({ left: "nothing" }))).toBeNull();
    expect(handoverBrief(undefined)).toBeNull();
  });
});

/* ── The timeout, which decides money ─────────────────────────────────── */

function pending(by: "worker" | "customer", minutesAgo: number): Pick<Booking, "status" | "completion"> {
  return {
    status: "in_progress",
    completion: { by, at: new Date(Date.now() - minutesAgo * 60_000).toISOString(), code: "1234" },
  };
}

describe("a worker's declaration finalises itself", () => {
  it("waits, then closes", () => {
    expect(completionExpired(pending("worker", AUTO_FINALIZE_MINUTES - 1))).toBe(false);
    expect(completionExpired(pending("worker", AUTO_FINALIZE_MINUTES + 1))).toBe(true);
  });
});

describe("a customer's declaration never does", () => {
  it("does not close the job however long the worker is silent", () => {
    // The abuse this prevents: a customer stops the meter twenty minutes into
    // a two-hour job, says nothing, and it closes itself — with the worker
    // still working, unpaid, hands in a fuse box.
    expect(completionExpired(pending("customer", AUTO_FINALIZE_MINUTES + 1))).toBe(false);
    expect(completionExpired(pending("customer", 24 * 60))).toBe(false);
  });

  it("becomes KAAM's problem after a while", () => {
    expect(completionNeedsHelp(pending("customer", DISPUTE_HELP_MINUTES - 1))).toBe(false);
    expect(completionNeedsHelp(pending("customer", DISPUTE_HELP_MINUTES + 1))).toBe(true);
  });

  it("never asks for help about a worker's declaration", () => {
    // That one closes on its own; there is nothing to settle.
    expect(completionNeedsHelp(pending("worker", 24 * 60))).toBe(false);
  });
});

describe("neither applies to a job that isn't running", () => {
  it("ignores a completed booking", () => {
    const done = { status: "completed" as const, completion: pending("worker", 60).completion };
    expect(completionExpired(done)).toBe(false);
    expect(completionNeedsHelp(done)).toBe(false);
  });
});
