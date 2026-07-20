import { getCategory } from "@/data/categories";
import type { CategoryId } from "./types";
import { EVENT_ADVANCE_SHARE } from "./payment-policy";

/**
 * Customer-facing pricing model — the plain-language "how you pay" story
 * behind each category, so the dashboard tells the truth the checkout will
 * later enforce. Derived from the same category groups the payment-policy
 * engine keys on (see src/lib/payment-policy.ts), so the two never drift.
 */

export type BillingNature = "metered" | "event" | "prepay";

/** The billing nature of a one-off booking in this category. */
export function billingNature(categoryId: CategoryId): BillingNature {
  const group = getCategory(categoryId).group;
  if (group === "maintenance") return "metered";
  if (group === "art" || group === "hospitality") return "event";
  return "prepay";
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
    note: "Finish in 1h 08m? You pay 68 minutes — never a rounded-up second hour.",
  },
  event: {
    nature: "event",
    icon: "🎉",
    tag: `${Math.round(EVENT_ADVANCE_SHARE * 100)}% advance`,
    title: "Events & performances",
    payNow: `${Math.round(EVENT_ADVANCE_SHARE * 100)}% advance — blocks your date`,
    payAfter: "The remaining balance, collected after the event",
    note: "A fair advance holds the artist's date; you pay the rest once it's done.",
  },
  prepay: {
    nature: "prepay",
    icon: "🧾",
    tag: "Fixed price",
    title: "Fixed visits, care & plans",
    payNow: "One all-inclusive price, upfront",
    payAfter: "",
    note: "Known price, no surprises — nothing more to pay after the job.",
  },
};

/** Pricing model for a category. */
export function priceModelForCategory(categoryId: CategoryId): PriceModel {
  return PRICE_MODELS[billingNature(categoryId)];
}

/** The three models, ordered for display. */
export const PRICE_MODEL_LIST: PriceModel[] = [
  PRICE_MODELS.metered,
  PRICE_MODELS.prepay,
  PRICE_MODELS.event,
];
