"use client";

import { useState } from "react";
import { updateBooking, useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { addReview, useReviews } from "@/lib/reviews";
import { getCategory } from "@/data/categories";
import { Avatar } from "@/components/ui";

/**
 * Uber-style mandatory rating. A completed booking must be rated (1–5 stars)
 * before the customer can carry on — this is what keeps ratings genuine and
 * surfaces the best workers. Writing a review is optional; the star is not.
 * Cleared bookings fall away one by one until the backlog is empty.
 */
export function MandatoryRating() {
  const customer = useCustomer();
  const bookings = useBookings();
  const reviews = useReviews();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");

  const mine = (b: (typeof bookings)[number]) =>
    customer ? b.customerId === customer.id : !b.customerId;

  // Oldest completed booking of mine with no rating yet.
  const pending = bookings
    .filter(
      (b) =>
        mine(b) &&
        b.status === "completed" &&
        b.rating == null &&
        !reviews.some((r) => r.bookingId === b.id),
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

  if (!pending) return null;

  const cat = getCategory(pending.categoryId);
  const initials = pending.workerName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const submit = () => {
    if (!rating) return;
    updateBooking(pending.id, { rating });
    addReview({
      workerId: pending.workerId,
      bookingId: pending.id,
      customerName: customer?.name ?? "Customer",
      rating,
      text: text.trim() || undefined,
      photos: [],
    });
    setRating(0);
    setHover(0);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-[350] flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-[430px] rounded-t-3xl bg-page p-6 pb-8 text-center sm:rounded-3xl">
        <div className="mx-auto mb-3 flex flex-col items-center">
          <Avatar initials={initials} size={60} />
        </div>
        <h2 className="font-display text-lg font-extrabold text-ink">
          How was {pending.workerName.split(" ")[0]}?
        </h2>
        <p className="mt-0.5 text-xs text-mid">
          {cat.icon} {pending.subService} · please rate to continue
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} stars`}
              className={`text-4xl transition-transform active:scale-90 ${
                star <= (hover || rating) ? "text-amber-500" : "text-line"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        {rating > 0 && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Add a few words (optional)"
            className="mt-4 w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
          />
        )}

        <button
          onClick={submit}
          disabled={!rating}
          className="mt-4 w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-40"
        >
          {rating ? "Submit rating" : "Tap a star to rate"}
        </button>
        <p className="mt-3 text-[10px] text-dim">
          🔒 Ratings keep KAAM workers genuine. Your written review is optional.
        </p>
      </div>
    </div>
  );
}
