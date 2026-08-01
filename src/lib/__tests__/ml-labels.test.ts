import { describe, expect, it } from "vitest";
import { mlMonth, mlWeekday } from "@/lib/ml-labels";
import { PRO_TIERS, proStatus, tierPerks } from "@/lib/pro-tiers";

/**
 * The weekday down the side of a chart and the month on a payout row are the
 * two labels a worker reads that come out of date formatting rather than out
 * of a translated string. Left alone they are the only English on an otherwise
 * Malayalam screen.
 */
describe("ml-labels", () => {
  it("leaves everything alone when the reader is on English", () => {
    expect(mlWeekday("Mon", false)).toBe("Mon");
    expect(mlMonth("12 Jul", false)).toBe("12 Jul");
  });

  it("translates a bare weekday tick", () => {
    expect(mlWeekday("Mon", true)).toBe("തി");
    expect(mlWeekday("Sun", true)).toBe("ഞാ");
  });

  it("translates the weekday inside the heatmap's peak reading", () => {
    // "Sat 6–9 pm" — the day has to change without disturbing the time.
    const peak = mlWeekday("Sat 6–9 pm", true);
    expect(peak).toContain("ശ");
    expect(peak).toContain("6–9 pm");
    expect(peak).not.toContain("Sat");
  });

  it("translates the month in both label shapes", () => {
    // A trend point ("12 Jul") and a monthly bar ("Jul 2026") reach the same
    // helper, so it must not care which side the month sits on.
    expect(mlMonth("12 Jul", true)).toBe("12 ജൂലൈ");
    expect(mlMonth("Jul 2026", true)).toBe("ജൂലൈ 2026");
  });

  it("passes through a token it has no translation for", () => {
    // Better a stray English word than a blank axis.
    expect(mlWeekday("Xyz", true)).toBe("Xyz");
    expect(mlMonth("Xyz 2026", true)).toBe("Xyz 2026");
  });

  it("never returns an empty label", () => {
    for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(mlWeekday(d, true).length).toBeGreaterThan(0);
    }
    for (const m of ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]) {
      expect(mlMonth(m, true).length).toBeGreaterThan(0);
    }
  });
});

describe("Pro tiers speak Malayalam", () => {
  it("gives every tier as many Malayalam perks as English ones", () => {
    // A missing translation here would silently shorten the list rather than
    // show English, which is the worse failure: the worker never learns what
    // the tier is actually worth.
    for (const tier of PRO_TIERS) {
      expect(tier.perksMl).toHaveLength(tier.perks.length);
      for (const p of tier.perksMl) expect(p.trim().length).toBeGreaterThan(0);
    }
  });

  it("hands back the right list for the reader", () => {
    const gold = PRO_TIERS.find((t) => t.id === "gold")!;
    expect(tierPerks(gold, false)).toEqual(gold.perks);
    expect(tierPerks(gold, true)).toEqual(gold.perksMl);
  });

  it("translates the path to the next tier", () => {
    const status = proStatus({ jobs: 40, rating: 4.6, completionRate: 0.9 });
    expect(status.requirements.length).toBeGreaterThan(0);
    for (const r of status.requirements) {
      expect(r.labelMl.trim().length).toBeGreaterThan(0);
      expect(r.haveMl.trim().length).toBeGreaterThan(0);
      // The number stays a number; only the words around it change.
      expect(r.labelMl).not.toBe(r.label);
    }
  });

  it("says 'not rated yet' in Malayalam rather than falling back to English", () => {
    const status = proStatus({ jobs: 0, rating: 0, completionRate: 1 });
    const rating = status.requirements.find((r) => r.label.includes("rating"))!;
    expect(rating.have).toBe("not rated yet");
    expect(rating.haveMl).not.toMatch(/[a-z]/);
  });
});
