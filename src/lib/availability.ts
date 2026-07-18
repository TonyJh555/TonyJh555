"use client";

import { useSyncExternalStore } from "react";

/**
 * Worker "away mode" — scheduled unavailability (leave/vacation). Keyed by
 * worker id → the date they're available again. While away, the worker is
 * treated as offline in search and their profile shows an away badge.
 */

export type AwayMap = Record<string, string>; // workerId -> ISO "available again" date

const KEY = "kaam.away.v1";
const listeners = new Set<() => void>();
let cache: AwayMap | null = null;
const EMPTY: AwayMap = {};

function read(): AwayMap {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as AwayMap;
    } catch {
      cache = {};
    }
  }
  return cache;
}

function write(map: AwayMap) {
  cache = map;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

/** Set (or clear, with null) a worker's away-until date. */
export function setAway(workerId: string, until: string | null) {
  const map = { ...read() };
  if (until) map[workerId] = until;
  else delete map[workerId];
  write(map);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAwayMap(): AwayMap {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Pure: is the worker currently away (away-until date is in the future)? */
export function isAway(map: AwayMap, workerId: string, now: Date = new Date()): boolean {
  const until = map[workerId];
  return Boolean(until) && new Date(until).getTime() > now.getTime();
}

export function awayUntil(map: AwayMap, workerId: string): string | undefined {
  return map[workerId];
}
