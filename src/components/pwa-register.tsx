"use client";

import { useEffect } from "react";

/** Registers the KAAM service worker so the PWA can show notifications. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW registration is best-effort — app works without it */
    });
  }, []);
  return null;
}
