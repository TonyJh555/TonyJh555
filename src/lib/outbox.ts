"use client";

import { useSyncExternalStore } from "react";
import { getSupabase } from "./supabase";

/**
 * Writes that have not reached the database yet.
 *
 * Every store here writes to the local cache first and sends to Supabase
 * second, which is right — the app must keep working on a Kerala 3G signal in
 * a stairwell. What was wrong is what happened when the send failed: the error
 * went to console.warn, which nobody reads, and the local change was then
 * destroyed.
 *
 * Destroyed, not merely unsynced. `refetchCloud` replaces the whole cache with
 * whatever the database returns, and it runs on every realtime event —
 * including changes to somebody else's booking. So the sequence was:
 *
 *   1. The worker taps "work is done". The screen says done.
 *   2. The update is refused (an RLS policy, a missing column, a dropped
 *      connection) and warns to a console on a phone with no console.
 *   3. Any other booking in Kerala changes. Realtime fires. The cache is
 *      replaced with cloud rows.
 *   4. The job is not done any more. The worker's earnings are not there.
 *
 * They tap again and it happens again. That is the worst class of bug this app
 * can have: it looks like success, it loses money, and nobody is told.
 *
 * The outbox fixes it in three parts, and all three are needed — any one alone
 * still loses the work:
 *
 *   `applyPending` stops a refetch from overwriting a record whose local write
 *   has not landed. It defends only writes made on THIS device: a record with
 *   nothing pending takes the cloud's version, because another device's change
 *   is news, not a conflict.
 *
 *   The queue survives a reload, so closing the app does not throw the work
 *   away, and retries send it when the signal comes back.
 *
 *   And whatever is still stuck is shown on screen, because a warning nobody
 *   can see is the thing that got us here.
 */

export type WriteKind = "insert" | "update" | "delete";

export interface PendingWrite {
  /** This entry's own id, not the record's. */
  id: string;
  /** Supabase table, e.g. "bookings". */
  table: string;
  /** Primary key of the row being written. */
  recordId: string;
  kind: WriteKind;
  /**
   * The columns to send when retrying. Deliberately only the ones that
   * changed: resending the whole row would revert a field another device
   * legitimately updated while this write was stuck.
   */
  payload?: Record<string, unknown>;
  /**
   * How the record looks locally, used to rebuild the cache after a refetch.
   * Absent for deletes, which remove rather than replace.
   */
  record?: unknown;
  at: string;
  attempts: number;
  lastError?: string;
}

/* ── The rule that stops the data loss ───────────────────────────── */

/**
 * Cloud rows, with this device's unsent writes laid back on top.
 *
 * Applied in the order they were queued, so two edits to one record end with
 * the later one — the same order the database would have seen them in.
 */
export function applyPending<T>(
  cloud: T[],
  pending: PendingWrite[],
  idOf: (row: T) => string,
): T[] {
  if (pending.length === 0) return cloud;
  const byId = new Map(cloud.map((row) => [idOf(row), row] as const));
  // Order matters, so keep the cloud's ordering and append anything the cloud
  // has never seen in the order it was created.
  const extras: string[] = [];

  for (const write of pending) {
    if (write.kind === "delete") {
      byId.delete(write.recordId);
      const i = extras.indexOf(write.recordId);
      if (i !== -1) extras.splice(i, 1);
      continue;
    }
    if (write.record === undefined) continue;
    if (!byId.has(write.recordId) && !extras.includes(write.recordId)) {
      extras.push(write.recordId);
    }
    byId.set(write.recordId, write.record as T);
  }

  // Unsent inserts go to the front: they are the newest thing that happened,
  // and a booking made ten seconds ago belongs at the top of the list rather
  // than buried under last month's.
  const front = extras.map((id) => byId.get(id)!).reverse();
  const rest = cloud.map((row) => byId.get(idOf(row))).filter((row): row is T => row !== undefined);
  return [...front, ...rest];
}

/** Entries for one table, oldest first. */
export function writesFor(pending: PendingWrite[], table: string): PendingWrite[] {
  return pending.filter((w) => w.table === table);
}

/**
 * How long the oldest stuck write has been waiting, in minutes.
 *
 * The number that decides how loudly to complain: a write three seconds old is
 * a network blip and interrupting somebody over it is noise; one that has been
 * sitting for ten minutes is a real problem the person needs to know about
 * before they walk away from the job.
 */
export function stuckMinutes(pending: PendingWrite[], now: Date = new Date()): number {
  if (pending.length === 0) return 0;
  const oldest = pending.reduce(
    (min, w) => Math.min(min, new Date(w.at).getTime()),
    Number.POSITIVE_INFINITY,
  );
  return Math.max(0, Math.floor((now.getTime() - oldest) / 60_000));
}

