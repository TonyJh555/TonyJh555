import { describe, expect, it } from "vitest";
import {
  cheapestItem,
  hasMenu,
  readableMinutes,
  serviceDetail,
} from "@/data/service-details";
import { CATEGORIES } from "@/data/categories";

describe("item-level detail where the price genuinely differs", () => {
  it("prices a pedicure differently from extensions, because it is", () => {
    const ped = serviceDetail("nails", "Pedicure")!;
    const ext = serviceDetail("nails", "Nail Extensions")!;
    expect(ped.from).toBeLessThan(ext.from);
    expect(ped.minutes).toBeLessThan(ext.minutes);
  });

  it("says nothing where KAAM cannot back a number", () => {
    // Inventing a per-item price for a leak fix would be fake precision.
    expect(serviceDetail("plumb", "Leak Fix")).toBeNull();
    expect(hasMenu("plumb")).toBe(false);
    expect(hasMenu("nails")).toBe(true);
  });

  it("returns null for an item that isn't on the menu", () => {
    expect(serviceDetail("nails", "Haircut")).toBeNull();
  });

  it("finds the cheapest way into a category", () => {
    expect(cheapestItem("beauty")?.from).toBe(50); // upper lip threading
    expect(cheapestItem("plumb")).toBeNull();
  });
});

describe("every authored item matches a real sub-service", () => {
  // A menu entry whose name has drifted from the catalogue shows no duration
  // and no price, silently. This catches the typo rather than the customer.
  it("has no orphan menu entries", () => {
    const orphans: string[] = [];
    for (const c of CATEGORIES) {
      if (!hasMenu(c.id)) continue;
      for (const name of c.subServices) {
        if (!serviceDetail(c.id, name)) orphans.push(`${c.label} → ${name}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("gives every authored item a sane duration and price", () => {
    for (const c of CATEGORIES) {
      if (!hasMenu(c.id)) continue;
      for (const name of c.subServices) {
        const d = serviceDetail(c.id, name)!;
        expect(d.minutes, `${c.label} → ${name}`).toBeGreaterThan(0);
        expect(d.minutes, `${c.label} → ${name}`).toBeLessThanOrEqual(300);
        expect(d.from, `${c.label} → ${name}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("durations read the way people say them", () => {
  it("keeps minutes under an hour", () => {
    expect(readableMinutes(45)).toBe("45 min");
  });

  it("says hours past sixty", () => {
    expect(readableMinutes(60)).toBe("1 hr");
    expect(readableMinutes(75)).toBe("1 hr 15 min");
    expect(readableMinutes(240)).toBe("4 hr");
  });

  it("speaks Malayalam too", () => {
    expect(readableMinutes(45, true)).toContain("മിനിറ്റ്");
    expect(readableMinutes(90, true)).toContain("മണിക്കൂർ");
  });
});
