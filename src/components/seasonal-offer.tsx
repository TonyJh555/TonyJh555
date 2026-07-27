"use client";

import Link from "next/link";
import { seasonalOffer } from "@/lib/seasonal";
import { COUPONS_KEY, DEFAULT_COUPONS, type Coupon } from "@/lib/coupons";
import { useContent } from "@/lib/content";
import { useLanguage } from "@/components/language-provider";

/**
 * Festive offer strip on the home screen — Onam, Diwali, Vishu, New Year,
 * monsoon — tied to a coupon the customer can actually use at checkout.
 *
 * It reads the live coupon list, not the built-in one, so switching an offer
 * off in the admin console takes the banner down with it. Promoting a code
 * that checkout then rejects is a worse outcome than showing no offer at all:
 * the customer has already decided to buy by the time they find out.
 */
export function SeasonalOffer() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const saved = useContent<Coupon[]>(COUPONS_KEY, DEFAULT_COUPONS);
  const coupons = Array.isArray(saved) ? saved : DEFAULT_COUPONS;
  const offer = seasonalOffer(new Date(), coupons);
  if (!offer) return null;

  return (
    <Link
      href="/app/search"
      className="mb-5 flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-white shadow-pop"
      style={{ background: offer.gradient }}
    >
      <span className="text-2xl">{offer.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">
          {ml ? `${offer.name} ഓഫർ ലൈവ് ആണ്` : `${offer.name} offer is live`}
        </span>
        {/* The coupon's own wording, so an edited discount is never misquoted. */}
        <span className="block truncate text-[11px] text-white/85">{offer.note}</span>
      </span>
      <span className="shrink-0 rounded-lg border border-white/40 bg-white/15 px-2.5 py-1 font-mono text-xs font-bold tracking-wide">
        {offer.code}
      </span>
    </Link>
  );
}
