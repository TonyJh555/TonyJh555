import { describe, expect, it } from "vitest";
import { confirmedPhrase, isScheduled } from "../format";

describe("what 'confirmed' means", () => {
  it("is 'on the way' when they asked for someone now", () => {
    expect(confirmedPhrase({ when: "asap" })).toBe("on the way");
    expect(confirmedPhrase(undefined)).toBe("on the way");
  });

  it("is a date when the job is a date", () => {
    // The bug: a caterer booked for a wedding six days out was announced as
    // "on the way", which reads as the app not knowing what it just stored.
    const phrase = confirmedPhrase({ when: "scheduled", date: "2026-08-09", time: "09:00" });
    expect(phrase).toContain("booked for");
    expect(phrase).toContain("9 Aug");
    expect(phrase).not.toContain("on the way");
  });

  it("never says 'on the way' about a dated booking, in either language", () => {
    const s = { when: "scheduled", date: "2026-08-09", time: "09:00" } as const;
    expect(confirmedPhrase(s, false)).not.toContain("on the way");
    expect(confirmedPhrase(s, true)).not.toContain("വരുന്ന വഴി");
  });

  it("knows which kind of booking it is looking at", () => {
    expect(isScheduled({ when: "scheduled", date: "2026-08-09", time: "09:00" })).toBe(true);
    expect(isScheduled({ when: "asap" })).toBe(false);
    expect(isScheduled(undefined)).toBe(false);
  });
});
