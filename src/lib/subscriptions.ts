"use client";

import { useSyncExternalStore } from "react";
import type { Subscription, SubscriptionCharge } from "./types";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Subscription store — the recurring Care Plan ledger. Cloud-synced via
 * Supabase when configured (so a renewal charged by the Razorpay webhook shows
 * up on the customer's phone in real time), with a localStorage fallback so
 * the app keeps working offline / in demo mode.
 */

const STORAGE_KEY = "kaam.subscriptions.v1";
const listeners = new Set<() => void>();

let cache: Subscription[] | null = null;
let cloudInit = false;

/* ── Pure date maths (unit-tested) ───────────────────────────────── */

/** Add whole months to an ISO date, clamping to the end of shorter months. */
export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months, 1); // move month with day=1 to avoid overflow
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}

/** When the current term ends, given its start and length. */
export function nextRenewal(startIso: string, months: number): string {
  return addMonths(startIso, months);
}

/** Whole days from now until an ISO date (negative if past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

/* ── localStorage mirror ─────────────────────────────────────────── */
function readLocal(): Subscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Subscription[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(subs: Subscription[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  } catch {
    // storage unavailable — keep in-memory copy
  }
}

function read(): Subscription[] {
  if (typeof window === "undefined") return [];
  if (cache === null) cache = readLocal();
  return cache;
}

function setCache(next: Subscription[]) {
  cache = next;
  writeLocal(next);
  listeners.forEach((fn) => fn());
}

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toRow(s: Subscription): Row {
  return {
    id: s.id,
    customer_id: s.customerId ?? null,
    worker_id: s.workerId,
    worker_name: s.workerName,
    category_id: s.categoryId,
    service: s.service,
    plan_id: s.planId,
    months: s.months,
    monthly_amount: s.monthlyAmount,
    term_amount: s.termAmount,
    monthly_payout: s.monthlyPayout,
    term_payout: s.termPayout,
    online: s.online ?? false,
    visits: s.visits ?? null,
    sessions: s.sessions ?? [],
    start_date: s.startDate,
    renews_on: s.renewsOn,
    auto_renew: s.autoRenew,
    status: s.status,
    payment_ref: s.paymentRef,
    history: s.history,
    created_at: s.createdAt,
  };
}

function fromRow(r: Row): Subscription {
  return {
    id: r.id as string,
    customerId: (r.customer_id as string) ?? undefined,
    workerId: r.worker_id as string,
    workerName: r.worker_name as string,
    categoryId: r.category_id as Subscription["categoryId"],
    service: r.service as string,
    planId: r.plan_id as string,
    months: r.months as number,
    monthlyAmount: r.monthly_amount as number,
    termAmount: r.term_amount as number,
    monthlyPayout: (r.monthly_payout as number) ?? 0,
    termPayout: (r.term_payout as number) ?? 0,
    online: (r.online as boolean) ?? undefined,
    visits: (r.visits as Subscription["visits"]) ?? undefined,
    sessions: (r.sessions as Subscription["sessions"]) ?? [],
    startDate: r.start_date as string,
    renewsOn: r.renews_on as string,
    autoRenew: r.auto_renew as boolean,
    status: r.status as Subscription["status"],
    paymentRef: r.payment_ref as string,
    history: (r.history as SubscriptionCharge[]) ?? [],
    createdAt: r.created_at as string,
  };
}

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return;
    setCache(data.map(fromRow));
  } catch {
    // keep local cache on failure
  }
}

function ensureCloud() {
  if (cloudInit || typeof window === "undefined" || !isSupabaseConfigured()) return;
  cloudInit = true;
  const sb = getSupabase();
  if (!sb) return;
  refetchCloud();
  try {
    sb.channel("kaam-subscriptions")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // realtime unavailable — writes still refetch
  }
}

/* ── Public API ──────────────────────────────────────────────────── */
export function addSubscription(sub: Subscription) {
  setCache([sub, ...read()]);
  const sb = getSupabase();
  if (sb) {
    sb.from("subscriptions")
      .insert(toRow(sub))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud subscription insert failed, using local", error.message);
      });
  }
}

export function updateSubscription(id: string, patch: Partial<Subscription>) {
  setCache(read().map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const sb = getSupabase();
  if (sb) {
    const row: Row = {};
    if ("status" in patch) row.status = patch.status;
    if ("autoRenew" in patch) row.auto_renew = patch.autoRenew;
    if ("renewsOn" in patch) row.renews_on = patch.renewsOn;
    if ("startDate" in patch) row.start_date = patch.startDate;
    if ("history" in patch) row.history = patch.history;
    if (Object.keys(row).length) {
      sb.from("subscriptions")
        .update(row)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("KAAM: cloud subscription update failed, using local", error.message);
        });
    }
  }
}

export function removeSubscription(id: string) {
  setCache(read().filter((s) => s.id !== id));
  const sb = getSupabase();
  if (sb) {
    sb.from("subscriptions")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud subscription delete failed, using local", error.message);
      });
  }
}

/** Non-reactive snapshot of the current subscriptions (client-only). */
export function listSubscriptions(): Subscription[] {
  return read();
}

/** Turn auto-renew off (or back on) for a subscription. */
export function setAutoRenew(id: string, autoRenew: boolean) {
  updateSubscription(id, { autoRenew });
}

/** Cancel: stops future renewals; the current paid term still runs to its end. */
export function cancelSubscription(id: string) {
  updateSubscription(id, { status: "cancelled", autoRenew: false });
}

/**
 * Record a successful renewal — appends a charge and rolls the term forward.
 * Called after a Razorpay `subscription.charged` webhook (cloud) or a demo
 * renewal. Idempotent-friendly: pass the gateway ref so repeats are visible.
 */
export function renewSubscription(sub: Subscription, ref: string, when: string = new Date().toISOString()) {
  const charge: SubscriptionCharge = { date: when, amount: sub.termAmount, ref };
  updateSubscription(sub.id, {
    renewsOn: nextRenewal(sub.renewsOn, sub.months),
    history: [...sub.history, charge],
    status: "active",
  });
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: Subscription[] = [];

/** React hook: live list of subscriptions, newest first. */
export function useSubscriptions(): Subscription[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Filter to the subscriptions the given customer owns (or local unowned ones). */
export function subscriptionsFor(list: Subscription[], customerId?: string): Subscription[] {
  return list.filter((s) => (customerId ? s.customerId === customerId : !s.customerId));
}
