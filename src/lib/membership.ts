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
  labelMl: string;
  price: number; // ₹ incl. tax
  months: number;
  /** Marketing sub-label. */
  note: string;
  noteMl: string;
}

export const PLUS_PLANS: PlusPlan[] = [
  { id: "monthly", label: "Monthly", labelMl: "മാസം തോറും", price: 99, months: 1, note: "₹99 / month", noteMl: "₹99 / മാസം" },
  { id: "yearly", label: "Yearly", labelMl: "വർഷം തോറും", price: 799, months: 12, note: "₹799 / year · save ₹389", noteMl: "₹799 / വർഷം · ₹389 ലാഭം" },
];

export const PLUS_PERKS: { icon: string; title: string; titleMl: string; sub: string; subMl: string }[] = [
  { icon: "🏷️", title: "10% off every booking", titleMl: "എല്ലാ ബുക്കിംഗിനും 10% കിഴിവ്", sub: "Auto-applied at checkout, stacks with coupons.", subMl: "ചെക്ക്ഔട്ടിൽ സ്വയമേവ · കൂപ്പണുകളുമായി ചേരും." },
  { icon: "🆓", title: "Zero visit & convenience fees", titleMl: "സന്ദർശന / സൗകര്യ ഫീസ് ഇല്ല", sub: "No booking fee, no platform fee ever.", subMl: "ബുക്കിംഗ് ഫീസോ പ്ലാറ്റ്ഫോം ഫീസോ ഒരിക്കലും ഇല്ല." },
  { icon: "⚡", title: "Priority matching", titleMl: "മുൻഗണനാ മാച്ചിംഗ്", sub: "Your requests reach the best nearby workers first.", subMl: "നിങ്ങളുടെ അഭ്യർത്ഥന മികച്ച തൊഴിലാളികളിൽ ആദ്യം എത്തും." },
  { icon: "🔄", title: "Free cancellations", titleMl: "സൗജന്യ റദ്ദാക്കൽ", sub: "Change your mind before work starts, no charge.", subMl: "ജോലി തുടങ്ങുന്നതിന് മുൻപ് റദ്ദാക്കാം, ചാർജില്ല." },
  { icon: "🎧", title: "Dedicated support", titleMl: "പ്രത്യേക പിന്തുണ", sub: "Skip the queue with priority customer care.", subMl: "മുൻഗണനാ കസ്റ്റമർ കെയർ — ക്യൂ ഒഴിവാക്കൂ." },
  { icon: "🎁", title: "Member-only deals", titleMl: "അംഗങ്ങൾക്ക് മാത്രം ഓഫറുകൾ", sub: "Exclusive seasonal offers for KAAM Plus.", subMl: "കാം പ്ലസ് അംഗങ്ങൾക്കായി പ്രത്യേക സീസണൽ ഓഫറുകൾ." },
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
