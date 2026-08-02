import { describe, expect, it } from "vitest";
import { jobRef, jobStamp, jobStampLine } from "../format";

/**
 * A notification has to say which job it is about.
 *
 * "Fan Repair: nearly an hour worked" is fine for one booking and useless for
 * six: a phone holding a stack of KAAM alerts repeats the same sentence and
 * identifies none of them. Every job alert now leads with what, who, when and
 * a reference — the same reference the tax invoice prints, so a customer can
 * quote one string at support and it matches their receipt.
 */

describe("the reference a customer can quote", () => {
  it("is the same string the invoice prints", () => {
    // The invoice built this inline for months; both now read one helper, so
    // they cannot drift apart.
    expect(jobRef("bk-2026-08-02-1a2b3c4d")).toBe("KAAM-1A2B3C4D");
  });

  it("is stable for the same booking", () => {
    expect(jobRef("bk1")).toBe(jobRef("bk1"));
  });

  it("distinguishes two bookings", () => {
    expect(jobRef("booking-aaaaaaaa")).not.toBe(jobRef("booking-bbbbbbbb"));
  });

  it("copes with an id shorter than the reference", () => {
    expect(jobRef("bk1")).toBe("KAAM-BK1");
  });
});

describe("the time stamp", () => {
  it("carries a time and a date, so today's alert differs from yesterday's", () => {
    const s = jobStamp("2026-08-02T20:12:00");
    expect(s).toMatch(/8:12/);
    expect(s).toMatch(/Aug/);
  });

  it("returns nothing rather than 'Invalid Date' for a broken timestamp", () => {
    expect(jobStamp("not-a-date")).toBe("");
  });
});

describe("the identifying line", () => {
  it("names the worker, the time and the reference", () => {
    const line = jobStampLine({
      bookingId: "bk-1a2b3c4d",
      workerName: "Rahul Sharma",
      at: "2026-08-02T20:12:00",
    });
    expect(line).toContain("Rahul Sharma");
    expect(line).toContain("8:12");
    expect(line).toContain("KAAM-1A2B3C4D");
  });

  it("drops the parts it doesn't have, leaving no dangling separators", () => {
    // A job that hasn't started has no start time; the line must not read
    // "Rahul ·  · KAAM-…".
    const line = jobStampLine({ bookingId: "bk-1a2b3c4d", workerName: "Rahul" });
    expect(line).toBe("Rahul · KAAM-1A2B3C4D");
    expect(jobStampLine({ bookingId: "bk-1a2b3c4d" })).toBe("KAAM-1A2B3C4D");
  });

  it("always ends with the reference, so it is findable in a long list", () => {
    const line = jobStampLine({ bookingId: "bk-zzzzzzzz", workerName: "A", at: "2026-08-02T09:00:00" });
    expect(line.endsWith("KAAM-ZZZZZZZZ")).toBe(true);
  });
});