/** Past this, the person is told rather than left to find out. */
export const NAG_AFTER_MINUTES = 2;

export function shouldWarn(pending: PendingWrite[], now: Date = new Date()): boolean {
  if (pending.length === 0) return false;
  // A write that has already come back with an error is not going to fix
  // itself on the next tick — say so immediately rather than waiting out the
  // grace period meant for a slow connection.
  if (pending.some((w) => w.lastError)) return true;
  return stuckMinutes(pending, now) >= NAG_AFTER_MINUTES;
}

/**
 * Seconds to wait before attempt number `n`, capped.
 *
 * Backoff so a failing database is not hammered by every phone at once, capped
 * at a minute so a worker who fixes their signal is not left waiting on an
 * hour-long timer.
 */
export function retryDelaySeconds(attempts: number): number {
  return Math.min(60, 2 ** Math.max(0, attempts));
}

/* ── The persisted queue ─────────────────────────────────────────── */

const STORAGE_KEY = "kaam.outbox.v1";
const listeners = new Set<() => void>();
let cache: PendingWrite[] | null = null;

function readLocal(): PendingWrite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingWrite[]) : [];
  } catch {
    return [];
  }
}

function write(next: PendingWrite[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — the in-memory queue still works */
  }
  listeners.forEach((fn) => fn());
}

export function pendingWrites(): PendingWrite[] {
  if (typeof window === "undefined") return [];
  if (cache === null) cache = readLocal();
  return cache;
}

let seq = 0;

/** Record a write before attempting it, so a crash mid-send loses nothing. */
export function enqueue(entry: Omit<PendingWrite, "id" | "at" | "attempts">): string {
  const id = `ob-${Date.now().toString(36)}-${(seq++).toString(36)}`;
  write([...pendingWrites(), { ...entry, id, at: new Date().toISOString(), attempts: 0 }]);
  return id;
}

/** It landed. */
export function settle(id: string) {
  write(pendingWrites().filter((w) => w.id !== id));
}

/** It didn't. Keep it, remember why, and count the try. */
export function fail(id: string, error: string) {
  write(
    pendingWrites().map((w) =>
      w.id === id ? { ...w, attempts: w.attempts + 1, lastError: error } : w,
    ),
  );
}

/** Only for tests and the "start again" escape hatch. */
export function clearOutbox() {
  write([]);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useOutbox(): PendingWrite[] {
  return useSyncExternalStore(
    subscribe,
    pendingWrites,
    () => [] as PendingWrite[],
  );
}

/* ── Sending ─────────────────────────────────────────────────────── */

/**
 * Try everything that hasn't landed, oldest first.
 *
 * Sequential rather than parallel: these are edits to the same handful of
 * records, and sending them at once would let a later write land before an
 * earlier one and be overwritten by it.
 */
export async function flushOutbox(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  for (const w of pendingWrites()) {
    // Respect the backoff, so a database refusing everything is not hammered
    // by every phone in Kerala on a one-second timer.
    const waited = (Date.now() - new Date(w.at).getTime()) / 1000;
    if (w.attempts > 0 && waited < retryDelaySeconds(w.attempts)) continue;
    try {
      const { error } =
        w.kind === "insert"
          ? // upsert, not insert: a retry of a write that actually succeeded
            // before the reply got lost must not fail on a duplicate key and
            // sit in the queue forever.
            await sb.from(w.table).upsert(w.payload!)
          : w.kind === "delete"
            ? await sb.from(w.table).delete().eq("id", w.recordId)
            : await sb.from(w.table).update(w.payload!).eq("id", w.recordId);
      if (error) fail(w.id, error.message);
      else settle(w.id);
    } catch (e) {
      fail(w.id, e instanceof Error ? e.message : "Could not reach the database");
    }
  }
}

/**
 * Queue a write and try it immediately.
 *
 * Queued *before* the attempt, never after: a tab closed mid-request would
 * otherwise lose the write entirely, which is the exact failure this file
 * exists to prevent.
 */
export function queueWrite(entry: {
  table: string;
  recordId: string;
  kind: WriteKind;
  payload?: Record<string, unknown>;
  record?: unknown;
}) {
  if (!getSupabase()) return;
  enqueue(entry);
  void flushOutbox();
}

/**
 * Retry when the signal comes back, and on a slow heartbeat besides — "online"
 * never fires for a connection that stayed up but was refusing writes.
 */
let retryInit = false;
export function startOutboxRetries() {
  if (retryInit || typeof window === "undefined") return;
  retryInit = true;
  void flushOutbox();
  window.addEventListener("online", () => void flushOutbox());
  setInterval(() => void flushOutbox(), 30_000);
}
