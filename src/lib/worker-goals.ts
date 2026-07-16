"use client";

import { useSyncExternalStore } from "react";

/**
 * A worker's personal weekly earnings goal — the number their progress ring
 * fills toward. Stored per-device; motivational, not enforced.
 */

const KEY = "kaam.workergoal.v1";
export const DEFAULT_WEEKLY_GOAL = 5000;
export const GOAL_STEP = 500;

const listeners = new Set<() => void>();
let cache: number | null = null;

function read(): number {
  if (typeof window === "undefined") return DEFAULT_WEEKLY_GOAL;
  if (cache === null) {
    try {
      const raw = window.localStorage.getItem(KEY);
      cache = raw ? Number(raw) || DEFAULT_WEEKLY_GOAL : DEFAULT_WEEKLY_GOAL;
    } catch {
      cache = DEFAULT_WEEKLY_GOAL;
    }
  }
  return cache;
}

export function setWeeklyGoal(value: number) {
  cache = Math.max(GOAL_STEP, Math.round(value));
  try {
    window.localStorage.setItem(KEY, String(cache));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function useWeeklyGoal(): number {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => DEFAULT_WEEKLY_GOAL,
  );
}

/** Weekly job milestones → bonus. Motivates workers to push for more jobs. */
export const INCENTIVE_TIERS: { jobs: number; bonus: number }[] = [
  { jobs: 5, bonus: 300 },
  { jobs: 10, bonus: 800 },
  { jobs: 20, bonus: 2000 },
  { jobs: 35, bonus: 4000 },
];
