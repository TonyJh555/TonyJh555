import { describe, expect, it } from "vitest";
import { matchScore, rankWorkers, rankByProximity } from "../matching";
import { WORKERS } from "@/data/workers";
import { KERALA_DISTRICTS } from "../geo";
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
    district: "Ernakulam",
    coords: { lat: 9.98, lng: 76.3 },
    initials: "TW",
    verified: true,
    experienceYears: 5,
    city: "Kochi",
    etaMinutes: 15,
    jobsDone: 500,
    bio: "",
    skills: [],

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

describe("rankByProximity", () => {
  const from = { lat: 9.98, lng: 76.3 }; // Kochi
  const near = makeWorker({ id: "near", coords: { lat: 9.99, lng: 76.31 } }); // ~1.5 km
  const far = makeWorker({ id: "far", coords: { lat: 11.87, lng: 75.37 } }); // Kannur, ~250 km

  it("orders nearest first and recomputes live distance", () => {
    const ranked = rankByProximity([far, near], from);
    expect(ranked[0].id).toBe("near");
    expect(ranked[0].distanceKm).toBeLessThan(ranked[1].distanceKm);
    expect(ranked[1].distanceKm).toBeGreaterThan(100); // Kannur is far from Kochi
  });

  it("keeps online workers above offline ones", () => {
    const onlineFar = makeWorker({ id: "of", online: true, coords: { lat: 11.87, lng: 75.37 } });
    const offlineNear = makeWorker({ id: "on", online: false, coords: { lat: 9.99, lng: 76.31 } });
    const ranked = rankByProximity([offlineNear, onlineFar], from);
    expect(ranked[0].id).toBe("of");
  });

  it("does not mutate the input array", () => {
    const list = [far, near];
    rankByProximity(list, from);
    expect(list[0].id).toBe("far");
  });
});

describe("statewide roster", () => {
  it("has workers in all 14 Kerala districts", () => {
    for (const d of KERALA_DISTRICTS) {
      const count = WORKERS.filter((w) => w.district === d.name).length;
      expect(count, `${d.name} should have workers`).toBeGreaterThan(0);
    }
  });

  it("every district can serve the everyday essentials", () => {
    const essentials = ["elec", "plumb", "nurse", "maid", "cook", "clean", "driver"] as const;
    for (const d of KERALA_DISTRICTS) {
      const cats = new Set(WORKERS.filter((w) => w.district === d.name).map((w) => w.categoryId));
      for (const e of essentials) {
        expect(cats.has(e), `${d.name} missing ${e}`).toBe(true);
      }
    }
  });

  it("gives every worker real coordinates", () => {
    for (const w of WORKERS) {
      expect(Number.isFinite(w.coords.lat) && Number.isFinite(w.coords.lng)).toBe(true);
    }
  });
});
