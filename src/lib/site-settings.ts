"use client";

import { getContent, useContent } from "./content";

/**
 * The numbers an owner changes without a developer — and the rails that stop
 * a slip of the thumb from costing real money.
 *
 * Referral bonuses and the KAAM Plus price are commercial decisions, not law:
 * they get tuned on a Tuesday because a competitor moved or a campaign is
 * running, and waiting for a deploy each time is how a marketplace loses a
 * week. So they live in the content store like the banners do.
 *
 * What makes that safe is the sanitising below rather than the form above it.
 * Every read passes through it, so a fat-fingered ₹10,000 referral — or a row
 * edited straight in the database, or a half-written import — cannot reach the
 * wallet: it is clamped to a defensible ceiling, and anything that isn't a
 * number falls back to the built-in default. The screen showing an offer and
 * the code paying it out therefore always agree.
 *
 * Deliberately NOT here: GST, TDS, the platform fee, the fair-billing meter.
 * Those are law and arithmetic — they change in code, with a test and a
 * review, and an owner should never be one typo away from mispaying tax.
 */

export interface Limit {
  min: number;
  max: number;
  fallback: number;
  /** What it is, for the editor. */
  label: string;
  /** Why the ceiling is where it is. */
  note: string;
}

/** Money given away to grow. Ceilings are "generous but survivable". */
export const REWARD_LIMITS = {
  joinBonus: {
    min: 0,
    max: 500,
    fallback: 100,
    label: "Welcome bonus",
    note: "KAAM Cash for a new customer's first sign-up.",
  },
  customerReferral: {
    min: 0,
    max: 500,
    fallback: 100,
    label: "Customer referral",
    note: "Paid to BOTH sides when a code is redeemed — a change here costs twice.",
  },
  workerReferral: {
    min: 0,
    max: 2000,
    fallback: 500,
    label: "Worker referral",
    note: "Paid once the referred worker finishes their qualifying jobs.",
  },
} as const satisfies Record<string, Limit>;

/** Membership price. Free would make every booking 10% cheaper forever. */
export const PLUS_LIMITS = {
  monthly: { min: 19, max: 999, fallback: 99, label: "KAAM Plus · monthly", note: "₹ including tax." },
  yearly: { min: 99, max: 9999, fallback: 799, label: "KAAM Plus · yearly", note: "₹ including tax." },
} as const satisfies Record<string, Limit>;

/**
 * The most a metered job may bill in one day.
 *
 * An hourly meter with no ceiling is an open argument: a fan repair once ran
 * to 11h 27m because nobody closed it, and the customer had no way to know
 * what the bill would reach. A cap does not settle who was right about the
 * hours — it makes the disagreement small and knowable before the job starts.
 *
 * The floor is 4h because a shorter cap would cut into ordinary half-day work.
 * The ceiling is 12h because past that it stops being a day's work, and an
 * uncapped meter is the thing this exists to prevent.
 */
export const CAP_LIMITS = {
  dailyHours: {
    min: 4,
    max: 12,
    fallback: 8,
    label: "Daily billing cap (hours)",
    note: "Hourly repair jobs stop charging after this many hours in a day. Work may continue; the bill does not.",
  },
  warrantyDays: {
    min: 0,
    max: 30,
    fallback: 7,
    label: "Free revisit window (days)",
    note: "If the same fault comes back within this many days, the revisit is free to the customer — KAAM pays the worker. 0 turns the promise off.",
  },
} as const satisfies Record<string, Limit>;

export type RewardKey = keyof typeof REWARD_LIMITS;
export type PlusKey = keyof typeof PLUS_LIMITS;
export type CapKey = keyof typeof CAP_LIMITS;

export type Rewards = Record<RewardKey, number>;
export type PlusPrices = Record<PlusKey, number>;
export type Caps = Record<CapKey, number>;

export const REWARDS_KEY = "settings.rewards";
export const PLUS_KEY = "settings.plus";
export const CAPS_KEY = "settings.caps";

/**
 * One value, made safe. Anything that isn't a finite number becomes the
 * default; anything outside the range is pulled back to the nearest edge.
 * Never throws — a settings read happens on a customer's screen, and a
 * malformed row must degrade to the default, not to a blank page.
 */
export function sanitiseNumber(raw: unknown, limit: Limit): number {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n)) return limit.fallback;
  return Math.min(limit.max, Math.max(limit.min, Math.round(n)));
}

function sanitiseAll<K extends string>(
  raw: unknown,
  limits: Record<K, Limit>,
): Record<K, number> {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as Record<K, number>;
  for (const key of Object.keys(limits) as K[]) {
    out[key] = sanitiseNumber(source[key], limits[key]);
  }
  return out;
}

export function sanitiseRewards(raw: unknown): Rewards {
  return sanitiseAll(raw, REWARD_LIMITS);
}

export function sanitisePlusPrices(raw: unknown): PlusPrices {
  return sanitiseAll(raw, PLUS_LIMITS);
}

export function sanitiseCaps(raw: unknown): Caps {
  return sanitiseAll(raw, CAP_LIMITS);
}

/** The defaults, as shipped — what an untouched install pays out. */
export const DEFAULT_REWARDS: Rewards = sanitiseRewards({});
export const DEFAULT_PLUS: PlusPrices = sanitisePlusPrices({});
export const DEFAULT_CAPS: Caps = sanitiseCaps({});

/* ── Reads ───────────────────────────────────────────────────────── */

export function useRewards(): Rewards {
  return sanitiseRewards(useContent<unknown>(REWARDS_KEY, DEFAULT_REWARDS));
}

export function usePlusPrices(): PlusPrices {
  return sanitisePlusPrices(useContent<unknown>(PLUS_KEY, DEFAULT_PLUS));
}

export function useCaps(): Caps {
  return sanitiseCaps(useContent<unknown>(CAPS_KEY, DEFAULT_CAPS));
}

/** The daily cap in minutes — what the meter actually compares against. */
export function useDailyCapMinutes(): number {
  return useCaps().dailyHours * 60;
}

/** How long a finished repair stays covered. */
export function useWarrantyDays(): number {
  return useCaps().warrantyDays;
}

/** For the non-React call sites that actually move the money. */
export function rewards(): Rewards {
  return sanitiseRewards(getContent<unknown>(REWARDS_KEY, DEFAULT_REWARDS));
}

export function plusPrices(): PlusPrices {
  return sanitisePlusPrices(getContent<unknown>(PLUS_KEY, DEFAULT_PLUS));
}

/** For the meter, which runs outside React. */
export function dailyCapMinutes(): number {
  return sanitiseCaps(getContent<unknown>(CAPS_KEY, DEFAULT_CAPS)).dailyHours * 60;
}

/** True where the owner has moved a value off its shipped default. */
export function changedFromDefault(
  values: Record<string, number>,
  limits: Record<string, Limit>,
): string[] {
  return Object.keys(limits).filter((k) => values[k] !== limits[k].fallback);
}
