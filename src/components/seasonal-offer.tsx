"use client";

import Link from "next/link";
import { seasonalOffer } from "@/lib/seasonal";

/**
 * Festive offer strip on the home screen — shows the live seasonal deal
 * (Onam, Diwali, Vishu, New Year, monsoon), tied to a real coupon code the
 * customer can copy into checkout. Renders nothing off-season.
 */
export function SeasonalOffer() {
  const offer = seasonalOffer();
  if (!offer) return null;

  return (
    <Link
      href="/app/search"
      className="mb-5 flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-white shadow-pop"
      style={{ background: offer.gradient }}
    >
      <span className="text-2xl">{offer.emoji}</span>
      <span className="flex-1">
        <span className="block text-sm font-extrabold">{offer.name} offer is live</span>
        <span className="block text-[11px] text-white/85">{offer.note}</span>
      </span>
      <span className="shrink-0 rounded-lg border border-white/40 bg-white/15 px-2.5 py-1 font-mono text-xs font-bold tracking-wide">
        {offer.code}
      </span>
    </Link>
  );
}
