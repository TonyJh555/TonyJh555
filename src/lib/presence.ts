"use client";

import { useSyncExternalStore } from "react";
import type { Worker } from "./types";

/**
 * Worker presence — the real Uber-style GO toggle. Going online/offline is
 * persisted, feeds dispatch eligibility (offline = no offers) and customer
 * search (offline workers rank below online ones), and tracks time online
 * per day for the driver-app "today" meter.
 *
 * Workers without an entry keep their seeded `worker.online` default, so
 * the demo roster stays lively until a worker touches the toggle.
 */

export interface PresenceEntry {
  online: boolean;
  /** When the current online stint began (ISO). Set while online. */
  since?: string;
  /** Accumulated online seconds per day, keyed YYYY-MM-DD. */
  daySeconds: Record<string, number>;
}

export type PresenceMap = Record<string, PresenceEntry>;

const KEY = "kaam.presence.v1";
const listeners = new Set<() => void>();
let cache: PresenceMap | null = null;
const EMPTY: PresenceMap = {};

function read(): PresenceMap {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as PresenceMap;
    } catch {
      cache = {};
    }
  }
  return cache;
}

function write(map: PresenceMap) {
  cache = map;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePresence(): PresenceMap {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Pure: apply a toggle to an entry, banking the finished stint's seconds. */
export function toggleEntry(
  entry: PresenceEntry | undefined,
  online: boolean,
  now: Date = new Date(),
): PresenceEntry {
  const base: PresenceEntry = entry ?? { online: false, daySeconds: {} };
  if (online) {
    return { ...base, online: true, since: base.online ? base.since : now.toISOString() };
  }
  const daySeconds = { ...base.daySeconds };
  if (base.online && base.since) {
    const stint = Math.max(0, Math.round((now.getTime() - new Date(base.since).getTime()) / 1000));
    daySeconds[day(now)] = (daySeconds[day(now)] ?? 0) + stint;
  }
  return { online: false, daySeconds };
}

/** Flip a worker online/offline (the GO button). */
export function setOnline(workerId: string, online: boolean, now: Date = new Date()) {
  const map = { ...read() };
  map[workerId] = toggleEntry(map[workerId], online, now);
  write(map);
}

/** Pure: is this worker online right now? Falls back to the seed default. */
export function presenceOnline(map: PresenceMap, worker: Pick<Worker, "id" | "online">): boolean {
  return map[worker.id]?.online ?? worker.online;
}

/** Pure: seconds online today, including the running stint. */
export function onlineSecondsToday(
  map: PresenceMap,
  workerId: string,
  now: Date = new Date(),
): number {
  const entry = map[workerId];
  if (!entry) return 0;
  let total = entry.daySeconds[day(now)] ?? 0;
  if (entry.online && entry.since) {
    total += Math.max(0, Math.round((now.getTime() - new Date(entry.since).getTime()) / 1000));
  }
  return total;
}

/** Pure: roster with live presence applied over the seed defaults. */
export function applyPresence(workers: Worker[], map: PresenceMap): Worker[] {
  return workers.map((w) => {
    const online = presenceOnline(map, w);
    return online === w.online ? w : { ...w, online };
  });
}

/** "2h 05m" / "12m" — the driver-app time-online format. */
export function formatOnlineTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
