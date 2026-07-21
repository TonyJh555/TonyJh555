"use client";

import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { getCategory } from "@/data/categories";
import { formatSchedule } from "@/lib/format";
import type { Booking } from "@/lib/types";

/**
 * The persistent "your order is on the way" strip every top app shows. If the
 * customer has a live booking, surface it on the home screen with a one-tap
 * Track — so an in-flight job is never more than a glance away. Renders
 * nothing when there's nothing active.
 */
function statusLine(b: Booking): string {
  const asap = (b.schedule?.when ?? "asap") === "asap";
  switch (b.status) {
    case "requested":
      return "🔎 Finding your worker…";
    case "accepted":
      return asap ? "🛵 Your worker is on the way" : `✅ Confirmed · ${formatSchedule(b.schedule)}`;
    case "in_progress":
      return "🔧 Work in progress";
    default:
      return "Active booking";
  }
}

export function ActiveBookingBanner() {
  const customer = useCustomer();
  const bookings = useBookings();

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
        <span className="block truncate text-sm font-bold">{statusLine(active)}</span>
        <span className="block truncate text-[11px] text-white/70">
          {cat.icon} {active.subService} · {active.workerName.split(" ")[0]}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Track →</span>
    </Link>
  );
}
