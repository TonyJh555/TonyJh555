"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import { getSupabase, isSupabaseConfigured } from "./supabase";

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
  /** Quick tap-able tags (e.g. "On time", "Neat work"). See review-tags.ts. */
  tags?: string[];
  /** Compressed photo data URLs. */
  photos: string[];
  createdAt: string;
}

const STORAGE_KEY = "kaam.reviews.v1";
const listeners = new Set<() => void>();
let cache: Review[] | null = null;
let cloudInit = false;

function read(): Review[] {
  if (typeof window === "undefined") return [];
  if (cache === null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as Review[]) : [];
    } catch {
      cache = [];
    }
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

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toRow(r: Review): Row {
  return {
    id: r.id,
    worker_id: r.workerId,
    booking_id: r.bookingId,
    customer_name: r.customerName,
    rating: r.rating,
    text: r.text ?? null,
    tags: r.tags ?? [],
    photos: r.photos ?? [],
    created_at: r.createdAt,
  };
}

function fromRow(r: Row): Review {
  return {
    id: r.id as string,
    workerId: r.worker_id as string,
    bookingId: (r.booking_id as string) ?? "",
    customerName: (r.customer_name as string) ?? "Customer",
    rating: r.rating as number,
    text: (r.text as string) ?? undefined,
    tags: (r.tags as string[]) ?? [],
    photos: (r.photos as string[]) ?? [],
    createdAt: r.created_at as string,
  };
}

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return;
    write(data.map(fromRow));
  } catch {
    // keep local cache on failure
  }
}

function ensureCloud() {
  if (cloudInit || typeof window === "undefined" || !isSupabaseConfigured()) return;
  cloudInit = true;
  const sb = getSupabase();
  if (!sb) return;
  refetchCloud();
  try {
    sb.channel("kaam-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // realtime unavailable — cloud still works via manual refetch
  }
}

export function addReview(input: Omit<Review, "id" | "createdAt">): boolean {
  const review: Review = { ...input, id: shortId(), createdAt: new Date().toISOString() };
  if (!write([review, ...read()])) return false;
  const sb = getSupabase();
  if (sb) {
    sb.from("reviews")
      .insert(toRow(review))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud review insert failed, using local", error.message);
      });
  }
  return true;
}

export function hasReviewed(bookingId: string): boolean {
  return read().some((r) => r.bookingId === bookingId);
}

function subscribe(fn: () => void) {
  ensureCloud();
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
