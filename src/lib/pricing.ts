import type { Quote, Tenure, TenureId, IndianState, StateId, PriceUnit } from "./types";

/**
 * KAAM pricing & tax engine.
 *
 * Business rules (see docs/BUILD_GUIDE notes):
 * - Service amount = worker rate × tenure multiplier (× surge 1.2 when active)
 * - GST @18% is collected from the user on top and remitted as TCS.
 * - State gig-worker welfare cess is collected from the user where levied.
 * - KAAM retains a 15% platform fee from the service amount.
 * - TDS @1% (Section 194-O) is deducted from the worker payout.
 */

export const GST_RATE = 0.18;
export const PLATFORM_FEE_RATE = 0.15;
export const TDS_RATE = 0.01;
export const SURGE_MULTIPLIER = 1.2;

export const TENURES: Tenure[] = [
  { id: "hr", label: "Hourly", duration: "1 hr", multiplier: 1 },
  { id: "hd", label: "Half Day", duration: "4 hrs", multiplier: 3.5 },
  { id: "day", label: "Daily", duration: "8 hrs", multiplier: 7 },
  { id: "wk", label: "Weekly", duration: "7 days", multiplier: 42 },
  { id: "mo", label: "Monthly", duration: "30 days", multiplier: 168 },
  { id: "3mo", label: "3 Months", duration: "90 days", multiplier: 480 },
];

/**
 * How many of a worker's rate-units each tenure covers, BY how they price.
 *
 * A worker's `rate` is per `unit` (hour / day / session / visit), so a flat
 * multiplier would be wrong: ₹1,500/day × 168 would price a monthly nurse at
 * ₹2.5 lakh. These per-unit quantities keep every tenure realistic — a monthly
 * plan on a per-day nurse is ~26 working days, a monthly music plan is ~12
 * sessions. `hr` keeps the original hour-based numbers.
 */
export const TENURE_UNITS: Record<PriceUnit, Record<TenureId, number>> = {
  hr: { hr: 1, hd: 3.5, day: 7, wk: 42, mo: 168, "3mo": 480 },
  day: { hr: 0.2, hd: 0.5, day: 1, wk: 6, mo: 26, "3mo": 72 },
  session: { hr: 1, hd: 1.5, day: 2, wk: 6, mo: 12, "3mo": 33 },
  visit: { hr: 0.5, hd: 1, day: 2, wk: 8, mo: 12, "3mo": 33 },
};

/** Quantity of the worker's rate-unit for a tenure, given how they price. */
export function tenureMultiplier(unit: PriceUnit, tenureId: TenureId): number {
  return TENURE_UNITS[unit][tenureId];
}

/**
 * Kerala-only launch. Kerala's gig-worker welfare fund levy is not yet in
 * force, so cess is 0 — the engine stays wired for when it (or expansion
 * to other states) arrives.
 */
export const STATES: IndianState[] = [
  { id: "KL", name: "Kerala", cessPercent: 0 },
];

export function getTenure(id: TenureId): Tenure {
  const tenure = TENURES.find((t) => t.id === id);
  if (!tenure) throw new Error(`Unknown tenure: ${id}`);
  return tenure;
}

export function getState(id: StateId): IndianState {
  const state = STATES.find((s) => s.id === id);
  if (!state) throw new Error(`Unknown state: ${id}`);
  return state;
}

export interface QuoteInput {
  /** Worker's rate in ₹ per `unit`. */
  rate: number;
  tenureId: TenureId;
  stateId: StateId;
  /** How the worker prices (hour / day / session / visit). Defaults to "hr". */
  unit?: PriceUnit;
  surge?: boolean;
  /**
   * Number of tenure periods booked at once — used by subscription plans
   * (e.g. a 3-month care package books `tenureId: "mo"` with `months: 3`).
   * Defaults to 1.
   */
  months?: number;
  /**
   * Commitment discount as a fraction (0..1) applied to the service amount —
   * the reward for booking a longer package. Defaults to 0.
   */
  discount?: number;
}

/** Compute the full user-price and worker-payout breakdown for a booking. */
export function computeQuote({
  rate,
  tenureId,
  stateId,
  unit = "hr",
  surge = false,
  months = 1,
  discount = 0,
}: QuoteInput): Quote {
  if (rate <= 0) throw new Error("Rate must be positive");
  if (months <= 0) throw new Error("Months must be positive");
  if (discount < 0 || discount >= 1) throw new Error("Discount must be in [0, 1)");
  getTenure(tenureId); // validate the tenure id
  const state = getState(stateId);

  const serviceAmount = Math.round(
    rate * tenureMultiplier(unit, tenureId) * months * (1 - discount) * (surge ? SURGE_MULTIPLIER : 1),
  );
  const gst = Math.round(serviceAmount * GST_RATE);
  const cess = Math.round((serviceAmount * state.cessPercent) / 100);
  const platformFee = Math.round(serviceAmount * PLATFORM_FEE_RATE);
  const tds = Math.round(serviceAmount * TDS_RATE);

  return {
    serviceAmount,
    surgeApplied: surge,
    gst,
    cess,
    totalUserPays: serviceAmount + gst + cess,
    platformFee,
    tds,
    workerPayout: serviceAmount - platformFee - tds,
  };
}
