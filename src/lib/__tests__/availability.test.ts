import { describe, expect, it } from "vitest";
import { isAway, awayUntil } from "../availability";

const NOW = new Date("2026-07-16T12:00:00");

describe("availability", () => {
  it("is away when the away-until date is in the future", () => {
    const map = { w1: "2026-07-20T00:00:00.000Z" };
    expect(isAway(map, "w1", NOW)).toBe(true);
    expect(awayUntil(map, "w1")).toBe("2026-07-20T00:00:00.000Z");
  });

  it("is not away once the date has passed", () => {
    expect(isAway({ w1: "2026-07-10T00:00:00.000Z" }, "w1", NOW)).toBe(false);
  });

  it("is not away with no entry", () => {
    expect(isAway({}, "w1", NOW)).toBe(false);
    expect(awayUntil({}, "w1")).toBeUndefined();
  });
});
