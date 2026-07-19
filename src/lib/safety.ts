"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import type { Booking } from "./types";

/**
 * Safety Toolkit — trusted contacts, the heart of Uber's safety suite.
 * A customer saves up to three family members once; from then on every
 * job can be shared with them in one tap (WhatsApp/SMS), and contacts
 * marked "auto" trigger a share prompt the moment a worker starts a job
 * in their home.
 *
 * Demo storage is localStorage; production would keep contacts on the
 * customer profile and send server-side SMS via an SMS gateway.
 */

export interface TrustedContact {
  id: string;
  name: string;
  /** Digits only, with country code (e.g. 919876543210). */
  phone: string;
  /** Prompt a share automatically when a job starts. */
  autoNotify: boolean;
}

export const MAX_CONTACTS = 3;

const KEY = "kaam.trusted.v1";
const listeners = new Set<() => void>();
let cache: TrustedContact[] | null = null;
const EMPTY: TrustedContact[] = [];

function read(): TrustedContact[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as TrustedContact[];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(list: TrustedContact[]) {
  cache = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function useTrustedContacts(): TrustedContact[] {
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
 * Pure: normalize an Indian phone number to digits with country code.
 * Accepts "98765 43210", "+91 98765-43210", "09876543210"… Returns null
 * when it can't be a valid mobile number.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

/** Add a contact; returns false when full or the number is invalid. */
export function addContact(name: string, rawPhone: string): boolean {
  const list = read();
  if (list.length >= MAX_CONTACTS) return false;
  const phone = normalizePhone(rawPhone);
  if (!phone || !name.trim()) return false;
  write([...list, { id: shortId(), name: name.trim(), phone, autoNotify: true }]);
  return true;
}

export function removeContact(id: string) {
  write(read().filter((c) => c.id !== id));
}

export function toggleAutoNotify(id: string) {
  write(read().map((c) => (c.id === id ? { ...c, autoNotify: !c.autoNotify } : c)));
}

/** Pure: the family-facing status message for a booking. */
export function statusMessage(
  booking: Pick<Booking, "subService" | "workerName" | "address" | "startCode" | "status">,
): string {
  const stage =
    booking.status === "in_progress"
      ? "The worker has started the job"
      : booking.status === "completed"
        ? "The job is finished"
        : "A worker is booked";
  return (
    `KAAM safety update 🛡️\n` +
    `${stage}: ${booking.subService} with ${booking.workerName} (KYC-verified).\n` +
    `📍 ${booking.address ?? "Kerala"}\n` +
    `The job only starts with a private OTP, is tracked in-app, and has an SOS button.`
  );
}

/** Pure: one-tap WhatsApp / SMS links with the message prefilled. */
export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function smsLink(phone: string, text: string): string {
  return `sms:+${phone}?body=${encodeURIComponent(text)}`;
}
