import { describe, expect, it } from "vitest";
import { earnedBadges } from "../badges";
import { WORKERS } from "@/data/workers";

const w = (over: Partial<Parameters<typeof earnedBadges>[0]> = {}) => ({
  verified: true,
  rating: 4.5,
  reviewCount: 40,
  experienceYears: 3,
  jobsDone: 100,
  ...over,
});

describe("a badge must be backed by something KAAM holds", () => {
  it("claims nothing about a worker with no record", () => {
    expect(earnedBadges(w({ verified: false }))).toEqual([]);
  });

  it("gives ID verified only once the KYC desk approved them", () => {
    expect(earnedBadges(w()).map((b) => b.label)).toContain("ID verified ✅");
    expect(earnedBadges(w({ verified: false })).map((b) => b.label)).not.toContain(
      "ID verified ✅",
    );
  });

  it("needs a high rating AND enough of them to be top rated", () => {
    const label = (o: object) => earnedBadges(w(o)).map((b) => b.label);
    expect(label({ rating: 4.9, reviewCount: 200 })).toContain("Top rated ⭐");
    expect(label({ rating: 4.9, reviewCount: 3 })).not.toContain("Top rated ⭐");
    expect(label({ rating: 4.4, reviewCount: 200 })).not.toContain("Top rated ⭐");
  });

  it("rounds the job count down, never up", () => {
    expect(earnedBadges(w({ jobsDone: 847 })).map((b) => b.label)).toContain("800+ jobs done");
  });

  it("every badge says what backs it", () => {
    for (const badge of earnedBadges(w({ rating: 4.9, reviewCount: 200, jobsDone: 900, experienceYears: 10 }))) {
      expect(badge.basis.length).toBeGreaterThan(10);
      expect(badge.basisMl.length).toBeGreaterThan(5);
    }
  });
});

describe("the roster makes no claim KAAM cannot stand behind", () => {
  // KAAM runs no police check, carries no insurance, buys no background
  // reports. If one of these ever appears on a worker again, it is a promise
  // the company cannot keep.
  const FORBIDDEN = /police|insur|background check|verified 🔵/i;

  it("never shows police-verification, insurance or background-check claims", () => {
    for (const worker of WORKERS) {
      for (const badge of earnedBadges(worker)) {
        expect(badge.label, `${worker.name}: ${badge.label}`).not.toMatch(FORBIDDEN);
        expect(badge.basis, `${worker.name}: ${badge.basis}`).not.toMatch(FORBIDDEN);
      }
    }
  });
});
