"use client";

import { useEffect, useState } from "react";
import { flushOutbox, shouldWarn, stuckMinutes, useOutbox } from "@/lib/outbox";
import { useLanguage } from "@/components/language-provider";

/**
 * "This hasn't saved yet" — said on the screen, to the person it happens to.
 *
 * The failure it reports used to go to console.warn, which on a worker's phone
 * is nowhere at all. Everything looked like it had worked, and then the change
 * quietly reverted.
 *
 * Deliberately not shown the instant a write is queued. Almost every write is
 * pending for a moment, and a box that flashes on every tap is a box people
 * learn to ignore — and the whole value of this one is that it is rare enough
 * to be believed. It waits out the grace period, unless the database has
 * actually refused something, which will not fix itself by waiting.
 *
 * The retry button matters more than the words: it turns "something is wrong"
 * into something the person can do with one thumb while standing in the
 * customer's kitchen.
 */
export function UnsyncedWarning({ className = "" }: { className?: string }) {
  const ml = useLanguage().lang === "ml";
  const outbox = useOutbox();
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);

  // Re-check on a timer: nothing changes in the queue while it waits, so
  // without this the warning would never cross its own threshold.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  // Every table, not just bookings: an unsent care-plan change or support
  // reply is exactly as invisible, and the person is owed the same warning.
  const mine = outbox;
  if (!shouldWarn(mine)) return null;

  const waiting = stuckMinutes(mine);
  const refused = mine.find((w) => w.lastError);

  const retry = async () => {
    setBusy(true);
    await flushOutbox();
    setBusy(false);
  };

  return (
    <div
      className={`rounded-xl border border-warn-mid bg-warn-light p-3 text-warn ${className}`}
    >
      <p className="text-xs font-extrabold">
        ⚠️{" "}
        {ml
          ? `${mine.length} മാറ്റം ഇതുവരെ സേവ് ആയിട്ടില്ല`
          : `${mine.length} change${mine.length === 1 ? "" : "s"} not saved yet`}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed">
        {ml
          ? "ഈ ഫോണിൽ സൂക്ഷിച്ചിട്ടുണ്ട് — ഒന്നും നഷ്ടപ്പെട്ടിട്ടില്ല. പക്ഷേ മറ്റേ ആൾക്ക് ഇത് ഇതുവരെ കാണാൻ കഴിയില്ല."
          : "It's safe on this phone — nothing is lost. But the other person can't see it yet."}
        {waiting > 0 &&
          (ml ? ` ${waiting} മിനിറ്റായി കാത്തിരിക്കുന്നു.` : ` Waiting ${waiting} min.`)}
      </p>
      <button
        onClick={retry}
        disabled={busy}
        className="mt-2 w-full rounded-lg bg-warn py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
      >
        {busy
          ? ml ? "അയയ്ക്കുന്നു…" : "Sending…"
          : ml ? "വീണ്ടും ശ്രമിക്കൂ" : "Try again now"}
      </button>
      {/* The database's own words, kept small. A guess about the cause wastes
          an afternoon; the actual error is what makes it fixable. */}
      {refused?.lastError && (
        <p className="mt-1.5 rounded-lg bg-white/60 px-2 py-1 font-mono text-[10px] break-words text-mid">
          {refused.lastError}
        </p>
      )}
    </div>
  );
}
