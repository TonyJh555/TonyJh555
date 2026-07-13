"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";

/**
 * Per-booking chat between user and worker.
 *
 * Demo implementation on localStorage (same pattern as the booking store),
 * standing in for the production stack: Firestore for delivery + Signal
 * Protocol E2EE per the build guide. Media is embedded as compressed data
 * URLs so photo/video sharing works with zero infrastructure.
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

function read(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(messages: ChatMessage[]): boolean {
  const previous = cache;
  cache = messages;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Quota exceeded (too much media) — roll back so state stays consistent.
    cache = previous;
    return false;
  }
  listeners.forEach((fn) => fn());
  return true;
}

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
  return write([...read(), message]);
}

/** Mark everything in a thread as read by one side. */
export function markThreadRead(bookingId: string, side: "user" | "worker") {
  const key = side === "user" ? "readByUser" : "readByWorker";
  const messages = read();
  if (!messages.some((m) => m.bookingId === bookingId && !m[key])) return;
  write(messages.map((m) => (m.bookingId === bookingId ? { ...m, [key]: true } : m)));
}

function subscribe(fn: () => void) {
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
