import { describe, expect, it } from "vitest";
import { matchScore, rankWorkers } from "../matching";
import type { Worker } from "../types";

function makeWorker(overrides: Partial<Worker>): Worker {
  return {
    id: "t1",
    name: "Test Worker",
    categoryId: "elec",
    rating: 4.5,
    reviewCount: 10,
    rate: 500,
    unit: "visit",
    distanceKm: 2,
    initials: "TW",
    verified: true,
    experienceYears: 5,
    city: "Delhi",
    etaMinutes: 15,
    jobsDone: 500,
    bio: "",
    skills: [],
    badges: [],
    surge: false,
    online: true,
    acceptRate: 0.9,
    ...overrides,
  };
}

describe("matchScore", () => {
  it("scores a perfect worker at 100", () => {
    const perfect = makeWorker({ distanceKm: 0, rating: 5, acceptRate: 1, jobsDone: 1000 });
    expect(matchScore(perfect)).toBe(100);
  });

  it("prefers closer workers, all else equal", () => {
    const near = makeWorker({ distanceKm: 0.5 });
    const far = makeWorker({ distanceKm: 8 });
    expect(matchScore(near)).toBeGreaterThan(matchScore(far));
  });

  it("does not go negative for very distant workers", () => {
    const remote = makeWorker({ distanceKm: 50, rating: 3, acceptRate: 0, jobsDone: 0 });
    expect(matchScore(remote)).toBeGreaterThanOrEqual(0);
  });
});

describe("rankWorkers", () => {
  it("ranks online workers above offline ones regardless of score", () => {
    const offlineStar = makeWorker({ id: "a", online: false, distanceKm: 0, rating: 5, jobsDone: 1000, acceptRate: 1 });
    const onlineAverage = makeWorker({ id: "b", online: true, distanceKm: 9, rating: 3.5, jobsDone: 50, acceptRate: 0.5 });
    const ranked = rankWorkers([offlineStar, onlineAverage]);
    expect(ranked[0].id).toBe("b");
  });

  it("does not mutate the input array", () => {
    const workers = [makeWorker({ id: "a", online: false }), makeWorker({ id: "b" })];
    rankWorkers(workers);
    expect(workers[0].id).toBe("a");
  });
});
