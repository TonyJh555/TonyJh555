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
  tagMl: string;
  /** Card heading on the pricing page. */
  title: string;
  titleMl: string;
  /** What moves at booking. */
  payNow: string;
  payNowMl: string;
  /** What moves after the job (empty when nothing). */
  payAfter: string;
  payAfterMl: string;
  /** One-line reassurance. */
  note: string;
  noteMl: string;
}

export const PRICE_MODELS: Record<BillingNature, PriceModel> = {
  metered: {
    nature: "metered",
    icon: "🔧",
    tag: "Pay by the minute",
    tagMl: "മിനിറ്റ് കണക്കിന്",
    title: "Repairs & maintenance",
    titleMl: "അറ്റകുറ്റപ്പണികൾ",
    payNow: "Base hour now — covers the worker's time & travel",
    payNowMl: "ബേസ് അവർ ഇപ്പോൾ — സമയവും യാത്രയും ഉൾപ്പെടും",
    payAfter: "Only the extra minutes actually worked (per-minute rate)",
    payAfterMl: "ജോലി ചെയ്ത അധിക മിനിറ്റുകൾ മാത്രം (മിനിറ്റ് നിരക്കിൽ)",
    note: "Finish in 1h 08m? You pay 68 minutes — never a rounded-up second hour. The base hour is non-refundable once a worker accepts.",
    noteMl: "1 മണിക്കൂർ 08 മിനിറ്റിൽ തീർന്നോ? 68 മിനിറ്റിന് പണം — ഒരിക്കലും രണ്ടാം മണിക്കൂറല്ല. തൊഴിലാളി സ്വീകരിച്ചാൽ ബേസ് അവർ റീഫണ്ട് ചെയ്യില്ല.",
  },
  advance: {
    nature: "advance",
    icon: "🎉",
    tag: `${Math.round(ADVANCE_SHARE * 100)}% advance`,
    tagMl: `${Math.round(ADVANCE_SHARE * 100)}% അഡ്വാൻസ്`,
    title: "Visits, events & sessions",
    titleMl: "സന്ദർശനങ്ങൾ, ഇവന്റുകൾ, സെഷനുകൾ",
    payNow: `${Math.round(ADVANCE_SHARE * 100)}% advance — blocks your slot`,
    payNowMl: `${Math.round(ADVANCE_SHARE * 100)}% അഡ്വാൻസ് — നിങ്ങളുടെ സ്ലോട്ട് ഉറപ്പിക്കും`,
    payAfter: "The remaining balance, collected after the job",
    payAfterMl: "ബാക്കി തുക, ജോലിക്ക് ശേഷം",
    note: "A small advance holds your slot and covers the trip; you pay the rest once it's done.",
    noteMl: "ചെറിയ അഡ്വാൻസ് സ്ലോട്ട് ഉറപ്പിക്കും, യാത്ര മൂടും; ബാക്കി ജോലി കഴിഞ്ഞ് നൽകാം.",
  },
  prepay: {
    nature: "prepay",
    icon: "🧾",
    tag: "Prepaid",
    tagMl: "മുൻകൂർ",
    title: "Care, health & monthly plans",
    titleMl: "പരിചരണം, ആരോഗ്യം, മാസ പ്ലാനുകൾ",
    payNow: "One all-inclusive price, upfront",
    payNowMl: "എല്ലാം ഉൾപ്പെട്ട ഒറ്റ വില, മുൻകൂട്ടി",
    payAfter: "",
    payAfterMl: "",
    note: "A committed booking your worker plans around — known price, nothing more to pay after.",
    noteMl: "തൊഴിലാളി ആസൂത്രണം ചെയ്യുന്ന ഉറപ്പുള്ള ബുക്കിംഗ് — അറിയാവുന്ന വില, പിന്നീട് ഒന്നും നൽകേണ്ട.",
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
