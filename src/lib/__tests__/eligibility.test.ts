import { describe, expect, it } from "vitest";
import { canServe, eligibleWorkers, womenOnly, womenOnlyNote } from "../eligibility";
import { dispatchQueue } from "../dispatch";
import { suggestWorkers } from "../worker-status";
import { WORKERS } from "@/data/workers";
import { CATEGORIES } from "@/data/categories";
import type { CategoryId, Worker } from "../types";

const WOMEN_ONLY: CategoryId[] = ["nurse", "babysitter", "beauty", "massage"];
const KOCHI = { lat: 9.98, lng: 76.3 };

function worker(over: Partial<Worker> = {}): Worker {
  return {
    id: "x1", name: "X", categoryId: "nurse", rating: 4.6, reviewCount: 50,
    rate: 1200, unit: "day", distanceKm: 2, district: "Ernakulam",
    coords: KOCHI, initials: "X", verified: true, experienceYears: 5,
    city: "Kochi", etaMinutes: 15, jobsDone: 200, bio: "", skills: [],
    surge: false, online: true, acceptRate: 0.9, female: true,
    ...over,
  };
}

describe("the women-only promise is a rule, not a comment", () => {
  it("knows which trades carry it", () => {
    for (const id of WOMEN_ONLY) expect(womenOnly(id)).toBe(true);
    expect(womenOnly("elec")).toBe(false);
    expect(womenOnlyNote("elec")).toBeNull();
    expect(womenOnlyNote("nurse")?.ml.length).toBeGreaterThan(10);
  });

  it("refuses a man for a women-only trade", () => {
    expect(canServe(worker({ female: false }), "nurse")).toBe(false);
    expect(canServe(worker({ female: true }), "nurse")).toBe(true);
  });

  it("treats an unknown as ineligible, never as permission", () => {
    // A missing flag must not resolve to "send them anyway" — the customer is
    // trusting the platform on precisely this point.
    expect(canServe(worker({ female: undefined }), "nurse")).toBe(false);
  });

  it("does not restrict trades that carry no such promise", () => {
    expect(canServe(worker({ categoryId: "elec", female: false }), "elec")).toBe(true);
  });

  it("still requires the right trade", () => {
    expect(canServe(worker({ categoryId: "elec" }), "nurse")).toBe(false);
  });
});

describe("every path that reaches a customer obeys it", () => {
  // The bug this replaces: the rule lived only in the seed generator, so
  // dispatch, suggestions and search would each have offered a man the moment
  // real data stopped matching the pattern the seed happened to follow.
  const intruder = worker({ id: "male1", name: "Male Intruder", female: false });
  const roster = [...WORKERS, intruder];

  it("dispatch never offers the job to him", () => {
    const queue = dispatchQueue(roster, "nurse", KOCHI);
    expect(queue.map((w) => w.id)).not.toContain("male1");
    expect(queue.length).toBeGreaterThan(0); // and real nurses still surface
  });

  it("'choose another worker' never suggests him", () => {
    const suggested = suggestWorkers(roster, "nurse", {
      presence: {}, away: {}, bookings: [],
    });
    expect(suggested.map((s) => s.worker.id)).not.toContain("male1");
  });

  it("the shared filter excludes him", () => {
    expect(eligibleWorkers(roster, "nurse").map((w) => w.id)).not.toContain("male1");
  });
});

describe("the seeded roster keeps the promise it makes", () => {
  it("has no male worker in any women-only trade", () => {
    for (const w of WORKERS) {
      if (womenOnly(w.categoryId)) {
        expect(w.female, `${w.name} (${w.categoryId}) must be a woman`).toBe(true);
      }
    }
  });

  it("leaves at least one worker in every women-only trade", () => {
    // Enforcement that empties a category is a different outage, not a fix.
    for (const id of WOMEN_ONLY) {
      expect(eligibleWorkers(WORKERS, id).length, `no workers left for ${id}`).toBeGreaterThan(0);
    }
  });

  it("only the four intended trades are restricted", () => {
    const restricted = CATEGORIES.filter((c) => c.femaleWorkersOnly).map((c) => c.id);
    expect(restricted.sort()).toEqual([...WOMEN_ONLY].sort());
  });
});

describe("every service KAAM advertises can actually be booked", () => {
  // Massage, Photographer and Event Staff each had a tile on the home screen
  // and not one worker in Kerala behind it. A category a customer can browse
  // to and cannot book from is a promise the catalogue makes and the roster
  // breaks.
  it("no category is empty", () => {
    const empty = CATEGORIES.filter((c) => !WORKERS.some((w) => w.categoryId === c.id));
    expect(empty.map((c) => c.label)).toEqual([]);
  });

  it("every category has someone eligible, not just someone listed", () => {
    for (const c of CATEGORIES) {
      expect(eligibleWorkers(WORKERS, c.id).length, `nobody can serve ${c.label}`)
        .toBeGreaterThan(0);
    }
  });
});
