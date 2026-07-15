"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import { getSupabase } from "./supabase";

/**
 * Customer authentication (demo).
 *
 * Signup/login by mobile number or email with an OTP step — the same
 * flow Swiggy/Zomato/Uber use. In production the OTP is sent via MSG91
 * (SMS) or email and verified server-side; here we simulate it: the code
 * is shown on screen and any 4-digit entry that matches is accepted. The
 * session is stored in localStorage.
 */

export type Identifier = { type: "phone"; value: string } | { type: "email"; value: string };

export interface CustomerAccount {
  id: string;
  name: string;
  identifier: Identifier;
  createdAt: string;
}

const STORAGE_KEY = "kaam.customer.v1";
const ACCOUNTS_KEY = "kaam.customers.v1";
const listeners = new Set<() => void>();

let sessionCache: CustomerAccount | null | undefined;

function readSession(): CustomerAccount | null {
  if (typeof window === "undefined") return null;
  if (sessionCache !== undefined) return sessionCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    sessionCache = raw ? (JSON.parse(raw) as CustomerAccount) : null;
  } catch {
    sessionCache = null;
  }
  return sessionCache;
}

function writeSession(account: CustomerAccount | null) {
  sessionCache = account;
  try {
    if (account) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
  listeners.forEach((fn) => fn());
}

function readAccounts(): CustomerAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as CustomerAccount[]) : [];
  } catch {
    return [];
  }
}

function saveAccount(account: CustomerAccount) {
  const accounts = readAccounts().filter((a) => a.id !== account.id);
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([account, ...accounts]));
  } catch {
    // ignore
  }
}

function sameIdentifier(a: Identifier, b: Identifier) {
  return a.type === b.type && a.value.toLowerCase() === b.value.toLowerCase();
}

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function rowToAccount(r: Row): CustomerAccount {
  return {
    id: r.id as string,
    name: r.name as string,
    identifier: {
      type: r.identifier_type as "phone" | "email",
      value: r.identifier_value as string,
    },
    createdAt: r.created_at as string,
  };
}

/** Find an existing account locally (synchronous). */
export function findAccount(identifier: Identifier): CustomerAccount | undefined {
  return readAccounts().find((a) => sameIdentifier(a.identifier, identifier));
}

/**
 * Find an existing account, checking the cloud first so a user who signed up
 * on another device is recognised here. Falls back to the local list.
 */
export async function findAccountRemote(identifier: Identifier): Promise<CustomerAccount | undefined> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("customers")
        .select("*")
        .eq("identifier_type", identifier.type);
      if (!error && data) {
        const hit = data.find(
          (r) => (r.identifier_value as string).toLowerCase() === identifier.value.toLowerCase(),
        );
        if (hit) {
          const account = rowToAccount(hit);
          saveAccount(account); // mirror locally for offline use
          return account;
        }
      }
    } catch {
      // network/RLS failure — fall back to local lookup
    }
  }
  return findAccount(identifier);
}

/** Log a returning user in. */
export function loginExisting(account: CustomerAccount) {
  writeSession(account);
}

/** Create + log in a new user. */
export function registerAndLogin(name: string, identifier: Identifier): CustomerAccount {
  const account: CustomerAccount = {
    id: shortId(),
    name: name.trim(),
    identifier,
    createdAt: new Date().toISOString(),
  };
  saveAccount(account);
  writeSession(account);
  const sb = getSupabase();
  if (sb) {
    sb.from("customers")
      .insert({
        id: account.id,
        name: account.name,
        identifier_type: identifier.type,
        identifier_value: identifier.value,
        created_at: account.createdAt,
      })
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud customer insert failed, using local", error.message);
      });
  }
  return account;
}

export function logout() {
  writeSession(null);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Live current customer (null when logged out). */
export function useCustomer(): CustomerAccount | null {
  return useSyncExternalStore(subscribe, readSession, () => null);
}

/** Demo OTP: a fixed, on-screen 4-digit code (production sends via SMS/email). */
export function demoOtp(): string {
  return "4321";
}
