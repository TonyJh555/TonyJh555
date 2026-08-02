"use client";

import { useSyncExternalStore } from "react";
import type { Booking } from "./types";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Booking store — cloud-synced via Supabase when configured, with an
 * automatic localStorage fallback so the app never breaks if a cloud call
 * fails. When Supabase is live, a booking made on one device appears on the
 * worker's device instantly (Postgres Realtime).
 */

const STORAGE_KEY = "kaam.bookings.v1";
const listeners = new Set<() => void>();

let cache: Booking[] | null = null;
let cloudInit = false;

/* ── localStorage mirror ─────────────────────────────────────────── */
function readLocal(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(bookings: Booking[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    // storage unavailable — keep in-memory copy
  }
}

function read(): Booking[] {
  if (typeof window === "undefined") return [];
  if (cache === null) cache = readLocal();
  return cache;
}

function setCache(next: Booking[]) {
  cache = next;
  writeLocal(next);
  listeners.forEach((fn) => fn());
}

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toRow(b: Booking): Row {
  return {
    id: b.id,
    customer_id: b.customerId ?? null,
    worker_id: b.workerId,
    worker_name: b.workerName,
    category_id: b.categoryId,
    sub_service: b.subService,
    tenure_id: b.tenureId,
    address: b.address ?? null,
    coords: b.coords ?? null,
    schedule: b.schedule ?? null,
    quote: b.quote,
    payment_method: b.paymentMethod,
    status: b.status,
    start_code: b.startCode,
    rating: b.rating ?? null,
    customer_rating: b.customerRating ?? null,
    cancel_reason: b.cancelReason ?? null,
    dispatch: b.dispatch ?? null,
    started_at: b.startedAt ?? null,
    completed_at: b.completedAt ?? null,
    banked_ms: b.bankedMs ?? null,
    paused_at: b.pausedAt ?? null,
    intake: b.intake ?? null,
    crew: b.crew ?? null,
    reschedule: b.reschedule ?? null,
    completion: b.completion ?? null,
    reschedule_count: b.rescheduleCount ?? null,
    settlement: b.settlement ?? null,
    callout_pay: b.calloutPay ?? null,
    day_baseline_ms: b.dayBaselineMs ?? null,
    payment: b.payment ?? null,
    created_at: b.createdAt,
  };
}

function fromRow(r: Row): Booking {
  return {
    id: r.id as string,
    customerId: (r.customer_id as string) ?? undefined,
    workerId: r.worker_id as string,
    workerName: r.worker_name as string,
    categoryId: r.category_id as Booking["categoryId"],
    subService: r.sub_service as string,
    tenureId: r.tenure_id as Booking["tenureId"],
    stateId: "KL",
    address: (r.address as string) ?? undefined,
    coords: (r.coords as Booking["coords"]) ?? undefined,
    schedule: (r.schedule as Booking["schedule"]) ?? undefined,
    quote: r.quote as Booking["quote"],
    paymentMethod: r.payment_method as string,
    status: r.status as Booking["status"],
    startCode: r.start_code as string,
    rating: (r.rating as number) ?? undefined,
    customerRating: (r.customer_rating as number) ?? undefined,
    cancelReason: (r.cancel_reason as string) ?? undefined,
    dispatch: (r.dispatch as Booking["dispatch"]) ?? undefined,
    startedAt: (r.started_at as string) ?? undefined,
    completedAt: (r.completed_at as string) ?? undefined,
    bankedMs: (r.banked_ms as number) ?? undefined,
    pausedAt: (r.paused_at as string) ?? undefined,
    intake: (r.intake as Booking["intake"]) ?? undefined,
    crew: (r.crew as Booking["crew"]) ?? undefined,
    reschedule: (r.reschedule as Booking["reschedule"]) ?? undefined,
    completion: (r.completion as Booking["completion"]) ?? undefined,
    rescheduleCount: (r.reschedule_count as number) ?? undefined,
    tip: (r.tip as number) ?? undefined,
    tipPaidAt: (r.tip_paid_at as string) ?? undefined,
    settlement: (r.settlement as Booking["settlement"]) ?? undefined,
    calloutPay: (r.callout_pay as number) ?? undefined,
    dayBaselineMs: (r.day_baseline_ms as number) ?? undefined,
    payment: (r.payment as Booking["payment"]) ?? undefined,
    createdAt: r.created_at as string,
  };
}

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return; // keep local cache on error
    setCache(data.map(fromRow));
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
    sb.channel("kaam-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // realtime unavailable — cloud still works via manual refetch on writes
  }
}

