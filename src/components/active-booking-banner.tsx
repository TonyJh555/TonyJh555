"use client";

import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { getCategory } from "@/data/categories";
import { formatSchedule } from "@/lib/format";
import { awaitingConfirmation } from "@/lib/payment-policy";
import { useLanguage } from "@/components/language-provider";
import type { Booking } from "@/lib/types";

/**
 * The persistent "your order is on the way" strip every top app shows. If the
 * customer has a live booking, surface it on the home screen with a one-tap
 * Track — so an in-flight job is never more than a glance away. Renders
 * nothing when there's nothing active. Bilingual (EN/ML).
 */
function statusLine(b: Booking, ml: boolean): string {
  const asap = (b.schedule?.when ?? "asap") === "asap";
  // A worker has accepted but the customer hasn't paid yet — the most urgent
  // thing they can do, so it wins over every other status line.
  if (awaitingConfirmation(b)) return ml ? "💳 സ്ഥിരീകരിക്കാൻ പണമടയ്ക്കൂ" : "💳 Pay now to confirm";
  switch (b.status) {
    case "requested":
      return ml ? "🔎 തൊഴിലാളിയെ തിരയുന്നു…" : "🔎 Finding your worker…";
    case "accepted":
      return asap
        ? ml ? "🛵 തൊഴിലാളി വരുന്ന വഴിയിൽ" : "🛵 Your worker is on the way"
        : `✅ ${ml ? "സ്ഥിരീകരിച്ചു" : "Confirmed"} · ${formatSchedule(b.schedule)}`;
    case "in_progress":
      return ml ? "🔧 ജോലി നടക്കുന്നു" : "🔧 Work in progress";
    default:
      return ml ? "സജീവ ബുക്കിംഗ്" : "Active booking";
  }
}

export function ActiveBookingBanner() {
  const customer = useCustomer();
  const bookings = useBookings();
  const { lang } = useLanguage();
  const ml = lang === "ml";

  const active = bookings
    .filter(
      (b) =>
        (customer ? b.customerId === customer.id : !b.customerId) &&
        (b.status === "requested" || b.status === "accepted" || b.status === "in_progress"),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!active) return null;
  const cat = getCategory(active.categoryId);

  return (
    <Link
      href="/app/bookings"
      className="mb-4 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-pop"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-good" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{statusLine(active, ml)}</span>
        <span className="block truncate text-[11px] text-white/70">
          {cat.icon} {active.subService} · {active.workerName.split(" ")[0]}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
        {awaitingConfirmation(active) ? (ml ? "അടയ്ക്കൂ →" : "Pay →") : ml ? "ട്രാക്ക് →" : "Track →"}
      </span>
    </Link>
  );
}
