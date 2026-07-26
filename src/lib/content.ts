"use client";

import { useSyncExternalStore } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Editable site content — the layer that stops "change the banner headline"
 * from meaning "wait for a developer".
 *
 * One table, one shape: a key, and a JSON document. Every editable surface
 * (banners, offers, home copy…) reads its document through `useContent(key,
 * fallback)` and gets the code-level default until somebody edits it in the
 * admin console. That matters for two reasons: the app looks right on a fresh
 * install with an empty table, and a bad edit can always be reverted to the
 * default by deleting the row.
 *
 * What belongs here: words, pictures, offers, ordering — anything a marketer
 * would change on a Tuesday. What does NOT belong here: GST and TDS rates,
 * the fair-billing algorithm, payout maths. Those are law and money; they
 * change in code, with a test and a review.
 */

export type ContentMap = Record<string, unknown>;

const STORAGE_KEY = "kaam.content.v1";
const listeners = new Set<() => void>();
let cache: ContentMap | null = null;
let cloudInit = false;

const EMPTY: ContentMap = {};

function read(): ContentMap {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as ContentMap) : {};
    } catch {
      cache = {};
    }
  }
  return cache;
}

function write(next: ContentMap) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full — the in-memory copy still serves this session.
  }
  listeners.forEach((fn) => fn());
}

/* ── Cloud ───────────────────────────────────────────────────────── */

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb.from("site_content").select("key,value");
    if (error || !data) return; // keep whatever we have
    const next: ContentMap = {};
    for (const row of data) next[row.key as string] = row.value;
    write(next);
  } catch {
    // Offline — the local mirror stands in.
  }
}

function ensureCloud() {
  if (cloudInit || typeof window === "undefined" || !isSupabaseConfigured()) return;
  cloudInit = true;
  refetchCloud();
  try {
    getSupabase()
      ?.channel("kaam-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // Realtime unavailable — edits still land on the next load.
  }
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * The stored document for `key`, or `fallback` when nothing has been saved.
 * The fallback is the code default, so the app is never blank and an edit can
 * always be undone by clearing the row.
 */
export function useContent<T>(key: string, fallback: T): T {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);
  const value = all[key];
  return (value === undefined || value === null ? fallback : value) as T;
}

/** Read once, outside React. */
export function getContent<T>(key: string, fallback: T): T {
  const value = read()[key];
  return (value === undefined || value === null ? fallback : value) as T;
}

/** Save an edit. Writes through to the cloud so every device sees it. */
export function saveContent(key: string, value: unknown, editor?: string) {
  write({ ...read(), [key]: value });
  const sb = getSupabase();
  if (sb) {
    sb.from("site_content")
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: editor ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn("KAAM: content save failed, kept locally", error.message);
      });
  }
}

/** Drop an edit and go back to the code default. */
export function resetContent(key: string) {
  const next = { ...read() };
  delete next[key];
  write(next);
  const sb = getSupabase();
  if (sb) {
    sb.from("site_content")
      .delete()
      .eq("key", key)
      .then(({ error }) => {
        if (error) console.warn("KAAM: content reset failed, cleared locally", error.message);
      });
  }
}

/** True when this key has been edited away from its code default. */
export function isEdited(all: ContentMap, key: string): boolean {
  return all[key] !== undefined && all[key] !== null;
}

/** Everything stored, for the admin console's "what have we changed" view. */
export function useAllContent(): ContentMap {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
