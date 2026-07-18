import type { Booking } from "./types";

/**
 * KAAM Rewards — a simple loyalty ladder that turns repeat bookings into
 * status and perks (the Swiggy One / Uber Rewards playbook). Tier is earned by
 * the number of completed bookings, so it rewards genuine usage.
 */

export interface Tier {
  id: "bronze" | "silver" | "gold" | "platinum";
  name: string;
  emoji: string;
  /** Completed bookings needed to reach this tier. */
  minJobs: number;
  /** KAAM Cash back on each booking at this tier. */
  cashbackPct: number;
  perks: string[];
  color: string;
}

export const TIERS: Tier[] = [
  { id: "bronze", name: "Bronze", emoji: "🥉", minJobs: 0, cashbackPct: 0, color: "#b45309", perks: ["Standard support"] },
  { id: "silver", name: "Silver", emoji: "🥈", minJobs: 3, cashbackPct: 2, color: "#64748b", perks: ["2% KAAM Cash back", "Faster support"] },
  { id: "gold", name: "Gold", emoji: "🥇", minJobs: 10, cashbackPct: 5, color: "#c99700", perks: ["5% KAAM Cash back", "Priority matching", "Free cancellations"] },
  { id: "platinum", name: "Platinum", emoji: "💎", minJobs: 25, cashbackPct: 8, color: "#0f6e4f", perks: ["8% KAAM Cash back", "Top-priority matching", "Dedicated support", "Exclusive offers"] },
];

export interface TierStatus {
  tier: Tier;
  jobs: number;
  /** The next tier up, if any. */
  next?: Tier;
  /** Completed jobs still needed to reach `next`. */
  toNext: number;
  /** Progress within the current → next band, 0..1 (1 at top tier). */
  progress: number;
}

/** A customer's loyalty status from their completed bookings. */
export function customerTier(bookings: Booking[], customerId?: string): TierStatus {
  const jobs = customerId
    ? bookings.filter((b) => b.customerId === customerId && b.status === "completed").length
    : 0;
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (jobs >= TIERS[i].minJobs) {
      idx = i;
      break;
    }
  }
  const tier = TIERS[idx];
  const next = TIERS[idx + 1];
  if (!next) return { tier, jobs, toNext: 0, progress: 1 };
  const band = next.minJobs - tier.minJobs;
  return {
    tier,
    jobs,
    next,
    toNext: Math.max(0, next.minJobs - jobs),
    progress: band > 0 ? Math.min(1, (jobs - tier.minJobs) / band) : 1,
  };
}
