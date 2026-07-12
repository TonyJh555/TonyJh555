"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { getDictionary, LANGS, type Dictionary, type Lang } from "@/lib/i18n";

/** Tiny external store so the saved language survives reloads without
 *  hydration mismatches (server always renders "en"). */
const STORAGE_KEY = "kaam.lang";
const listeners = new Set<() => void>();

function readLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  return saved && LANGS.includes(saved) ? saved : "en";
}

function setLang(next: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore storage failures
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: getDictionary(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-white p-1 shadow-card">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
            lang === l ? "bg-kaam text-white" : "text-mid hover:bg-surf"
          }`}
        >
          {getDictionary(l).name}
        </button>
      ))}
    </div>
  );
}
