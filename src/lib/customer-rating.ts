import type { Booking } from "./types";

/**
 * A customer's reputation, aggregated from the ratings workers gave them on
 * completed jobs. Powers two-way trust: workers see a customer's rating before
 * accepting, and customers see their own on their account.
 */

export interface CustomerRatingSummary {
  avg: number;
  count: number;
}

export function customerRatingFor(bookings: Booking[], customerId?: string): CustomerRatingSummary {
  if (!customerId) return { avg: 0, count: 0 };
  const rated = bookings.filter(
    (b) => b.customerId === customerId && typeof b.customerRating === "number",
  );
  const count = rated.length;
  const avg = count ? rated.reduce((s, b) => s + (b.customerRating ?? 0), 0) / count : 0;
  return { avg, count };
}
