"use client";

import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { getCategory } from "@/data/categories";
import { formatSchedule } from "@/lib/format";
import { awaitingCustomerAction } from "@/lib/payment-policy";
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
  // A worker has accepted but the customer hasn't settled the price yet — the
  // most urgent thing they can do, so it wins over every other status line.
  if (awaitingCustomerAction(b)) return ml ? "💳 വില കണ്ട് പണമടയ്ക്കൂ" : "💳 Review price & pay";
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

  // Something the customer must do beats something they can merely watch, and
  // it is coloured differently so the difference is visible before it is read.
  const needsYou = awaitingCustomerAction(active);

  return (
    <Link
      href="/app/bookings"
      className={`mb-4 block rounded-2xl px-4 py-4 text-white shadow-pop ${
        needsYou ? "bg-kaam" : "bg-ink"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-good" />
        </span>
        <span className="font-display text-base font-extrabold">{statusLine(active, ml)}</span>
      </span>
      <span className="mt-1 block text-xs text-white/80">
        {cat.icon} {active.subService} · {active.workerName.split(" ")[0]}
      </span>
      <span className="mt-3 block rounded-xl bg-white/15 py-2.5 text-center text-sm font-extrabold">
        {needsYou ? (ml ? "വില കണ്ട് പണമടയ്ക്കൂ →" : "Review price & pay →") : ml ? "ട്രാക്ക് ചെയ്യൂ →" : "Track this job →"}
      </span>
    </Link>
  );
}
