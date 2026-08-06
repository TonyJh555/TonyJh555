"use client";

import { useSyncExternalStore } from "react";
import { isRealAuth, requestOtp, toE164, verifyCode } from "./auth";
import { listCompanies, type EventCompany } from "./event-store";

/**
 * Proving that whoever opened /events is who they say they are.
 *
 * Everything built for event companies — the partner agreement, the
 * commission, the introduction clause, the record of who met whom — rests on
 * one assumption: that the person accepting the terms speaks for that company.
 * Until now nothing checked it. The portal chose an identity from a dropdown
 * and fell back to whichever company happened to be last in the list, so any
 * visitor could read another firm's briefs, open its customers' threads and
 * sign an agreement in its name.
 *
 * That was a reasonable shape for a demo and is not one to launch with. A
 * signature nobody can attribute is not a signature.
 *
 * The check is the same one customers already pass: a one-time code to the
 * number the company registered. It is deliberately not a password — a
 * caterer's login gets shared around an office, and a code sent to the
 * registered phone at least proves somebody holds that phone today. Real SMS
 * arrives with Supabase Auth exactly as it does for customers; in demo mode
 * the code is shown on screen, which this file does not decide.
 *
 * What this does not do, and should not be mistaken for: it does not prove the
 * person is *authorised* by the company, only that they hold its registered
 * number. Binding the account to a verified GSTIN is the stronger check and
 * needs the vendor integration that worker KYC is also waiting on.
 */

const SESSION_KEY = "kaam.company.session.v1";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Which company this browser is signed in as, if any. */
export function currentCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(companyId: string | null) {
  try {
    if (companyId) window.localStorage.setItem(SESSION_KEY, companyId);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — the session simply won't persist */
  }
  notify();
}

export function signOutCompany() {
  writeSession(null);
}

/** Bare digits, so "98765 43210" and "+91 98765 43210" are the same number. */
export function samePhone(a: string, b: string): boolean {
  const digits = (s: string) => s.replace(/\D/g, "").slice(-10);
  const x = digits(a);
  return x.length === 10 && x === digits(b);
}

/**
 * The company registered against this number, if there is one.
 *
 * Matched on the last ten digits so a number stored with a country code, a
 * space or a dash still finds its company — the registration form and the
 * sign-in form were never going to be typed identically.
 */
export function companyByPhone(
  companies: EventCompany[],
  phone: string,
): EventCompany | undefined {
  return companies.find((c) => c.phone && samePhone(c.phone, phone));
}

export interface CompanySignInStart {
  /** demo: the code is shown on screen. real: it was texted. */
  demo: boolean;
  code?: string;
  /** Set when no company is registered against that number. */
  error?: string;
}

/**
 * Step one: send the code.
 *
 * A number with no company behind it is told so plainly rather than being sent
 * a code that could never work. There is nothing to protect by being vague —
 * anyone can see which companies are listed.
 */
export async function startCompanySignIn(phone: string): Promise<CompanySignInStart> {
  const company = companyByPhone(listCompanies(), phone);
  if (!company) {
    return {
      demo: !isRealAuth(),
      error: "No company is registered against that number.",
    };
  }
  const channel = await requestOtp({ type: "phone", value: toE164(phone) });
  return { demo: channel.demo, code: channel.code, error: channel.error };
}

export interface CompanySignInResult {
  ok: boolean;
  company?: EventCompany;
  error?: string;
}

/** Step two: check the code, and sign them in as that company. */
export async function finishCompanySignIn(
  phone: string,
  code: string,
): Promise<CompanySignInResult> {
  const company = companyByPhone(listCompanies(), phone);
  if (!company) return { ok: false, error: "No company is registered against that number." };

  // verifyCode already knows the difference between demo and real auth —
  // checking the demo code a second time here would be a second source of
  // truth, and the two would eventually disagree.
  const result = await verifyCode({ type: "phone", value: toE164(phone) }, code);
  if (!result.ok) return { ok: false, error: result.error ?? "That code didn't work." };

  writeSession(company.id);
  return { ok: true, company };
}

/** Sign in a company that has just registered — they proved the number to get here. */
export function signInNewCompany(companyId: string) {
  writeSession(companyId);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (typeof window !== "undefined") window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", fn);
  };
}

/** The signed-in company, live. Null when nobody is signed in. */
export function useCompanySession(companies: EventCompany[]): EventCompany | null {
  const id = useSyncExternalStore(subscribe, currentCompanyId, () => null);
  if (!id) return null;
  return companies.find((c) => c.id === id) ?? null;
}
