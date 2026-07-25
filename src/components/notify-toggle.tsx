"use client";

import { useSyncExternalStore } from "react";
import { ensureNotifyPermission, notifyPermission } from "@/lib/notify";
import { useLanguage } from "@/components/language-provider";

/**
 * "Turn on alerts" chip. Requesting permission must happen from a user gesture,
 * so this is a button rather than an automatic prompt. Hidden once granted.
 */
const noopSubscribe = () => () => {};

export function NotifyToggle({ className = "" }: { className?: string }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const permission = useSyncExternalStore(
    noopSubscribe,
    () => notifyPermission(),
    () => "unsupported" as const,
  );

  if (permission === "unsupported" || permission === "granted") return null;

  return (
    <button
      onClick={() => ensureNotifyPermission()}
      className={`flex items-center gap-1.5 rounded-xl border border-info-mid bg-info-light px-3 py-2 text-[11px] font-bold text-info ${className}`}
    >
      🔔{" "}
      {permission === "denied"
        ? ml ? "അലേർട്ടുകൾ ബ്ലോക്ക് ചെയ്തു — ബ്രൗസർ സെറ്റിംഗ്സിൽ ഓണാക്കൂ" : "Alerts blocked — enable in browser settings"
        : ml ? "ജോലി & സന്ദേശ അലേർട്ടുകൾ ഓണാക്കൂ" : "Turn on job & message alerts"}
    </button>
  );
}
