import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  categoryLabel,
  categoryLabelFor,
  GROUPS,
  groupLabel,
} from "@/data/categories";

/**
 * Every service has a Malayalam name.
 *
 * KAAM is a Kerala-only platform whose whole app is bilingual, and the service
 * name was the one string that never was: thirty-seven trades in English while
 * the buttons, the warnings and the money around them were translated. It went
 * unnoticed because nothing breaks — the page renders, just in the wrong
 * language, and only a Malayalam reader ever finds out.
 *
 * `labelMl` is required on the type so the compiler catches a new category with
 * no Malayalam. These check the things a type cannot: that the string is really
 * Malayalam and not the English name copied across.
 */

/** Any character in the Malayalam block. */
const MALAYALAM = /[ഀ-ൿ]/;

describe("every service is named in Malayalam", () => {
  it("has a Malayalam name for all of them", () => {
    const missing = CATEGORIES.filter((c) => !MALAYALAM.test(c.labelMl)).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it("never just repeats the English name", () => {
    // The failure this catches is a placeholder: labelMl filled in with the
    // English string to satisfy the compiler and then forgotten.
    const copied = CATEGORIES.filter((c) => c.labelMl.trim() === c.label.trim()).map((c) => c.id);
    expect(copied).toEqual([]);
  });

  it("gives no two services the same Malayalam name", () => {
    // Two trades sharing a name is a customer picking the wrong one.
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const c of CATEGORIES) {
      const first = seen.get(c.labelMl);
      if (first) clashes.push(`${first} / ${c.id} → ${c.labelMl}`);
      else seen.set(c.labelMl, c.id);
    }
    expect(clashes).toEqual([]);
  });
});

describe("every sector is named in Malayalam", () => {
  it("translates the heading and the line under it", () => {
    for (const g of GROUPS) {
      expect(MALAYALAM.test(g.labelMl), g.id).toBe(true);
      expect(MALAYALAM.test(g.taglineMl), g.id).toBe(true);
      expect(g.labelMl).not.toBe(g.label);
      expect(g.taglineMl).not.toBe(g.tagline);
    }
  });
});

describe("picking the name for the language being read", () => {
  it("returns English for English and Malayalam for Malayalam", () => {
    const elec = CATEGORIES.find((c) => c.id === "elec")!;
    expect(categoryLabel(elec, false)).toBe("Electrician");
    expect(categoryLabel(elec, true)).toBe("ഇലക്ട്രീഷ്യൻ");
    expect(categoryLabelFor("bystander", true)).toBe("ആശുപത്രി കൂട്ടിരിപ്പ്");
  });

  it("does the same for a sector", () => {
    const care = GROUPS.find((g) => g.id === "care")!;
    expect(groupLabel(care, false)).toBe("Care & Health");
    expect(groupLabel(care, true)).toBe("പരിചരണവും ആരോഗ്യവും");
  });

  it("falls back to the id rather than throwing on an unknown service", () => {
    // A stale booking naming a retired category must not take the page down.
    expect(categoryLabelFor("not-a-service" as never, true)).toBe("not-a-service");
  });
});
