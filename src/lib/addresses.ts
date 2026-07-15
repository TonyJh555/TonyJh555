"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import type { LatLng } from "./geo";

/**
 * Saved addresses (Home / Office / Other) — the Swiggy/Zomato staple that
 * makes rebooking one tap. Demo storage is localStorage; production keys
 * these to the customer row in Supabase.
 */

export type AddressLabel = "Home" | "Office" | "Other";

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  /** Optional custom name when label is "Other" (e.g. "Mom's house"). */
  customName?: string;
  line: string; // e.g. "Flat 4B, Panampilly Nagar, Kochi"
  landmark?: string;
  /** Map pin captured when the address was set on the map. */
  coords?: LatLng;
}

const STORAGE_KEY = "kaam.addresses.v1";
const listeners = new Set<() => void>();
let cache: SavedAddress[] | null = null;

function read(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as SavedAddress[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(addresses: SavedAddress[]) {
  cache = addresses;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function addAddress(input: Omit<SavedAddress, "id">): SavedAddress {
  const address: SavedAddress = { ...input, id: shortId() };
  write([...read(), address]);
  return address;
}

export function removeAddress(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function displayName(a: SavedAddress): string {
  return a.label === "Other" && a.customName ? a.customName : a.label;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: SavedAddress[] = [];

export function useAddresses(): SavedAddress[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
