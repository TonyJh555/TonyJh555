"use client";

import { useSyncExternalStore } from "react";

/** Light (default) / dark theme, remembered in localStorage. */
export type Theme = "light" | "dark";

const KEY = "kaam.theme";
const listeners = new Set<() => void>();
let cache: Theme | null = null;

function read(): Theme {
  if (typeof window === "undefined") return "light";
  if (cache === null) {
    try {
      cache = (window.localStorage.getItem(KEY) as Theme) || "light";
    } catch {
      cache = "light";
    }
  }
  return cache;
}

export function setTheme(theme: Theme) {
  cache = theme;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  listeners.forEach((fn) => fn());
}

export function toggleTheme() {
  setTheme(read() === "dark" ? "light" : "dark");
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}
