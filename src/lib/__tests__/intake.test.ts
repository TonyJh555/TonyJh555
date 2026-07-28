import { describe, expect, it } from "vitest";
import {
  hasSeriousFlag,
  intakeDone,
  intakeFlags,
  intakeRequired,
  INTAKE_QUESTIONS,
  questionsFor,
  type IntakeAnswers,
} from "../intake";

const answers = (yes: IntakeAnswers["yes"], note?: string): IntakeAnswers => ({
  yes,
  note,
  answeredAt: "2026-07-27T10:00:00.000Z",
});

describe("asked where somebody is working on your body", () => {
  it("applies to the body-work and on-skin trades", () => {
    for (const id of ["massage", "physio", "beauty", "nails", "yoga"] as const) {
      expect(intakeRequired(id), id).toBe(true);
    }
  });

  it("does not interrogate an electrician's customer", () => {
    // Health questions where they change nothing are a privacy cost with no
    // safety benefit, and one more screen between the customer and booking.
    for (const id of ["elec", "plumb", "driver", "tutor", "movers"] as const) {
      expect(intakeRequired(id), id).toBe(false);
    }
  });

  it("asks a masseur more than a nail technician", () => {
    expect(questionsFor("massage").length).toBeGreaterThan(questionsFor("nails").length);
    expect(questionsFor("nails").map((q) => q.id)).toContain("diabetes");
  });

  it("stays short enough that people answer it", () => {
    for (const id of ["massage", "physio", "beauty", "nails", "yoga"] as const) {
      expect(questionsFor(id).length, id).toBeLessThanOrEqual(6);
    }
  });

  it("explains why every question is asked, in both languages", () => {
    for (const q of INTAKE_QUESTIONS) {
      expect(q.why.length, q.id).toBeGreaterThan(20);
      expect(q.whyMl.length, q.id).toBeGreaterThan(10);
      expect(q.labelMl.length, q.id).toBeGreaterThan(5);
    }
  });
});

describe("the worker is told what to do, not what the customer has", () => {
  it("turns each answer into an instruction", () => {
    const flags = intakeFlags(answers(["pregnant"]));
    expect(flags).toHaveLength(1);
    expect(flags[0].action).toMatch(/no deep pressure|side-lying/i);
    expect(flags[0].actionMl.length).toBeGreaterThan(10);
  });

  it("puts the unsafe ones first", () => {
    const flags = intakeFlags(answers(["bloodPressure", "pregnant"]));
    expect(flags[0].id).toBe("pregnant");
    expect(flags[0].serious).toBe(true);
  });

  it("knows which answers make the standard treatment unsafe", () => {
    expect(hasSeriousFlag(answers(["pregnant"]))).toBe(true);
    expect(hasSeriousFlag(answers(["surgery"]))).toBe(true);
    expect(hasSeriousFlag(answers(["diabetes"]))).toBe(true);
    // Worth knowing, but the session still goes ahead as planned.
    expect(hasSeriousFlag(answers(["bloodPressure"]))).toBe(false);
    expect(hasSeriousFlag(answers(["skin"]))).toBe(false);
  });

  it("says nothing when there is nothing to say", () => {
    expect(intakeFlags(answers([]))).toEqual([]);
    expect(intakeFlags(undefined)).toEqual([]);
    expect(hasSeriousFlag(undefined)).toBe(false);
  });

  it("has an instruction for every question that can be answered yes", () => {
    // A flag with no action is a condition disclosed for no reason.
    const ids = INTAKE_QUESTIONS.map((q) => q.id);
    const flagged = intakeFlags(answers(ids)).map((f) => f.id);
    expect(flagged.sort()).toEqual([...ids].sort());
  });
});

describe("knowing whether it has been filled in", () => {
  it("is done only once it has actually been answered", () => {
    expect(intakeDone({})).toBe(false);
    expect(intakeDone({ intake: answers([]) })).toBe(true);
  });

  it("counts an all-no answer as done", () => {
    // Answering "none of these" is an answer, and must not keep nagging.
    expect(intakeDone({ intake: answers([]) })).toBe(true);
  });
});
