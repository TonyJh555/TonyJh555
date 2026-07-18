"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks when the customer last opened their notifications, so we can show an
 * unread count on the bell. Stored as an ISO timestamp in localStorage.
 */

const KEY = "kaam.notifseen.v1";
const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): string {
  if (typeof window === "undefined") return "0";
  if (cache === null) {
    try {
      cache = window.localStorage.getItem(KEY) ?? "0";
    } catch {
      cache = "0";
    }
  }
  return cache;
}

export function markSeen() {
  const now = new Date().toISOString();
  cache = now;
  try {
    window.localStorage.setItem(KEY, now);
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** ISO timestamp the notifications were last opened ("0" if never). */
export function useLastSeen(): string {
  return useSyncExternalStore(subscribe, read, () => "0");
}
