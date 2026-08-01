"use client";

import { useSyncExternalStore } from "react";
import type { Booking } from "./types";
import { earnedAt, workerCredit } from "./analytics";

/**
 * Weekly earnings goal — the Uber Pro "₹X to go this week" ring. A worker
 * sets a target once; the app tracks this calendar week's take-home against
 * it, shows a progress ring + a Mon→Sun mini-chart, and says whether they're
 * on pace. Motivation that turns effort into a visible finish line.
 *
 * The target is persisted per worker; the progress is computed live from
 * completed-booking payouts (pure, so it's unit-tested).
 */

export const DEFAULT_WEEKLY_GOAL = 5000;
export const GOAL_PRESETS = [3000, 5000, 8000, 12000];

const KEY = "kaam.weeklygoal.v1";
const listeners = new Set<() => void>();
let cache: Record<string, number> | null = null;
const EMPTY: Record<string, number> = {};

function read(): Record<string, number> {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

export function setWeeklyGoal(workerId: string, target: number) {
  const map = { ...read(), [workerId]: Math.max(0, Math.round(target)) };
  cache = map;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function useWeeklyGoals(): Record<string, number> {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => EMPTY,
  );
}

export function weeklyGoal(map: Record<string, number>, workerId: string): number {
  return map[workerId] ?? DEFAULT_WEEKLY_GOAL;
}

/** Midnight on this week's Monday (weeks run Mon→Sun, as Kerala workers count). */
export function startOfWeek(now: Date = new Date()): Date {
  const d = new Date(now);
  const dayFromMonday = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dayFromMonday);
  return d;
}

export interface DayEarning {
  label: string; // Mon…Sun
  value: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeekProgress {
  earned: number;
  target: number;
  /** Fraction toward the goal, capped at 1 (for the ring). */
  pct: number;
  /** Uncapped fraction (can exceed 1 when the goal is beaten). */
  rawPct: number;
  /** ₹ still to earn (0 once achieved). */
  remaining: number;
  jobs: number;
  days: DayEarning[];
  achieved: boolean;
  /** Earned ≥ the pace expected by the end of today. */
  onTrack: boolean;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** This calendar week's take-home vs the target, with a day-by-day split. */
export function weekProgress(
  bookings: Booking[],
  workerId: string,
  target: number,
  now: Date = new Date(),
): WeekProgress {
  const start = startOfWeek(now);
  const todayIdx = (now.getDay() + 6) % 7; // 0..6, Mon-based

  const days: DayEarning[] = DAY_LABELS.map((label, i) => ({
    label,
    value: 0,
    isToday: i === todayIdx,
    isFuture: i > todayIdx,
  }));

  let earned = 0;
  let jobs = 0;
  for (const b of bookings) {
    if (b.workerId !== workerId || workerCredit(b) <= 0) continue;
    // The day the work finished, not the day it was booked — otherwise a job
    // ordered last week fills a bar the worker can no longer reach.
    const t = new Date(earnedAt(b));
    const idx = Math.floor((new Date(t).setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000);
    if (idx < 0 || idx > 6) continue;
    days[idx].value += workerCredit(b);
    earned += workerCredit(b);
    // A call-out paid because the customer cancelled is money, not a job done.
    if (b.status === "completed") jobs += 1;
  }

  const rawPct = target > 0 ? earned / target : 0;
  // Pace: how much of the goal should be done by the end of today.
  const expectedByNow = target * ((todayIdx + 1) / 7);
  return {
    earned,
    target,
    pct: Math.min(1, rawPct),
    rawPct,
    remaining: Math.max(0, target - earned),
    jobs,
    days,
    achieved: earned >= target && target > 0,
    onTrack: earned >= expectedByNow,
  };
}
