import type { CategoryId, PriceUnit, Quote, StateId } from "./types";
import { computeQuote } from "./pricing";

/**
 * KAAM Care Plans & Learning modes — the retention engine.
 *
 * Most care needs (a nurse for amma, a maid, a cook, an elder companion) and
 * most teaching (music, tuition, yoga) run for months, not one visit. Paying
 * per-day is expensive and stressful. Care Plans let a family commit for
 * 1 / 3 / 6 months and pay a lower effective rate — better for the customer,
 * predictable income for the worker, and sticky recurring revenue for KAAM.
 *
 * A plan books the monthly tenure ("mo") N times over with a commitment
 * discount; the pricing engine handles the maths.
 */

export type PlanId = "m1" | "m3" | "m6";

export interface CarePlan {
  id: PlanId;
  months: number;
  /** Full label, e.g. "3 Months". */
  label: string;
  /** Short tag, e.g. "Quarter". */
  short: string;
  /** Fraction off the month-by-month price. */
  discount: number;
  /** Marketing badge shown on the card. */
  badge: string;
  /** The one card we visually push as the sweet spot. */
  highlight?: boolean;
}

export const CARE_PLANS: CarePlan[] = [
  { id: "m1", months: 1, label: "1 Month", short: "Monthly", discount: 0.1, badge: "Save 10%" },
  {
    id: "m3",
    months: 3,
    label: "3 Months",
    short: "Quarterly",
    discount: 0.15,
    badge: "Most popular",
    highlight: true,
  },
  { id: "m6", months: 6, label: "6 Months", short: "Half-year", discount: 0.2, badge: "Best value" },
];

export function getCarePlan(id: PlanId): CarePlan {
  const plan = CARE_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

/**
 * Long-running care roles where a monthly package genuinely helps families —
 * these are the bookings that last weeks and months.
 */
export const PLAN_ELIGIBLE: ReadonlySet<CategoryId> = new Set<CategoryId>([
  "nurse",
  "eldercare",
  "maid",
  "babysitter",
  "cook",
  "physio",
]);

/**
 * Categories that can be *taught* (lessons over time) as well as — for the
 * artists — *performed*. Teaching can run online or in person.
 */
export const TEACHABLE: ReadonlySet<CategoryId> = new Set<CategoryId>([
  "tutor",
  "yoga",
  "violin",
  "piano",
  "guitar",
  "singer",
  "dance",
]);

/** Artists in this set can either perform at an event or teach lessons. */
export const PERFORMER: ReadonlySet<CategoryId> = new Set<CategoryId>([
  "violin",
  "piano",
  "guitar",
  "singer",
  "dance",
]);

export function isPlanEligible(categoryId: CategoryId): boolean {
  return PLAN_ELIGIBLE.has(categoryId);
}

export function isTeachable(categoryId: CategoryId): boolean {
  return TEACHABLE.has(categoryId);
}

export function isPerformer(categoryId: CategoryId): boolean {
  return PERFORMER.has(categoryId);
}

/**
 * Online lessons skip travel and setup, so they cost the family less — a real
 * saving we pass on, and a way to reach students anywhere in Kerala (and NRI
 * kids abroad learning from a Kerala teacher).
 */
export const ONLINE_DISCOUNT = 0.15;

export type LearnFormat = "offline" | "online";

/** The effective hourly rate after any online-lesson saving. */
export function effectiveRate(rate: number, online: boolean): number {
  return online ? rate * (1 - ONLINE_DISCOUNT) : rate;
}

export interface PlanQuoteInput {
  rate: number;
  /** How the worker prices — drives how many units a month covers. */
  unit: PriceUnit;
  stateId: StateId;
  surge?: boolean;
  plan: CarePlan;
  /** Online teaching applies the online saving on top of the plan discount. */
  online?: boolean;
}

/** Full price breakdown for a subscription package. */
export function planQuote({ rate, unit, stateId, surge, plan, online = false }: PlanQuoteInput): Quote {
  return computeQuote({
    rate: effectiveRate(rate, online),
    tenureId: "mo",
    unit,
    stateId,
    surge,
    months: plan.months,
    discount: plan.discount,
  });
}

/** What one month of the plan costs the user (for the "₹X/month" line). */
export function perMonth(quote: Quote, plan: CarePlan): number {
  return Math.round(quote.totalUserPays / plan.months);
}

/**
 * How much the family saves versus booking month-by-month at the normal rate,
 * for the whole plan term. Used for the "You save ₹X" badge.
 */
export function planSavings({ rate, unit, stateId, surge, plan, online = false }: PlanQuoteInput): number {
  const oneMonth = computeQuote({
    rate: effectiveRate(rate, online),
    tenureId: "mo",
    unit,
    stateId,
    surge,
  });
  const discounted = planQuote({ rate, unit, stateId, surge, plan, online });
  return oneMonth.totalUserPays * plan.months - discounted.totalUserPays;
}
