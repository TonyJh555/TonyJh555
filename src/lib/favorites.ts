"use client";

import { useSyncExternalStore } from "react";

/**
 * Favorite workers — "heart" a worker you trust for one-tap rebooking,
 * the Swiggy/Zomato re-order pattern applied to services. Local demo store.
 */

const STORAGE_KEY = "kaam.favorites.v1";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function toggleFavorite(workerId: string) {
  const ids = read();
  write(ids.includes(workerId) ? ids.filter((id) => id !== workerId) : [...ids, workerId]);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: string[] = [];

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
