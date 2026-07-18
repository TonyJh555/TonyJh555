"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kaam.pwa.dismissed";

/**
 * "Add KAAM to your home screen" banner. Appears when the browser offers an
 * install (Android/Chrome/Edge); hidden once installed or dismissed.
 */
export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // ignore
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 mx-auto w-full max-w-[430px] px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-pop">
        <span className="text-2xl">📲</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Add KAAM to your home screen</p>
          <p className="text-[11px] text-mid">Faster access, works offline, feels like an app.</p>
        </div>
        <button onClick={install} className="rounded-xl bg-kaam px-4 py-2 text-xs font-bold text-white">
          Install
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="px-1 text-lg text-dim">
          ✕
        </button>
      </div>
    </div>
  );
}
