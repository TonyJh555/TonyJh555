"use client";

import { useSyncExternalStore } from "react";

/** Recently viewed worker ids — newest first, deduped, capped at 8. */

const KEY = "kaam.recentworkers.v1";
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

/** Pure: prepend an id, dedupe, cap. */
export function pushViewed(list: string[], id: string, max = MAX): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

export function recordWorkerView(id: string) {
  write(pushViewed(read(), id));
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
