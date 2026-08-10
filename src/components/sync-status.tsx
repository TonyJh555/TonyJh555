"use client";

import { projectRef, useCloudDetail, useCloudStatus, usingDefaultProject } from "@/lib/supabase";

/**
 * Whether bookings and chat are reaching other phones — told to the right
 * person, in words they can act on.
 *
 * There are two audiences and they are not the same. The owner can open the
 * SQL editor and fix a database; a customer looking at their bookings cannot,
 * and telling them to "run the one-time setup SQL" is both frightening and
 * useless. That instruction used to sit at the top of the customer's bookings
 * page and the worker's home screen, blaming a setup step for every possible
 * failure — including the ones where the setup was already done.
 *
 * So: `audience="owner"` gets the diagnosis and the database's own error text.
 * Everyone else gets one quiet, true line about where their data lives, and
 * nothing at all when sync is working.
 */
export function SyncStatus({
  className = "",
  audience = "owner",
}: {
  className?: string;
  audience?: "owner" | "user";
}) {
  const status = useCloudStatus();
  const detail = useCloudDetail();

  if (status === "checking") return null;

  if (status === "online") {
    // The happy path is only worth a line to the person running the company.
    if (audience !== "owner") return null;
    return (
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold text-good ${className}`}>
        <span className="inline-block h-2 w-2 rounded-full bg-good" />
        ☁️ Cross-device sync is ON — bookings &amp; chat reach every phone instantly.
      </div>
    );
  }

  /* ── Not syncing ────────────────────────────────────────────────── */

  // A customer is told the one thing that affects them — their bookings live
  // on this phone — and nothing they cannot do anything about.
  if (audience !== "owner") {
    return (
      <p className={`text-[11px] font-semibold text-mid ${className}`}>
        📱 Saved on this phone. Your bookings won&apos;t appear on another device yet.
      </p>
    );
  }

  const headline =
    status === "setup-needed"
      ? "The database tables haven't been created yet."
      : status === "denied"
        ? "The database refused the request — the tables exist, so this is not a missing schema."
        : "Can't reach the database right now.";

  const fix =
    status === "setup-needed"
      ? "Run supabase/schema.sql in the Supabase SQL Editor, then reload. It is safe to re-run."
      : status === "denied"
        ? "Check the project's URL and publishable key in the deployment's environment variables, and the row-level-security policies on `bookings`."
        : "Check the connection, and that the Supabase project isn't paused.";

  return (
    <div
      className={`rounded-xl border border-warn-mid bg-warn-light px-3 py-2.5 text-[11px] leading-relaxed text-warn ${className}`}
    >
      <p className="font-bold">⚠️ Not syncing across devices — running on this device only.</p>
      <p className="mt-0.5">{headline}</p>
      <p className="mt-0.5">{fix}</p>
      {/* The database's own words. A guess about the cause wastes an
          afternoon; the actual error is what makes this fixable. */}
      {/* Which database this actually is. Without it, "the table is missing"
          and "you are looking at the wrong project" produce the identical
          message, and only one of them is fixed by running the schema again. */}
      <p className="mt-1 font-mono text-[10px] break-words text-mid">
        project: {projectRef()}
        {usingDefaultProject() && (
          <span className="ml-1 font-sans font-bold text-kaam">
            ← built-in fallback. No NEXT_PUBLIC_SUPABASE_URL is set, so this is
            probably not your project. Set it in the deployment&apos;s environment
            variables and redeploy.
          </span>
        )}
      </p>
      {detail && (
        <p className="mt-1 rounded-lg bg-white/60 px-2 py-1 font-mono text-[10px] break-words text-mid">
          {detail}
        </p>
      )}
    </div>
  );
}
