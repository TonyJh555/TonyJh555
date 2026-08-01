import type { Booking, Worker } from "./types";

/**
 * KAAM Pro — the worker recognition program (the Uber Pro / Urban Company
 * "Top Pro" playbook). Tiers are *earned*, never bought: they come from
 * completed jobs, genuine customer ratings (which KAAM makes mandatory), and
 * a clean completion record. Customers see the badge everywhere a worker
 * appears, so great work compounds into more work — that's the marketplace
 * flywheel.
 *
 * Pure and framework-free so it runs in server components, client stores,
 * and unit tests alike.
 */

export type ProTierId = "rising" | "gold" | "platinum" | "diamond";

export interface ProTier {
  id: ProTierId;
  name: string;
  emoji: string;
  /** Badge background colour. */
  color: string;
  /** Completed jobs needed. */
  minJobs: number;
  /** Average rating needed (0 = no gate). */
  minRating: number;
  /** Completion rate needed, 0..1. */
  minCompletion: number;
  perks: string[];
  /** Same perks in Malayalam, one-for-one with `perks`. */
  perksMl: string[];
}

/**
 * Ordered lowest → highest.
 *
 * The tier *names* stay in English on purpose — "Gold Pro" is a badge a
 * customer sees on a profile card, so it has to read the same to both sides of
 * the marketplace. Everything a worker has to understand in order to earn one
 * is translated.
 */
export const PRO_TIERS: ProTier[] = [
  {
    id: "rising",
    name: "Rising",
    emoji: "🌱",
    color: "#64748b",
    minJobs: 0,
    minRating: 0,
    minCompletion: 0,
    perks: ["Every rated job builds your record"],
    perksMl: ["ഓരോ ജോലിയും നിങ്ങളുടെ പേര് വളർത്തും"],
  },
  {
    id: "gold",
    name: "Gold Pro",
    emoji: "🥇",
    color: "#b47c00",
    minJobs: 100,
    minRating: 4.5,
    minCompletion: 0.85,
    perks: ["Gold badge customers can see", "Ranked above non-Pros nearby"],
    perksMl: ["ആളുകൾക്ക് കാണാവുന്ന ഗോൾഡ് ബാഡ്ജ്", "അടുത്തുള്ള മറ്റുള്ളവർക്ക് മുകളിൽ കാണിക്കും"],
  },
  {
    id: "platinum",
    name: "Platinum Pro",
    emoji: "🛡️",
    color: "#475569",
    minJobs: 300,
    minRating: 4.7,
    minCompletion: 0.9,
    perks: ["Platinum badge on your profile", "Higher search placement", "Priority support"],
    perksMl: [
      "പ്രൊഫൈലിൽ പ്ലാറ്റിനം ബാഡ്ജ്",
      "തിരയലിൽ കൂടുതൽ മുകളിൽ",
      "സഹായത്തിന് മുൻഗണന",
    ],
  },
  {
    id: "diamond",
    name: "Diamond Pro",
    emoji: "💎",
    color: "#0e7490",
    minJobs: 700,
    minRating: 4.85,
    minCompletion: 0.95,
    perks: ["Diamond badge — KAAM's highest honour", "Top search placement", "Priority support", "Featured to new customers"],
    perksMl: [
      "ഡയമണ്ട് ബാഡ്ജ് — KAAM-ന്റെ ഏറ്റവും വലിയ ബഹുമതി",
      "തിരയലിൽ ഏറ്റവും മുകളിൽ",
      "സഹായത്തിന് മുൻഗണന",
      "പുതിയ ആളുകൾക്ക് ആദ്യം കാണിക്കും",
    ],
  },
];

/** The tier's perks in the reader's language. */
export function tierPerks(tier: ProTier, ml: boolean): string[] {
  return ml ? tier.perksMl : tier.perks;
}

export interface ProStats {
  /** Lifetime completed jobs. */
  jobs: number;
  /** Average customer rating (0 when never rated). */
  rating: number;
  /** Completed / (completed + cancelled), 0..1. */
  completionRate: number;
}

function meets(stats: ProStats, tier: ProTier): boolean {
  return (
    stats.jobs >= tier.minJobs &&
    (tier.minRating === 0 || stats.rating >= tier.minRating) &&
    stats.completionRate >= tier.minCompletion
  );
}

