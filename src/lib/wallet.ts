"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";

/**
 * KAAM Cash wallet + referral program + tips.
 *
 * - Wallet holds KAAM Cash (₹) usable at checkout — like Swiggy Money.
 * - Referral: every customer gets a code; sharing it credits both sides
 *   ("Give ₹100, Get ₹100") — India's cheapest growth channel.
 * - Tips are added to a worker's payout after a job, at no cost to KAAM.
 *
 * Demo storage is localStorage; production keys these to the customer row.
 */

export interface WalletTxn {
  id: string;
  amount: number; // + credit, − debit
  reason: string;
  createdAt: string;
}

interface WalletState {
  balance: number;
  referralCode: string;
  txns: WalletTxn[];
  /** True once a joining bonus has been granted, so it happens once. */
  joined: boolean;
}

const STORAGE_KEY = "kaam.wallet.v1";
const listeners = new Set<() => void>();
let cache: WalletState | null = null;

export const JOIN_BONUS = 100;

function makeCode(): string {
  return `KAAM${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function read(): WalletState {
  if (typeof window === "undefined") {
    return { balance: 0, referralCode: "KAAM0000", txns: [], joined: false };
  }
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw
      ? (JSON.parse(raw) as WalletState)
      : { balance: 0, referralCode: makeCode(), txns: [], joined: false };
  } catch {
    cache = { balance: 0, referralCode: makeCode(), txns: [], joined: false };
  }
  return cache;
}

function write(state: WalletState) {
  cache = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function credit(amount: number, reason: string) {
  const state = read();
  write({
    ...state,
    balance: state.balance + amount,
    txns: [{ id: shortId(), amount, reason, createdAt: new Date().toISOString() }, ...state.txns],
  });
}

/** Grant the one-time joining bonus (called after signup). */
export function grantJoinBonus() {
  const state = read();
  if (state.joined) return;
  write({ ...state, joined: true });
  credit(JOIN_BONUS, "Welcome bonus 🎉");
}

/** Redeem a friend's referral code for a bonus (once per code text). */
export function redeemReferral(code: string): { ok: boolean; message: string } {
  const trimmed = code.trim().toUpperCase();
  const state = read();
  if (!/^KAAM[A-Z0-9]{4}$/.test(trimmed)) return { ok: false, message: "Invalid code format." };
  if (trimmed === state.referralCode) return { ok: false, message: "You can't use your own code." };
  if (state.txns.some((t) => t.reason.includes(trimmed)))
    return { ok: false, message: "This code is already used." };
  credit(100, `Referral bonus (${trimmed})`);
  return { ok: true, message: "₹100 KAAM Cash added! 🎉" };
}

/** Spend wallet balance (returns the amount actually applied). */
export function spend(amount: number, reason: string): number {
  const state = read();
  const applied = Math.min(amount, state.balance);
  if (applied <= 0) return 0;
  write({
    ...state,
    balance: state.balance - applied,
    txns: [
      { id: shortId(), amount: -applied, reason, createdAt: new Date().toISOString() },
      ...state.txns,
    ],
  });
  return applied;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const SERVER: WalletState = { balance: 0, referralCode: "KAAM0000", txns: [], joined: false };

export function useWallet(): WalletState {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}
