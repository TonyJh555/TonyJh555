"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Per-booking chat between user and worker.
 *
 * Cloud-synced via Supabase (Postgres Realtime) when configured, with an
 * automatic localStorage fallback so chat still works if a cloud call fails.
 * When Supabase is live, a message sent on the customer's phone appears on
 * the worker's device instantly. Media is embedded as compressed data URLs so
 * photo/video sharing works with zero extra infrastructure.
 */

export type ChatSender = "user" | "worker" | "system";
export type ChatKind = "text" | "image" | "video";

export interface ChatMessage {
  id: string;
  bookingId: string;
  sender: ChatSender;
  kind: ChatKind;
  /** Text body (may contain URLs, rendered as links). */
  text?: string;
  /** Compressed data URL for image/video messages. */
  dataUrl?: string;
  createdAt: string; // ISO timestamp
  readByUser: boolean;
  readByWorker: boolean;
}

const STORAGE_KEY = "kaam.chat.v1";
const listeners = new Set<() => void>();

let cache: ChatMessage[] | null = null;
let cloudInit = false;

/* ── localStorage mirror ─────────────────────────────────────────── */
function readLocal(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function read(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  if (cache === null) cache = readLocal();
  return cache;
}

/**
 * Persist to localStorage + notify. Returns false when storage is full
 * (e.g. a video too large) and rolls the in-memory cache back so state
 * stays consistent.
 */
function write(messages: ChatMessage[]): boolean {
  const previous = cache;
  cache = messages;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    cache = previous;
    return false;
  }
  listeners.forEach((fn) => fn());
  return true;
}

/** Drop whole conversations — used when their bookings are cleared. */
export function clearThreads(bookingIds: string[]) {
  if (bookingIds.length === 0) return;
  const drop = new Set(bookingIds);
  write(read().filter((m) => !drop.has(m.bookingId)));
  const sb = getSupabase();
  if (sb) {
    sb.from("chat_messages")
      .delete()
      .in("thread_id", bookingIds)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud chat clear failed, cleared locally", error.message);
      });
  }
}

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toRow(m: ChatMessage): Row {
  return {
    id: m.id,
    thread_id: m.bookingId,
    sender: m.sender,
    kind: m.kind,
    body: m.text ?? null,
    media_url: m.dataUrl ?? null,
    read_by_user: m.readByUser,
    read_by_worker: m.readByWorker,
    created_at: m.createdAt,
  };
}

function fromRow(r: Row): ChatMessage {
  return {
    id: r.id as string,
    bookingId: r.thread_id as string,
    sender: r.sender as ChatSender,
    kind: (r.kind as ChatKind) ?? "text",
    text: (r.body as string) ?? undefined,
    dataUrl: (r.media_url as string) ?? undefined,
    createdAt: r.created_at as string,
    readByUser: Boolean(r.read_by_user),
    readByWorker: Boolean(r.read_by_worker),
  };
}

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !data) return; // keep local cache on error
    cache = data.map(fromRow);
    listeners.forEach((fn) => fn());
  } catch {
    // network/RLS failure — silently keep local cache
  }
}

/** Kick off cloud fetch + realtime once, on the client, if configured. */
function ensureCloud() {
  if (cloudInit || typeof window === "undefined" || !isSupabaseConfigured()) return;
  cloudInit = true;
  const sb = getSupabase();
  if (!sb) return;
  refetchCloud();
  try {
    sb.channel("kaam-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // realtime unavailable — cloud still works via manual refetch on writes
  }
}

/* ── Public API ──────────────────────────────────────────────────── */
export interface SendMessageInput {
  bookingId: string;
  sender: ChatSender;
  kind?: ChatKind;
  text?: string;
  dataUrl?: string;
}

/** Returns false when storage is full (e.g. video too large). */
export function sendMessage({ bookingId, sender, kind = "text", text, dataUrl }: SendMessageInput): boolean {
  const message: ChatMessage = {
    id: shortId(),
    bookingId,
    sender,
    kind,
    text,
    dataUrl,
    createdAt: new Date().toISOString(),
    readByUser: sender === "user" || sender === "system",
    readByWorker: sender === "worker" || sender === "system",
  };
  const ok = write([...read(), message]); // optimistic + local mirror
  if (!ok) return false;
  const sb = getSupabase();
  if (sb) {
    sb.from("chat_messages")
      .insert(toRow(message))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud chat insert failed, using local", error.message);
      });
  }
  return true;
}

/** Mark everything in a thread as read by one side. */
export function markThreadRead(bookingId: string, side: "user" | "worker") {
  const key = side === "user" ? "readByUser" : "readByWorker";
  const messages = read();
  if (!messages.some((m) => m.bookingId === bookingId && !m[key])) return;
  write(messages.map((m) => (m.bookingId === bookingId ? { ...m, [key]: true } : m)));

  const sb = getSupabase();
  if (sb) {
    const col = side === "user" ? "read_by_user" : "read_by_worker";
    sb.from("chat_messages")
      .update({ [col]: true })
      .eq("thread_id", bookingId)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud chat read-receipt failed, using local", error.message);
      });
  }
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: ChatMessage[] = [];

/** Live message list for the whole store; filter by booking in the caller. */
export function useChatMessages(): ChatMessage[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function unreadCount(messages: ChatMessage[], bookingId: string, side: "user" | "worker"): number {
  const key = side === "user" ? "readByUser" : "readByWorker";
  return messages.filter((m) => m.bookingId === bookingId && !m[key]).length;
}

/** One-tap quick replies per role. */
export const QUICK_REPLIES: Record<"user" | "worker", string[]> = {
  user: [
    "Where have you reached? 📍",
    "Please come after 5 PM 🕔",
    "Please call before arriving 📞",
    "Sending a video of the problem 🎥",
  ],
  worker: [
    "On my way 🚗",
    "I've arrived at your location 📍",
    "Need 10 more minutes ⏱",
    "Work completed — sending photos ✅",
    "This needs an extra part — sharing details 🔩",
  ],
};