/** The highest tier whose bar the worker clears. */
export function proTier(stats: ProStats): ProTier {
  for (let i = PRO_TIERS.length - 1; i >= 0; i--) {
    if (meets(stats, PRO_TIERS[i])) return PRO_TIERS[i];
  }
  return PRO_TIERS[0];
}

/** 0 (Rising) → 3 (Diamond) — used as a ranking boost in search. */
export function tierRank(id: ProTierId): number {
  return PRO_TIERS.findIndex((t) => t.id === id);
}

export interface ProRequirement {
  label: string;
  /** The same requirement in Malayalam. */
  labelMl: string;
  /** What the worker has, formatted for display. */
  have: string;
  /** `have` in Malayalam — differs only where it holds words, not numbers. */
  haveMl: string;
  met: boolean;
  /** Progress toward this requirement, 0..1. */
  progress: number;
}

export interface ProStatus {
  tier: ProTier;
  /** The next tier up, if any. */
  next?: ProTier;
  /** Requirement checklist toward `next` (empty at the top tier). */
  requirements: ProRequirement[];
  /** Overall progress toward `next`, 0..1 (1 at the top tier). */
  progress: number;
}

/** Tier + a requirement-by-requirement path to the next one. */
export function proStatus(stats: ProStats): ProStatus {
  const tier = proTier(stats);
  const next = PRO_TIERS[tierRank(tier.id) + 1];
  if (!next) return { tier, requirements: [], progress: 1 };

  const requirements: ProRequirement[] = [
    {
      label: `${next.minJobs} jobs completed`,
      labelMl: `${next.minJobs} ജോലി പൂർത്തിയാക്കണം`,
      have: `${stats.jobs}`,
      haveMl: `${stats.jobs}`,
      met: stats.jobs >= next.minJobs,
      progress: Math.min(1, stats.jobs / next.minJobs),
    },
    {
      label: `${next.minRating.toFixed(2).replace(/0$/, "")}★ average rating`,
      labelMl: `${next.minRating.toFixed(2).replace(/0$/, "")}★ ശരാശരി റേറ്റിംഗ്`,
      have: stats.rating ? `${stats.rating.toFixed(2)}★` : "not rated yet",
      haveMl: stats.rating ? `${stats.rating.toFixed(2)}★` : "ഇതുവരെ റേറ്റിംഗ് ഇല്ല",
      met: stats.rating >= next.minRating,
      progress: Math.min(1, stats.rating / next.minRating),
    },
    {
      label: `${Math.round(next.minCompletion * 100)}% completion rate`,
      labelMl: `${Math.round(next.minCompletion * 100)}% ജോലികൾ പൂർത്തിയാക്കണം`,
      have: `${Math.round(stats.completionRate * 100)}%`,
      haveMl: `${Math.round(stats.completionRate * 100)}%`,
      met: stats.completionRate >= next.minCompletion,
      progress: Math.min(1, stats.completionRate / next.minCompletion),
    },
  ];
  const progress = requirements.reduce((s, r) => s + r.progress, 0) / requirements.length;
  return { tier, next, requirements, progress };
}

/**
 * A worker's live Pro stats: verified pre-KAAM history (the seeded profile)
 * blended with everything that happened on KAAM — completed jobs, mandatory
 * ratings, and cancellations.
 */
export function workerProStats(worker: Worker, bookings: Booking[]): ProStats {
  const mine = bookings.filter((b) => b.workerId === worker.id);
  const completed = mine.filter((b) => b.status === "completed");
  const cancelled = mine.filter((b) => b.status === "cancelled");
  const rated = completed.filter((b) => typeof b.rating === "number");

  const jobs = worker.jobsDone + completed.length;

  // Weighted average: verified historic ratings + live mandatory ratings.
  const points = worker.rating * worker.reviewCount + rated.reduce((s, b) => s + (b.rating ?? 0), 0);
  const count = worker.reviewCount + rated.length;
  const rating = count ? points / count : 0;

  // Historic jobs are all completions (they passed verification); live
  // cancellations pull the rate down from there.
  const decided = worker.jobsDone + completed.length + cancelled.length;
  const completionRate = decided ? (worker.jobsDone + completed.length) / decided : 1;

  return { jobs, rating, completionRate };
}

/** Seed-only tier for surfaces without booking data (cards, search ranking). */
export function workerTier(worker: Worker): ProTier {
  return proTier({ jobs: worker.jobsDone, rating: worker.rating, completionRate: 1 });
}
