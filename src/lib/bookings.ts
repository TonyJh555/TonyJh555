"use client";

import { useSyncExternalStore } from "react";
import type { Booking } from "./types";

/**
 * Client-side booking store backed by localStorage.
 *
 * This stands in for the production API (PostgreSQL via the Node backend).
 * Bookings created in the user app are visible in the worker and admin
 * dashboards because all three read the same store.
 */

const STORAGE_KEY = "kaam.bookings.v1";
const listeners = new Set<() => void>();

let cache: Booking[] | null = null;

function read(): Booking[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(bookings: Booking[]) {
  cache = bookings;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    // Storage may be unavailable (private mode); keep the in-memory copy.
  }
  listeners.forEach((fn) => fn());
}

export function addBooking(booking: Booking) {
  write([booking, ...read()]);
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  write(read().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: Booking[] = [];

/** React hook: live list of bookings, newest first. */
export function useBookings(): Booking[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const PAY_METHODS = [
  { id: "gpay", label: "Google Pay", icon: "📱", sub: "UPI — Instant" },
  { id: "paytm", label: "Paytm UPI", icon: "💙", sub: "Paytm / Any UPI" },
  { id: "card", label: "Credit / Debit Card", icon: "💳", sub: "Visa · Mastercard · RuPay" },
  { id: "nb", label: "Net Banking", icon: "🏦", sub: "All major banks" },
  { id: "cash", label: "Pay at Completion", icon: "💵", sub: "Cash or UPI directly" },
] as const;
