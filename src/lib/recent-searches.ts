"use client";

import { useSyncExternalStore } from "react";

/** Recent search terms (Swiggy/Zomato staple) — newest first, deduped, max 8. */

const KEY = "kaam.recentsearch.v1";
const MAX = 8;
const listeners = new Set<() => void>();
let cache: string[] | null = null;
const EMPTY: string[] = [];

function read(): string[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(list: string[]) {
  cache = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

/** Pure: prepend a term, dedupe case-insensitively, cap the list. */
export function pushRecent(list: string[], term: string, max = MAX): string[] {
  const t = term.trim();
  if (t.length < 2) return list;
  const rest = list.filter((x) => x.toLowerCase() !== t.toLowerCase());
  return [t, ...rest].slice(0, max);
}

export function addRecentSearch(term: string) {
  write(pushRecent(read(), term));
}

export function clearRecentSearches() {
  write([]);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
