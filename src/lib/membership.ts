"use client";

import { useSyncExternalStore } from "react";
import type { Booking } from "./types";

/**
 * KAAM Plus — the platform-wide paid membership (the Swiggy One / Zomato
 * Gold / Urban Company Plus play, done better): one price, and every booking
 * is cheaper, fee-free, priority-matched, and free to cancel. A live savings
 * tracker proves the membership pays for itself.
 *
 * Pure helpers are unit-tested; membership state persists per customer.
 */

export const MEMBER_DISCOUNT_RATE = 0.1; // 10% off every booking

export interface PlusPlan {
  id: "monthly" | "yearly";
  label: string;
  price: number; // ₹ incl. tax
  months: number;
  /** Marketing sub-label. */
  note: string;
}

export const PLUS_PLANS: PlusPlan[] = [
  { id: "monthly", label: "Monthly", price: 99, months: 1, note: "₹99 / month" },
  { id: "yearly", label: "Yearly", price: 799, months: 12, note: "₹799 / year · save ₹389" },
];

export const PLUS_PERKS: { icon: string; title: string; sub: string }[] = [
  { icon: "🏷️", title: "10% off every booking", sub: "Auto-applied at checkout, stacks with coupons." },
  { icon: "🆓", title: "Zero visit & convenience fees", sub: "No booking fee, no platform fee ever." },
  { icon: "⚡", title: "Priority matching", sub: "Your requests reach the best nearby workers first." },
  { icon: "🔄", title: "Free cancellations", sub: "Change your mind before work starts, no charge." },
  { icon: "🎧", title: "Dedicated support", sub: "Skip the queue with priority customer care." },
  { icon: "🎁", title: "Member-only deals", sub: "Exclusive seasonal offers for KAAM Plus." },
];

export interface Membership {
  active: boolean;
  planId?: PlusPlan["id"];
  since?: string; // ISO
  renewsOn?: string; // ISO
}

const INACTIVE: Membership = { active: false };

export function getPlusPlan(id: PlusPlan["id"]): PlusPlan {
  return PLUS_PLANS.find((p) => p.id === id) ?? PLUS_PLANS[0];
}

/** The member discount on a payable amount (0 for non-members). */
export function memberDiscount(amount: number, member: boolean): number {
  return member ? Math.round(Math.max(0, amount) * MEMBER_DISCOUNT_RATE) : 0;
}

/** Is the membership currently active (and not lapsed)? */
export function isMember(m: Membership | undefined, now: Date = new Date()): boolean {
  if (!m?.active) return false;
  if (!m.renewsOn) return true;
  return new Date(m.renewsOn).getTime() > now.getTime();
}

/**
 * What a customer has saved with Plus: 10% of the service value across their
 * completed bookings. Proves whether the membership has paid for itself.
 */
export function memberSavings(bookings: Booking[], customerId?: string): number {
  return bookings
    .filter((b) => b.status === "completed" && (customerId ? b.customerId === customerId : !b.customerId))
    .reduce((s, b) => s + Math.round(b.quote.totalUserPays * MEMBER_DISCOUNT_RATE), 0);
}

/* ── Store (per customer) ──────────────────────────────────────────────────── */

const KEY = "kaam.membership.v1";
const listeners = new Set<() => void>();
let cache: Record<string, Membership> | null = null;
const EMPTY: Record<string, Membership> = {};

function read(): Record<string, Membership> {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, Membership>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

function write(map: Record<string, Membership>) {
  cache = map;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

const keyFor = (customerId?: string) => customerId ?? "guest";

export function useMembership(customerId?: string): Membership {
  const map = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => EMPTY,
  );
  return map[keyFor(customerId)] ?? INACTIVE;
}

export function joinPlus(customerId: string | undefined, planId: PlusPlan["id"], now: Date = new Date()) {
  const plan = getPlusPlan(planId);
  const renews = new Date(now);
  renews.setMonth(renews.getMonth() + plan.months);
  write({
    ...read(),
    [keyFor(customerId)]: {
      active: true,
      planId,
      since: now.toISOString(),
      renewsOn: renews.toISOString(),
    },
  });
}

export function cancelPlus(customerId?: string) {
  write({ ...read(), [keyFor(customerId)]: INACTIVE });
}
