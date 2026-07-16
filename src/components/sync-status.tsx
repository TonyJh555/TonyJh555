"use client";

import { useCloudStatus } from "@/lib/supabase";

/**
 * Honest cross-device sync indicator. Tells the user plainly whether bookings,
 * chat and job alerts are travelling between phones — or silently running only
 * on this device because the one-time database setup hasn't been done.
 */
export function SyncStatus({ className = "" }: { className?: string }) {
  const status = useCloudStatus();

  if (status === "checking" || status === "online") {
    // Online is the happy path — a tiny confirmation, no noise.
    if (status === "online") {
      return (
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold text-good ${className}`}>
          <span className="inline-block h-2 w-2 rounded-full bg-good" />
          ☁️ Cross-device sync is ON — bookings & chat reach every phone instantly.
        </div>
      );
    }
    return null;
  }

  // setup-needed / offline — the user needs to know why things aren't syncing.
  return (
    <div
      className={`rounded-xl border border-warn-mid bg-warn-light px-3 py-2.5 text-[11px] leading-relaxed text-warn ${className}`}
    >
      <p className="font-bold">
        ⚠️ Running on this device only — bookings & chat are NOT syncing across phones yet.
      </p>
      <p className="mt-0.5">
        {status === "setup-needed"
          ? "The database tables haven't been created. Run the one-time setup SQL (supabase/schema.sql → Supabase SQL Editor → Run), then reload."
          : "Can't reach the database right now. Check your connection and reload."}
      </p>
    </div>
  );
}
