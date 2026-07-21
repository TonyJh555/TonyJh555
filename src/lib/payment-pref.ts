"use client";

/**
 * Remembers the customer's last-used payment method so repeat bookings
 * default to it — one less tap at checkout. Deliberately tiny: a single
 * stored string, no ceremony.
 */
const KEY = "kaam.paymethod.v1";

/** Read the saved method id (or null). SSR-safe. */
export function readPaymentPref(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Remember the chosen method for next time. */
export function setPaymentPref(id: string) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}
