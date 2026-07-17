"use client";

import { useSyncExternalStore } from "react";
import type { LatLng } from "./geo";
import { KERALA_DISTRICTS } from "./geo";

/**
 * The customer's chosen "search from here" location — drives nearest-first
 * ranking across the app (Uber/Swiggy style). Defaults to Kochi and is shared
 * between the home screen and search via a tiny localStorage-backed store.
 */

export interface SearchLocation {
  label: string;
  coords: LatLng;
  /** How we got it, for the UI ("Current location" vs a district vs an address). */
  source: "default" | "gps" | "district" | "address";
}

const STORAGE_KEY = "kaam.searchloc.v1";
const listeners = new Set<() => void>();

const DEFAULT: SearchLocation = {
  label: "Kochi, Ernakulam",
  coords: KERALA_DISTRICTS.find((d) => d.name === "Ernakulam")!.coords,
  source: "default",
};

let cache: SearchLocation | null = null;

function read(): SearchLocation {
  if (typeof window === "undefined") return DEFAULT;
  if (cache === null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as SearchLocation) : DEFAULT;
    } catch {
      cache = DEFAULT;
    }
  }
  return cache;
}

export function setSearchLocation(loc: SearchLocation) {
  cache = loc;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // ignore storage failures — keep in-memory
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Live "search from here" location. */
export function useSearchLocation(): SearchLocation {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