/* ── Public API ──────────────────────────────────────────────────── */
export function addBooking(booking: Booking) {
  setCache([booking, ...read()]); // optimistic + local mirror
  const sb = getSupabase();
  if (sb) {
    sb.from("bookings")
      .insert(toRow(booking))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud booking insert failed, using local", error.message);
      });
  }
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  setCache(read().map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const sb = getSupabase();
  if (sb) {
    const row: Row = {};
    if ("status" in patch) row.status = patch.status;
    if ("rating" in patch) row.rating = patch.rating ?? null;
    if ("customerRating" in patch) row.customer_rating = patch.customerRating ?? null;
    if ("cancelReason" in patch) row.cancel_reason = patch.cancelReason ?? null;
    if ("schedule" in patch) row.schedule = patch.schedule ?? null;
    if ("address" in patch) row.address = patch.address ?? null;
    if ("coords" in patch) row.coords = patch.coords ?? null;
    // Dispatch reassignment moves the job to another worker.
    if ("workerId" in patch) row.worker_id = patch.workerId;
    if ("workerName" in patch) row.worker_name = patch.workerName;
    if ("dispatch" in patch) row.dispatch = patch.dispatch ?? null;
    // Metered billing: job clock stamps and the settled final quote.
    if ("startedAt" in patch) row.started_at = patch.startedAt ?? null;
    if ("completedAt" in patch) row.completed_at = patch.completedAt ?? null;
    // Pause & reschedule: banked worked time, pause stamp, the request, the count.
    if ("bankedMs" in patch) row.banked_ms = patch.bankedMs ?? null;
    if ("pausedAt" in patch) row.paused_at = patch.pausedAt ?? null;
    if ("intake" in patch) row.intake = patch.intake ?? null;
    if ("crew" in patch) row.crew = patch.crew ?? null;
    if ("reschedule" in patch) row.reschedule = patch.reschedule ?? null;
    if ("completion" in patch) row.completion = patch.completion ?? null;
    if ("rescheduleCount" in patch) row.reschedule_count = patch.rescheduleCount ?? null;
    if ("tip" in patch) row.tip = patch.tip ?? null;
    if ("tipPaidAt" in patch) row.tip_paid_at = patch.tipPaidAt ?? null;
    if ("settlement" in patch) row.settlement = patch.settlement ?? null;
    if ("calloutPay" in patch) row.callout_pay = patch.calloutPay ?? null;
    if ("dayBaselineMs" in patch) row.day_baseline_ms = patch.dayBaselineMs ?? null;
    if ("payment" in patch) row.payment = patch.payment ?? null;
    if ("quote" in patch) row.quote = patch.quote;
    if (Object.keys(row).length) {
      sb.from("bookings")
        .update(row)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("KAAM: cloud booking update failed, using local", error.message);
        });
    }
  }
}

export function removeBooking(id: string) {
  setCache(read().filter((b) => b.id !== id));
  const sb = getSupabase();
  if (sb) {
    sb.from("bookings")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud booking delete failed, using local", error.message);
      });
  }
}

/**
 * Wipe one customer's own bookings — a testing convenience, not a product
 * feature. Scoped to `customerId` so it can never touch anybody else's rows,
 * and it clears the cloud copy too: deleting only locally would be undone by
 * the next sync, which would make the button a lie.
 *
 * Returns the ids removed, so the caller can clear their chat threads.
 */
export function clearMyBookings(customerId: string | undefined): string[] {
  const mine = read().filter((b) => (customerId ? b.customerId === customerId : !b.customerId));
  const ids = mine.map((b) => b.id);
  if (ids.length === 0) return [];
  setCache(read().filter((b) => !ids.includes(b.id)));
  const sb = getSupabase();
  if (sb) {
    sb.from("bookings")
      .delete()
      .in("id", ids)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud booking clear failed, cleared locally", error.message);
      });
  }
  return ids;
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: Booking[] = [];

/** React hook: live list of bookings, newest first. */
export function useBookings(): Booking[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const PAY_METHODS = [
  { id: "gpay", label: "Google Pay", icon: "📱", sub: "UPI — Instant" },
  { id: "paytm", label: "Paytm UPI", icon: "💙", sub: "Paytm / Any UPI" },
  { id: "card", label: "Credit / Debit Card", icon: "💳", sub: "Visa · Mastercard · RuPay" },
  { id: "nb", label: "Net Banking", icon: "🏦", sub: "All major banks" },
  { id: "cash", label: "Pay at Completion", icon: "💵", sub: "Cash or UPI directly" },
] as const;
