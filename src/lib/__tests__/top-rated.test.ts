import { describe, expect, it } from "vitest";
import { rankByRating, RATING_PRIOR, topRatedScore } from "../top-rated";
import type { Worker } from "../types";

const w = (rating: number, reviewCount: number) => ({ rating, reviewCount }) as Worker;

describe("topRatedScore", () => {
  it("shrinks a thin-evidence rating toward the prior", () => {
    // 5.0 from just 2 reviews should land well below its face value.
    const score = topRatedScore(w(5, 2));
    expect(score).toBeLessThan(5);
    expect(score).toBeGreaterThan(RATING_PRIOR); // but still above the mean
  });

  it("trusts a rating more as the review count grows", () => {
    expect(topRatedScore(w(4.9, 500))).toBeGreaterThan(topRatedScore(w(4.9, 10)));
  });

  it("a zero-review worker sits exactly at the prior", () => {
    expect(topRatedScore(w(4.9, 0))).toBeCloseTo(RATING_PRIOR, 5);
  });
});

describe("rankByRating", () => {
  it("ranks a proven 4.9 above a lucky 5.0 with almost no reviews", () => {
    const lucky = w(5, 2);
    const proven = w(4.9, 300);
    const [first] = rankByRating([lucky, proven]);
    expect(first).toBe(proven);
  });

  it("breaks ties by who has more genuine ratings", () => {
    const fewer = { rating: 4.8, reviewCount: 40, id: "a" } as Worker;
    const more = { rating: 4.8, reviewCount: 400, id: "b" } as Worker;
    expect(rankByRating([fewer, more])[0].id).toBe("b");
  });

  it("does not mutate the input array", () => {
    const list = [w(4.5, 10), w(4.9, 200)];
    const snapshot = [...list];
    rankByRating(list);
    expect(list).toEqual(snapshot);
  });
});
