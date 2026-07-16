"use client";

import { useSyncExternalStore } from "react";
import { ensureNotifyPermission, notifyPermission } from "@/lib/notify";

/**
 * "Turn on alerts" chip. Requesting permission must happen from a user gesture,
 * so this is a button rather than an automatic prompt. Hidden once granted.
 */
const noopSubscribe = () => () => {};

export function NotifyToggle({ className = "" }: { className?: string }) {
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
      🔔 {permission === "denied" ? "Alerts blocked — enable in browser settings" : "Turn on job & message alerts"}
    </button>
  );
}
