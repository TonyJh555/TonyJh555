"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import { getSupabase } from "./supabase";

/**
 * Customer authentication.
 *
 * Signup/login by mobile number or email with an OTP step — the same flow
 * Swiggy/Zomato/Uber use. Two modes share one UI:
 *
 *  • demo (default)   — the code is shown on screen and any entry matching it
 *    is accepted; the id is locally generated. Zero setup; safe for previews.
 *  • supabase (prod)  — real Phone/Email OTP via Supabase Auth, so every
 *    request carries a genuine `auth.uid()` and per-user RLS can isolate each
 *    customer's rows (Stage 2 in SECURITY.md / hardening.sql). The customer's
 *    id **is** their auth uid, written onto every booking/address/subscription.
 *
 * The mode is chosen by NEXT_PUBLIC_SUPABASE_AUTH: set it to "1" (on the
 * preview/production deploy, after enabling an OTP provider in Supabase) to
 * switch on real auth. Unset/anything else keeps the demo flow unchanged, so
 * nothing breaks before the supervised migration is run.
 */

export type Identifier = { type: "phone"; value: string } | { type: "email"; value: string };

/** True when real Supabase Auth is switched on for this deploy. */
export function isRealAuth(): boolean {
  const flag = process.env.NEXT_PUBLIC_SUPABASE_AUTH;
  return (flag === "1" || flag === "true") && Boolean(getSupabase());
}

/**
 * Indian mobile → E.164 for Supabase Auth. The UI collects a bare 10-digit
 * number (validated `^\d{10}$`); Supabase needs the country code. Pure so it's
 * unit-tested. A value already in +country form is passed through untouched.
 */
export function toE164(phone: string): string {
  const t = phone.trim();
  if (t.startsWith("+")) return t.replace(/[^\d+]/g, "");
  const digits = t.replace(/\D/g, "");
  return `+91${digits}`;
}

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

export function logout() {
  const sb = getSupabase();
  if (isRealAuth() && sb) sb.auth.signOut().catch(() => {});
  writeSession(null);
}

/* ── Unified OTP flow (demo + Supabase Auth) ─────────────────────────────────
 * The login UI drives these three calls and never needs to know the mode.
 */

/** Held between verify → completeSignup so a new user's profile is keyed to auth.uid(). */
let pendingAuthUid: string | null = null;

export interface OtpChannel {
  /** demo: the code is shown on screen. real: it was texted/emailed. */
  demo: boolean;
  /** Present only in demo mode — the on-screen code to display. */
  code?: string;
  error?: string;
}

/** Send the one-time code. In demo mode this is a no-op that reveals the code. */
export async function requestOtp(identifier: Identifier): Promise<OtpChannel> {
  if (!isRealAuth()) return { demo: true, code: demoOtp() };
  const sb = getSupabase()!;
  const creds =
    identifier.type === "phone"
      ? { phone: toE164(identifier.value) }
      : { email: identifier.value.trim() };
  const { error } = await sb.auth.signInWithOtp(creds);
  return { demo: false, error: error?.message };
}

export interface OtpResult {
  status: "logged_in" | "needs_name" | "error";
  account?: CustomerAccount;
  error?: string;
}

/**
 * Verify the code. On success either logs the returning user in, or signals
 * `needs_name` for a first-time user (whose profile completeSignup() then
 * creates, keyed — in real-auth mode — to their auth.uid()).
 */
export async function verifyOtp(identifier: Identifier, code: string): Promise<OtpResult> {
  if (!isRealAuth()) {
    if (code.trim() !== demoOtp()) return { status: "error", error: "Wrong code. (Demo code is shown above.)" };
    const existing = await findAccountRemote(identifier);
    if (existing) {
      loginExisting(existing);
      return { status: "logged_in", account: existing };
    }
    return { status: "needs_name" };
  }

  const sb = getSupabase()!;
  const { data, error } =
    identifier.type === "phone"
      ? await sb.auth.verifyOtp({ phone: toE164(identifier.value), token: code.trim(), type: "sms" })
      : await sb.auth.verifyOtp({ email: identifier.value.trim(), token: code.trim(), type: "email" });
  if (error || !data.user) return { status: "error", error: error?.message ?? "Verification failed." };

  const uid = data.user.id;
  // Existing customer? Their profile row is keyed by the auth uid.
  const { data: rows } = await sb.from("customers").select("*").eq("id", uid).limit(1);
  const row = rows?.[0];
  if (row) {
    const account = rowToAccount(row);
    saveAccount(account);
    writeSession(account);
    return { status: "logged_in", account };
  }
  pendingAuthUid = uid; // first-time user — remember uid for completeSignup()
  return { status: "needs_name" };
}

/**
 * Create the profile for a first-time user and log them in. In real-auth mode
 * the id is the verified auth.uid() (so every row they write is owner-scoped);
 * in demo mode it's a locally-generated id.
 */
export async function completeSignup(name: string, identifier: Identifier): Promise<CustomerAccount> {
  const id = isRealAuth() && pendingAuthUid ? pendingAuthUid : shortId();
  const account: CustomerAccount = {
    id,
    name: name.trim(),
    identifier,
    createdAt: new Date().toISOString(),
  };
  saveAccount(account);
  writeSession(account);
  const sb = getSupabase();
  if (sb) {
    // upsert (not insert): in real-auth mode the auth user already exists, and
    // this is idempotent if the row was partially created.
    const { error } = await sb.from("customers").upsert({
      id: account.id,
      name: account.name,
      identifier_type: identifier.type,
      identifier_value: identifier.value,
      created_at: account.createdAt,
    });
    if (error) console.warn("KAAM: cloud customer upsert failed, using local", error.message);
  }
  pendingAuthUid = null;
  return account;
}

let hydrated = false;

/**
 * In real-auth mode, reconcile the on-device session with the Supabase session
 * once: rehydrate after a refresh or on a new device, and clear on sign-out.
 * A no-op in demo mode, so today's localStorage flow is untouched.
 */
function hydrateFromSupabase() {
  if (hydrated || !isRealAuth() || typeof window === "undefined") return;
  hydrated = true;
  const sb = getSupabase();
  if (!sb) return;
  sb.auth.getUser().then(async ({ data }) => {
    const uid = data.user?.id;
    if (uid && !readSession()) {
      const { data: rows } = await sb.from("customers").select("*").eq("id", uid).limit(1);
      if (rows?.[0]) {
        const account = rowToAccount(rows[0]);
        saveAccount(account);
        writeSession(account);
      }
    }
  });
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" && readSession()) writeSession(null);
  });
}

function subscribe(fn: () => void) {
  hydrateFromSupabase();
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
