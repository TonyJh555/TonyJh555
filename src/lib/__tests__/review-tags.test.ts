import { describe, expect, it } from "vitest";
import { ISSUE_TAGS, POSITIVE_TAGS, tagsForRating } from "../review-tags";

describe("tagsForRating", () => {
  it("offers compliments for 4 and 5 stars", () => {
    expect(tagsForRating(5)).toBe(POSITIVE_TAGS);
    expect(tagsForRating(4)).toBe(POSITIVE_TAGS);
  });

  it("offers improvement tags for 1–3 stars", () => {
    for (const r of [1, 2, 3]) expect(tagsForRating(r)).toBe(ISSUE_TAGS);
  });

  it("keeps the two sets distinct and non-empty", () => {
    expect(POSITIVE_TAGS.length).toBeGreaterThan(0);
    expect(ISSUE_TAGS.length).toBeGreaterThan(0);
    for (const t of POSITIVE_TAGS) expect(ISSUE_TAGS).not.toContain(t);
  });
});
