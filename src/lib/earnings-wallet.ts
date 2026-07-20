"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import type { Booking } from "./types";

/**
 * Worker earnings wallet — the real thing behind the old stubbed "instant
 * payout" button. Completed-job payouts build a withdrawable balance; the
 * worker cashes out to UPI, instantly for a small fee or free on the weekly
 * settlement. Every withdrawal is a ledger entry, so the balance is always
 * lifetime-earned minus what's been taken out.
 *
 * Pure helpers are unit-tested; the store persists withdrawals locally
 * (like presence and goals — no schema change).
 */

export type WithdrawalKind = "instant" | "weekly";

export interface Withdrawal {
  id: string;
  workerId: string;
  /** Gross amount taken from the balance. */
  amount: number;
  /** Instant-payout fee (0 for weekly). */
  fee: number;
  /** amount − fee, what actually lands in the bank. */
  net: number;
  kind: WithdrawalKind;
  /** Destination UPI id. */
  upi: string;
  at: string; // ISO
  /** instant → paid now; weekly → scheduled for the next settlement. */
  status: "paid" | "scheduled";
}

export const INSTANT_FEE_RATE = 0.01;
export const INSTANT_FEE_MIN = 5;
export const INSTANT_FEE_MAX = 50;

/** Instant-payout fee: 1% of the amount, clamped to ₹5–₹50. */
export function instantFee(amount: number): number {
  if (amount <= 0) return 0;
  return Math.min(INSTANT_FEE_MAX, Math.max(INSTANT_FEE_MIN, Math.round(amount * INSTANT_FEE_RATE)));
}

/** Next Friday (weekly settlement day), at midnight. */
export function nextSettlement(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysToFri = (5 - d.getDay() + 7) % 7 || 7; // always the upcoming Friday
  d.setDate(d.getDate() + daysToFri);
  return d;
}

/** A worker's lifetime take-home from completed jobs. */
export function lifetimeEarned(bookings: Booking[], workerId: string): number {
  return bookings
    .filter((b) => b.workerId === workerId && b.status === "completed")
    .reduce((s, b) => s + b.quote.workerPayout, 0);
}

export function withdrawalsFor(list: Withdrawal[], workerId: string): Withdrawal[] {
  return list
    .filter((w) => w.workerId === workerId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function totalWithdrawn(list: Withdrawal[], workerId: string): number {
  return list.filter((w) => w.workerId === workerId).reduce((s, w) => s + w.amount, 0);
}

/** Withdrawable balance = lifetime earned − everything already withdrawn. */
export function availableBalance(bookings: Booking[], workerId: string, list: Withdrawal[]): number {
  return Math.max(0, Math.round(lifetimeEarned(bookings, workerId) - totalWithdrawn(list, workerId)));
}

/* ── Store ───────────────────────────────────────────────────────────────── */

const KEY = "kaam.withdrawals.v1";
const listeners = new Set<() => void>();
let cache: Withdrawal[] | null = null;
const EMPTY: Withdrawal[] = [];

function read(): Withdrawal[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Withdrawal[];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(list: Withdrawal[]) {
  cache = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function useWithdrawals(): Withdrawal[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => EMPTY,
  );
}

/**
 * Record a withdrawal against the balance. Returns the entry, or null if the
 * amount is invalid or exceeds the available balance.
 */
export function recordWithdrawal(
  bookings: Booking[],
  workerId: string,
  amount: number,
  kind: WithdrawalKind,
  upi: string,
  now: Date = new Date(),
): Withdrawal | null {
  const available = availableBalance(bookings, workerId, read());
  const amt = Math.round(amount);
  if (amt <= 0 || amt > available || !upi.trim()) return null;
  const fee = kind === "instant" ? instantFee(amt) : 0;
  const entry: Withdrawal = {
    id: shortId(),
    workerId,
    amount: amt,
    fee,
    net: amt - fee,
    kind,
    upi: upi.trim(),
    at: now.toISOString(),
    status: kind === "instant" ? "paid" : "scheduled",
  };
  write([entry, ...read()]);
  return entry;
}
