"use client";

import { useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";

/**
 * One-time Malayalam nudge. Many Kerala customers read Malayalam more
 * comfortably than English but never find the language toggle — so if the
 * app is in English and they haven't chosen before, gently offer Malayalam
 * once. Dismissed (or switched) forever after.
 */
const KEY = "kaam.langnudge.dismissed.v1";
const listeners = new Set<() => void>();

function readDismissed(): boolean {
  if (typeof window === "undefined") return true; // hide during SSR
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function dismissNudge() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

function useDismissed(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    readDismissed,
    () => true,
  );
}

export function LangNudge() {
  const { lang, setLang } = useLanguage();
  const dismissed = useDismissed();

  if (lang !== "en" || dismissed) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-kaam-mid bg-kaam-light px-4 py-3">
      <span className="text-xl">🌐</span>
      <span className="flex-1 text-xs font-bold text-kaam">
        മലയാളത്തിൽ ഉപയോഗിക്കണോ?
        <span className="block text-[11px] font-semibold text-mid">Prefer Malayalam? Switch anytime.</span>
      </span>
      <button
        onClick={() => {
          setLang("ml");
          dismissNudge();
        }}
        className="rounded-lg bg-kaam px-3 py-1.5 text-xs font-bold text-white"
      >
        മലയാളം
      </button>
      <button onClick={dismissNudge} aria-label="Dismiss" className="text-sm text-dim">
        ✕
      </button>
    </div>
  );
}
