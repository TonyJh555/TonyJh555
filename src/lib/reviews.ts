"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";

/**
 * Customer reviews on completed bookings — star rating, text, and optional
 * photos. Shown on worker profiles as social proof (the single biggest
 * conversion lever on Zomato/Urban Company). Demo storage is localStorage.
 */

export interface Review {
  id: string;
  workerId: string;
  bookingId: string;
  customerName: string;
  rating: number; // 1..5
  text?: string;
  /** Compressed photo data URLs. */
  photos: string[];
  createdAt: string;
}

const STORAGE_KEY = "kaam.reviews.v1";
const listeners = new Set<() => void>();
let cache: Review[] | null = null;

function read(): Review[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(reviews: Review[]): boolean {
  const previous = cache;
  cache = reviews;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    cache = previous;
    return false;
  }
  listeners.forEach((fn) => fn());
  return true;
}

export function addReview(input: Omit<Review, "id" | "createdAt">): boolean {
  return write([
    { ...input, id: shortId(), createdAt: new Date().toISOString() },
    ...read(),
  ]);
}

export function hasReviewed(bookingId: string): boolean {
  return read().some((r) => r.bookingId === bookingId);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: Review[] = [];

export function useReviews(): Review[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function reviewsForWorker(reviews: Review[], workerId: string): Review[] {
  return reviews.filter((r) => r.workerId === workerId);
}
