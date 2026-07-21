import { findCoupon } from "./coupons";

/**
 * Seasonal / festival offers — the date-driven promo strip every Indian app
 * runs at Onam, Diwali, Vishu and New Year. Pure: given a date it returns the
 * live festive offer (tied to a real coupon code) or null off-season, so the
 * home banner only appears when there's genuinely something on.
 */

export interface SeasonalOffer {
  name: string;
  emoji: string;
  /** Real coupon code from src/lib/coupons.ts. */
  code: string;
  note: string;
  /** CSS gradient for the banner. */
  gradient: string;
}

interface Season {
  months: number[]; // 0-indexed
  name: string;
  emoji: string;
  code: string;
  gradient: string;
}

const SEASONS: Season[] = [
  { months: [2, 3], name: "Vishu", emoji: "🌼", code: "VISHU25", gradient: "linear-gradient(135deg,#c99700,#8a6d00)" },
  { months: [5, 6], name: "Monsoon home-care", emoji: "🌧️", code: "MONSOON15", gradient: "linear-gradient(135deg,#0369a1,#075985)" },
  { months: [7, 8], name: "Onam", emoji: "🌸", code: "ONAM25", gradient: "linear-gradient(135deg,#0f6e4f,#0a4d37)" },
  { months: [9, 10], name: "Diwali", emoji: "🪔", code: "DIWALI20", gradient: "linear-gradient(135deg,#b45309,#7c2d12)" },
  { months: [11, 0], name: "New Year", emoji: "🎉", code: "NEWYEAR15", gradient: "linear-gradient(135deg,#7c3aed,#4c1d95)" },
];

/** The current festive offer, or null off-season. */
export function seasonalOffer(now: Date = new Date()): SeasonalOffer | null {
  const m = now.getMonth();
  const season = SEASONS.find((s) => s.months.includes(m));
  if (!season) return null;
  const coupon = findCoupon(season.code);
  if (!coupon) return null;
  return {
    name: season.name,
    emoji: season.emoji,
    code: season.code,
    note: coupon.note,
    gradient: season.gradient,
  };
}
