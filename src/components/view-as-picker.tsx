"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import type { Worker } from "@/lib/types";

/**
 * "View as" — type a name instead of scrolling 250 options.
 *
 * The demo picker was a native <select> holding every worker on the platform.
 * On a phone that is a full-screen list you thumb through for half a minute to
 * reach a nurse in Kannur, and it gets worse with every worker added. Typing
 * three letters is the whole feature.
 *
 * Matches on name, trade or city, because you are usually looking for "the
 * nurse in Kochi" rather than for a particular person. Enter takes the top
 * result, so a tester never has to aim at anything.
 */

/**
 * How well a worker answers the query — lower sorts first, -1 means no match.
 *
 * Every word has to land somewhere, so "nurse kannur" narrows instead of
 * returning every nurse and everyone in Kannur. The first word decides the
 * order, because that is the one a tester is really searching by.
 */
function score(worker: Worker, terms: string[]): number {
  if (terms.length === 0) return 3;
  const name = worker.name.toLowerCase();
  const trade = getCategory(worker.categoryId).label.toLowerCase();
  const city = worker.city.toLowerCase();
  if (!terms.every((t) => `${name} ${trade} ${city}`.includes(t))) return -1;

  const [first] = terms;
  if (name.startsWith(first)) return 0;
  // A surname or second word is what people type as often as a first name.
  if (name.split(" ").some((part) => part.startsWith(first))) return 1;
  if (name.includes(first)) return 2;
  if (trade.startsWith(first) || city.startsWith(first)) return 3;
  return 4;
}

const SHOWN = 12;

export function ViewAsPicker({
  workerId,
  onPick,
  queueCountFor,
}: {
  workerId: string;
  onPick: (id: string) => void;
  /** Open jobs waiting in that worker's trade, for the 🔔 badge. */
  queueCountFor: (worker: Worker) => number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const current = WORKERS.find((w) => w.id === workerId) ?? WORKERS[0];

  const results = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return WORKERS.map((w) => ({ w, s: score(w, terms) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s || a.w.name.localeCompare(b.w.name))
      .slice(0, SHOWN)
      .map((r) => r.w);
  }, [q]);

  const pick = (id: string) => {
    onPick(id);
    setOpen(false);
    setQ("");
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          // The keyboard should be up before the thumb comes back down.
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="max-w-[62%] truncate rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold"
      >
        🔍 View as: {current.name} ▾
      </button>
    );
  }

  return (
    <div className="w-[70%] rounded-xl border border-white/20 bg-white p-2 text-ink shadow-card">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) pick(results[0].id);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Name, trade or city"
          className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5 text-xs outline-none focus:border-kaam"
        />
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-lg border border-line px-2 py-1.5 text-xs font-bold text-mid"
        >
          ✕
        </button>
      </div>

      <div className="mt-1.5 max-h-64 overflow-y-auto">
        {results.length === 0 ? (
          <p className="px-1 py-3 text-center text-[11px] text-dim">
            Nobody matches “{q.trim()}”.
          </p>
        ) : (
          results.map((w) => {
            const category = getCategory(w.categoryId);
            const waiting = queueCountFor(w);
            return (
              <div
                key={w.id}
                className={`flex items-center gap-1 border-b border-line last:border-0 ${
                  w.id === current.id ? "bg-kaam-light" : ""
                }`}
              >
                <button
                  onClick={() => pick(w.id)}
                  className="min-w-0 flex-1 py-1.5 pl-1 text-left"
                >
                  <span className="block truncate text-[11px] font-bold text-ink">
                    {w.name}
                    {waiting > 0 && <span className="ml-1 text-kaam">{waiting} 🔔</span>}
                  </span>
                  <span className="block truncate text-[10px] text-mid">
                    {category.icon} {category.label} · 📍 {w.city}
                  </span>
                </button>
                {/* Straight to what a customer sees, without booking anything. */}
                <Link
                  href={`/app/worker/${w.id}`}
                  className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-info"
                >
                  profile ↗
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
