import { describe, expect, it } from "vitest";
import {
  bpBand,
  careConcerns,
  careFields,
  careReadings,
  careRequired,
  careTrend,
  formatBp,
  handoverLine,
  handoverParts,
  hasCareNote,
  sugarBand,
  trendWarning,
  type CareNote,
} from "../care-notes";
import { markSessionPatch } from "../sessions";
import type { SessionMark } from "../types";

const visit = (date: string, care?: CareNote, status: SessionMark["status"] = "done"): SessionMark => ({
  date,
  status,
  by: "worker",
  at: `${date}T18:00:00.000Z`,
  ...(care ? { care } : {}),
});

describe("who is asked for a handover", () => {
  it("covers the trades where somebody is looked after", () => {
    for (const id of ["nurse", "eldercare", "babysitter"] as const) {
      expect(careRequired(id), id).toBe(true);
      expect(careFields(id).length, id).toBeGreaterThan(0);
    }
  });

  it("does not ask a tutor or a plumber about blood pressure", () => {
    for (const id of ["tutor", "plumb", "piano", "maid", "physio"] as const) {
      expect(careRequired(id), id).toBe(false);
      expect(careFields(id), id).toEqual([]);
      expect(careReadings(id), id).toEqual([]);
    }
  });

  it("asks a baby sitter about the child, not about tablets and readings", () => {
    const ids = careFields("babysitter").map((f) => f.id);
    expect(ids).not.toContain("meds");
    expect(careReadings("babysitter")).toEqual([]);
    // A nurse takes readings; an elder carer takes BP but is not doing bloods.
    expect(careReadings("nurse")).toEqual(["bp", "sugar"]);
    expect(careReadings("eldercare")).toEqual(["bp"]);
  });

  it("offers every option in both languages", () => {
    for (const id of ["nurse", "eldercare", "babysitter"] as const) {
      for (const field of careFields(id)) {
        expect(field.labelMl.length, field.id).toBeGreaterThan(2);
        expect(field.options.length, field.id).toBeGreaterThanOrEqual(3);
        for (const o of field.options) {
          expect(o.labelMl.length, `${field.id}.${o.id}`).toBeGreaterThan(2);
        }
      }
    }
  });

  it("gives every field a way to say the bad news", () => {
    // A form that can only record a good day is a form that records nothing.
    for (const field of careFields("nurse")) {
      expect(field.options.some((o) => o.concern), field.id).toBe(true);
    }
  });
});

describe("readings are banded, never diagnosed", () => {
  it("knows the usual range", () => {
    expect(bpBand(120, 80)).toBe("usual");
    expect(bpBand(150, 85)).toBe("high");
    expect(bpBand(130, 95)).toBe("high");
    expect(bpBand(85, 55)).toBe("low");
    expect(sugarBand(110)).toBe("usual");
    expect(sugarBand(240)).toBe("high");
    expect(sugarBand(60)).toBe("low");
  });

  it("points at the doctor and never at a medicine", () => {
    const [first] = careConcerns({ bp: { sys: 160, dia: 100 } }, "nurse");
    expect(first.text).toContain("160/100");
    expect(first.text).toMatch(/doctor/i);
    expect(first.reading).toBe(true);
    // Nothing in here may tell a family what to take or how much.
    expect(first.text).not.toMatch(/tablet|dose|mg\b|take .* medicine/i);
    expect(first.textMl).toContain("ഡോക്ട");
  });

  it("says nothing about a normal reading", () => {
    expect(careConcerns({ bp: { sys: 118, dia: 76 }, sugar: 105 }, "nurse")).toEqual([]);
  });

  it("puts readings above observations", () => {
    const concerns = careConcerns({ ate: "none", bp: { sys: 155, dia: 92 } }, "nurse");
    expect(concerns[0].reading).toBe(true);
    expect(concerns).toHaveLength(2);
  });

  it("raises only what the family should hear", () => {
    expect(careConcerns({ ate: "all", meds: "given", mood: "ok" }, "nurse")).toEqual([]);
    expect(careConcerns({ meds: "refused" }, "nurse")).toHaveLength(1);
    // A child not napping is normal; a patient not sleeping at all is not.
    expect(careConcerns({ sleep: "poorly" }, "babysitter")).toEqual([]);
    expect(careConcerns({ sleep: "poorly" }, "nurse")).toHaveLength(1);
  });

  it("has nothing to say about an empty note", () => {
    expect(careConcerns(undefined)).toEqual([]);
    expect(careConcerns({})).toEqual([]);
    expect(hasCareNote(undefined)).toBe(false);
    expect(hasCareNote({})).toBe(false);
    expect(hasCareNote({ mood: "ok" })).toBe(true);
  });
});

