"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import type { LatLng } from "./geo";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Saved addresses (Home / Office / Other) — the Swiggy/Zomato staple that
 * makes rebooking one tap. Demo storage is localStorage; production keys
 * these to the customer row in Supabase.
 */

export type AddressLabel = "Home" | "Office" | "Other";

export interface SavedAddress {
  id: string;
  /** Owner — set so addresses sync per-customer across devices. */
  customerId?: string;
  label: AddressLabel;
  /** Optional custom name when label is "Other" (e.g. "Mom's house"). */
  customName?: string;
  line: string; // e.g. "Flat 4B, Panampilly Nagar, Kochi"
  landmark?: string;
  /** Map pin captured when the address was set on the map. */
  coords?: LatLng;
}

const STORAGE_KEY = "kaam.addresses.v1";
const listeners = new Set<() => void>();
let cache: SavedAddress[] | null = null;
let cloudInit = false;

function read(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  if (cache === null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as SavedAddress[]) : [];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(addresses: SavedAddress[]) {
  cache = addresses;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toRow(a: SavedAddress): Row {
  return {
    id: a.id,
    customer_id: a.customerId ?? null,
    label: a.label,
    custom_name: a.customName ?? null,
    line: a.line,
    landmark: a.landmark ?? null,
    coords: a.coords ?? null,
  };
}

function fromRow(r: Row): SavedAddress {
  return {
    id: r.id as string,
    customerId: (r.customer_id as string) ?? undefined,
    label: (r.label as AddressLabel) ?? "Home",
    customName: (r.custom_name as string) ?? undefined,
    line: r.line as string,
    landmark: (r.landmark as string) ?? undefined,
    coords: (r.coords as LatLng) ?? undefined,
  };
}

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("addresses")
      .select("*")
      .order("created_at", { ascending: true });
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
    sb.channel("kaam-addresses")
      .on("postgres_changes", { event: "*", schema: "public", table: "addresses" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // realtime unavailable — cloud still works via manual refetch
  }
}

export function addAddress(input: Omit<SavedAddress, "id">): SavedAddress {
  const address: SavedAddress = { ...input, id: shortId() };
  write([...read(), address]);
  const sb = getSupabase();
  if (sb) {
    sb.from("addresses")
      .insert(toRow(address))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud address insert failed, using local", error.message);
      });
  }
  return address;
}

export function removeAddress(id: string) {
  write(read().filter((a) => a.id !== id));
  const sb = getSupabase();
  if (sb) {
    sb.from("addresses")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud address delete failed, using local", error.message);
      });
  }
}

export function displayName(a: SavedAddress): string {
  return a.label === "Other" && a.customName ? a.customName : a.label;
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: SavedAddress[] = [];

/** All saved addresses in the store (filter by customer in the caller). */
export function useAddresses(): SavedAddress[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Saved addresses for one customer (or unowned local ones when logged out). */
export function addressesFor(all: SavedAddress[], customerId?: string): SavedAddress[] {
  return all.filter((a) => (customerId ? a.customerId === customerId : !a.customerId));
}
