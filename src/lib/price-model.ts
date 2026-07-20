import { getCategory } from "@/data/categories";
import type { CategoryId } from "./types";
import { ADVANCE_SHARE } from "./payment-policy";

/**
 * Customer-facing pricing model — the plain-language "how you pay" story
 * behind each category, so the dashboard tells the truth the checkout will
 * later enforce. Derived from the same category groups the payment-policy
 * engine keys on (see src/lib/payment-policy.ts), so the two never drift.
 */

export type BillingNature = "metered" | "advance" | "prepay";

/** The billing nature of a one-off booking in this category. */
export function billingNature(categoryId: CategoryId): BillingNature {
  const group = getCategory(categoryId).group;
  if (group === "maintenance") return "metered";
  if (group === "care") return "prepay";
  // Events, performances, fixed visits, sessions → advance then balance.
  return "advance";
}

export interface PriceModel {
  nature: BillingNature;
  icon: string;
  /** Short label for chips/tiles. */
  tag: string;
  /** Card heading on the pricing page. */
  title: string;
  /** What moves at booking. */
  payNow: string;
  /** What moves after the job (empty when nothing). */
  payAfter: string;
  /** One-line reassurance. */
  note: string;
}

export const PRICE_MODELS: Record<BillingNature, PriceModel> = {
  metered: {
    nature: "metered",
    icon: "🔧",
    tag: "Pay by the minute",
    title: "Repairs & maintenance",
    payNow: "Base hour now — covers the worker's time & travel",
    payAfter: "Only the extra minutes actually worked (per-minute rate)",
    note: "Finish in 1h 08m? You pay 68 minutes — never a rounded-up second hour. The base hour is non-refundable once a worker accepts.",
  },
  advance: {
    nature: "advance",
    icon: "🎉",
    tag: `${Math.round(ADVANCE_SHARE * 100)}% advance`,
    title: "Visits, events & sessions",
    payNow: `${Math.round(ADVANCE_SHARE * 100)}% advance — blocks your slot`,
    payAfter: "The remaining balance, collected after the job",
    note: "A small advance holds your slot and covers the trip; you pay the rest once it's done.",
  },
  prepay: {
    nature: "prepay",
    icon: "🧾",
    tag: "Prepaid",
    title: "Care, health & monthly plans",
    payNow: "One all-inclusive price, upfront",
    payAfter: "",
    note: "A committed booking your worker plans around — known price, nothing more to pay after.",
  },
};

/** Pricing model for a category. */
export function priceModelForCategory(categoryId: CategoryId): PriceModel {
  return PRICE_MODELS[billingNature(categoryId)];
}

/** The three models, ordered for display. */
export const PRICE_MODEL_LIST: PriceModel[] = [
  PRICE_MODELS.metered,
  PRICE_MODELS.advance,
  PRICE_MODELS.prepay,
];