describe("the visit in one line", () => {
  it("reads as a sentence a son can scan on his phone", () => {
    const line = handoverLine(
      { ate: "all", meds: "given", mood: "ok", bp: { sys: 130, dia: 85 } },
      false,
      "nurse",
    );
    expect(line).toBe("Ate well · Taken on time · As usual · BP 130/85");
  });

  it("reads in Malayalam too", () => {
    const line = handoverLine({ ate: "all", meds: "refused" }, true, "nurse");
    expect(line).toContain("നന്നായി കഴിച്ചു");
    expect(line).not.toMatch(/Ate|Refused/);
  });

  it("is empty when nothing was recorded", () => {
    expect(handoverLine(undefined)).toBe("");
    expect(handoverLine({})).toBe("");
  });

  it("marks the parts a family must not skim past", () => {
    const parts = handoverParts(
      { ate: "none", meds: "given", bp: { sys: 118, dia: 76 }, sugar: 240 },
      false,
      "nurse",
    );
    const flagged = parts.filter((p) => p.concern).map((p) => p.text);
    // Said once, in place — not repeated underneath as a warning.
    expect(flagged).toEqual(["Didn't eat", "Sugar 240"]);
    expect(parts.map((p) => p.text)).toContain("BP 118/76");
  });

  it("formats a reading the way the machine shows it", () => {
    expect(formatBp({ sys: 118, dia: 76 })).toBe("118/76");
  });
});

describe("the last few visits, read together", () => {
  const marks: SessionMark[] = [
    visit("2026-07-01", { ate: "all", meds: "given", mood: "ok", bp: { sys: 120, dia: 80 } }),
    visit("2026-07-03", { ate: "some", meds: "refused", mood: "low" }),
    visit("2026-07-06", { ate: "none", meds: "refused", mood: "low", bp: { sys: 150, dia: 95 } }),
  ];

  it("counts what happened across them", () => {
    const t = careTrend(marks, "nurse");
    expect(t.visits).toBe(3);
    expect(t.ateWell).toBe(1);
    expect(t.didNotEat).toBe(1);
    expect(t.medsRefused).toBe(2);
    expect(t.lowMood).toBe(2);
    expect(t.flagged).toBe(2);
  });

  it("keeps the most recent reading, with its date", () => {
    const t = careTrend(marks, "nurse");
    expect(t.lastBp).toEqual({ date: "2026-07-06", sys: 150, dia: 95 });
    expect(t.lastSugar).toBeUndefined();
  });

  it("ignores visits that never happened", () => {
    const t = careTrend([...marks, visit("2026-07-08", { ate: "all" }, "missed")], "nurse");
    expect(t.visits).toBe(3);
  });

  it("looks only at the recent stretch", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      visit(`2026-07-${String(i + 1).padStart(2, "0")}`, { ate: "all" }),
    );
    expect(careTrend(many, "nurse").visits).toBe(6);
    expect(careTrend(many, "nurse", 3).visits).toBe(3);
  });

  it("speaks up about a pattern, in both languages", () => {
    const t = careTrend(marks, "nurse");
    expect(trendWarning(t)).toMatch(/refused 2 of the last 3/i);
    expect(trendWarning(t, true)).toContain("മരുന്ന്");
  });

  it("stays quiet on a good stretch, and before there is a pattern at all", () => {
    const good = careTrend(
      [visit("2026-07-01", { ate: "all", meds: "given" }), visit("2026-07-03", { ate: "all", meds: "given" }), visit("2026-07-06", { ate: "all", meds: "given" })],
      "nurse",
    );
    expect(trendWarning(good)).toBeNull();
    // Two bad visits out of two is not yet a pattern worth alarming a family.
    expect(trendWarning(careTrend(marks.slice(1), "nurse"))).toBeNull();
    expect(trendWarning(careTrend([], "nurse"))).toBeNull();
  });
});

describe("recording it against the visit", () => {
  it("stores the handover with the visit it belongs to", () => {
    const care: CareNote = { ate: "all", meds: "given", bp: { sys: 124, dia: 82 } };
    const { sessions } = markSessionPatch({}, "2026-07-06", "done", "worker", "Walked to the gate", care);
    expect(sessions![0].care).toEqual(care);
    expect(sessions![0].note).toBe("Walked to the gate");
  });

  it("refuses to attach a handover to a visit that did not happen", () => {
    // Nobody was there. Food and medicines cannot be reported for it.
    const { sessions } = markSessionPatch({}, "2026-07-06", "missed", "worker", undefined, {
      ate: "all",
    });
    expect(sessions![0].care).toBeUndefined();
    expect(sessions![0].status).toBe("missed");
  });

  it("leaves an untouched form off the record", () => {
    const { sessions } = markSessionPatch({}, "2026-07-06", "done", "worker", undefined, {});
    expect(sessions![0].care).toBeUndefined();
  });

  it("replaces the earlier handover when a visit is re-recorded", () => {
    const first = markSessionPatch({}, "2026-07-06", "done", "worker", undefined, { ate: "none" });
    const fixed = markSessionPatch(first, "2026-07-06", "done", "worker", undefined, { ate: "all" });
    expect(fixed.sessions).toHaveLength(1);
    expect(fixed.sessions![0].care).toEqual({ ate: "all" });
  });
});
