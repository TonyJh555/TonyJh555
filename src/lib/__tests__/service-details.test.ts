import { describe, expect, it } from "vitest";
import {
  cheapestItem,
  hasMenu,
  readableMinutes,
  serviceDetail,
} from "@/data/service-details";
import { CATEGORIES } from "@/data/categories";
import type { CategoryId } from "@/lib/types";

/** Trades sold as a shift somebody stays for, not as hours of work performed. */
const STAY_TRADES = new Set<CategoryId>(["bystander"]);

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
        // Work and presence are different things. A job somebody performs — a
        // 3BHK deep clean, a wedding shoot — genuinely runs six hours, and past
        // ten it is not one service any more. A job somebody *stays* for is
        // sold by the shift, and a hospital bystander's shift is twelve hours
        // or the whole day by definition: capping it at ten would force the
        // menu to lie about what is being bought.
        const cap = STAY_TRADES.has(c.id) ? 24 * 60 : 600;
        expect(d.minutes, `${c.label} → ${name}`).toBeLessThanOrEqual(cap);
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

describe("a per-service trade is not sold by the month", () => {
  // A mehendi artist offered at "3 Months · 90 days · ₹30,030" is the tenure
  // ladder applied to a job it does not describe. These trades are booked as
  // a sitting, and the service is both the duration and the price.
  const PER_SERVICE = [
    // Appointments — the service is the duration and the price.
    "nails", "mehendi", "hair", "makeup", "beauty", "massage",
    // Defined-scope jobs — an AC service is a known job at a known price, a
    // 2BHK clean is priced by the flat, a termite treatment by the treatment.
    "ac", "ro", "pest", "cctv", "clean", "movers", "photo",
  ] as const;

  it("marks every appointment trade as menu-priced", () => {
    for (const id of PER_SERVICE) expect(hasMenu(id)).toBe(true);
  });

  it("leaves genuine hire-by-the-month trades alone", () => {
    // A nurse, a maid and an elder carer really are engaged for weeks.
    for (const id of ["nurse", "maid", "eldercare", "cook", "tutor", "babysitter", "driver"] as const) {
      expect(hasMenu(id)).toBe(false);
    }
  });

  it("leaves the metered trades on the meter", () => {
    // Nobody can price a leak before looking at it. The per-minute meter is
    // the fairest answer to that and it is KAAM's own idea — a menu here would
    // throw away the differentiator and punish the fast, experienced worker,
    // who finishes in half the time and would earn half as much.
    for (const id of ["elec", "plumb", "mech", "carp", "painter"] as const) {
      expect(hasMenu(id), `${id} must stay metered`).toBe(false);
    }
  });

  it("gives every per-service item a price a customer can be charged", () => {
    for (const id of PER_SERVICE) {
      const cheapest = cheapestItem(id);
      expect(cheapest, id).toBeTruthy();
      expect(cheapest!.from, id).toBeGreaterThan(0);
    }
  });
});
