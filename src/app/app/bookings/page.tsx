"use client";

import { useState } from "react";
import Link from "next/link";
import { updateBooking, useBookings } from "@/lib/bookings";
import { getCategory } from "@/data/categories";
import { getTenure } from "@/lib/pricing";
import { inr } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";
import { Card, Tag } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

const STATUS_META: Record<BookingStatus, { label: string; color: "yellow" | "blue" | "green" | "red" | "gray" }> = {
  requested: { label: "⏳ Finding worker", color: "yellow" },
  accepted: { label: "🚗 Worker on the way", color: "blue" },
  in_progress: { label: "🔧 Job in progress", color: "blue" },
  completed: { label: "✅ Completed", color: "green" },
  cancelled: { label: "✕ Cancelled", color: "gray" },
};

function RatingStars({ booking }: { booking: Booking }) {
  const [hover, setHover] = useState(0);
  if (booking.rating) {
    return (
      <p className="mt-2 text-xs font-semibold text-mid">
        You rated: {"★".repeat(booking.rating)}
        <span className="text-line">{"★".repeat(5 - booking.rating)}</span>
      </p>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-1">
      <span className="mr-1 text-xs font-semibold text-mid">Rate:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => updateBooking(booking.id, { rating: star })}
          className={`text-lg ${star <= hover ? "text-amber-500" : "text-line"}`}
          aria-label={`${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function BookingsPage() {
  const bookings = useBookings();
  const { t } = useLanguage();

  return (
    <main className="px-4 pt-5">
      <h1 className="mb-4 font-display text-xl font-extrabold">{t.myBookings}</h1>

      {bookings.length === 0 && (
        <div className="py-16 text-center">
          <p className="mb-2 text-4xl">📋</p>
          <p className="text-sm font-semibold text-mid">No bookings yet</p>
          <Link href="/app" className="mt-3 inline-block text-sm font-bold text-kaam">
            {t.findWorker} →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((booking) => {
          const category = getCategory(booking.categoryId);
          const status = STATUS_META[booking.status];
          const isActive = booking.status === "requested" || booking.status === "accepted" || booking.status === "in_progress";
          return (
            <Card key={booking.id} className="fade-up">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">
                    {category.icon} {booking.subService}
                  </p>
                  <p className="text-xs text-mid">
                    {booking.workerName} · {getTenure(booking.tenureId).label} ·{" "}
                    {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <Tag color={status.color}>{status.label}</Tag>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <p className="text-sm font-extrabold text-kaam">{inr(booking.quote.totalUserPays)}</p>
                {isActive && (
                  <p className="text-xs font-semibold text-mid">
                    Start code: <span className="font-mono font-bold text-ink">{booking.startCode}</span>
                  </p>
                )}
              </div>

              {booking.status === "completed" && <RatingStars booking={booking} />}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
