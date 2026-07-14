"use client";

import { useState } from "react";
import Link from "next/link";
import { updateBooking, useBookings } from "@/lib/bookings";
import { sendMessage, unreadCount, useChatMessages } from "@/lib/chat";
import { getCategory } from "@/data/categories";
import { getWorker } from "@/data/workers";
import { getTenure } from "@/lib/pricing";
import { formatSchedule, inr } from "@/lib/format";
import { etaMinutes, geocode, haversineKm, jitter } from "@/lib/geo";
import type { Booking, BookingStatus } from "@/lib/types";
import { Card, Tag } from "@/components/ui";
import { LiveMap } from "@/components/live-map";
import { useLanguage } from "@/components/language-provider";

/** Live "worker is on the way" tracker shown for ASAP bookings in progress. */
function TrackWorker({ booking }: { booking: Booking }) {
  const worker = getWorker(booking.workerId);
  const customer = jitter(geocode(booking.address, worker?.city ?? "Kochi"), booking.id, 3);
  const from = jitter(geocode(worker?.city ?? "Kochi"), booking.workerId, 2);
  const km = haversineKm(from, customer);
  const eta = etaMinutes(km);

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between rounded-xl bg-good-light px-3 py-2">
        <p className="text-xs font-bold text-good">
          🚗 {booking.workerName.split(" ")[0]} is on the way
        </p>
        <p className="text-xs font-extrabold text-good">
          ~{eta} min · {km.toFixed(1)} km
        </p>
      </div>
      <LiveMap worker={from} customer={customer} animateWorker arriveSeconds={90} heightClass="h-52" />
    </div>
  );
}

const STATUS_META: Record<BookingStatus, { label: string; color: "yellow" | "blue" | "green" | "red" | "gray" }> = {
  requested: { label: "⏳ Waiting for worker", color: "yellow" },
  accepted: { label: "✅ Time confirmed", color: "blue" },
  in_progress: { label: "🔧 Job in progress", color: "blue" },
  completed: { label: "✅ Completed", color: "green" },
  cancelled: { label: "✕ Cancelled", color: "gray" },
  reschedule: { label: "🕐 Pick a new time", color: "red" },
};

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

/** Shown when the worker can't make the requested slot. */
function ReschedulePicker({ booking }: { booking: Booking }) {
  const [date, setDate] = useState(
    booking.schedule?.when === "scheduled" ? booking.schedule.date : "",
  );
  const [time, setTime] = useState(
    booking.schedule?.when === "scheduled" ? booking.schedule.time : "10:00",
  );

  const propose = () => {
    if (!date) return;
    const schedule = { when: "scheduled" as const, date, time };
    updateBooking(booking.id, { schedule, status: "requested" });
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text: `New time proposed 🕐 ${formatSchedule(schedule)} — waiting for ${booking.workerName.split(" ")[0]} to confirm.`,
    });
  };

  return (
    <div className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-3">
      <p className="mb-2 text-xs font-bold text-warn">
        {booking.workerName.split(" ")[0]} can&apos;t make your requested time. Pick another slot:
      </p>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-2 text-xs outline-none"
        />
        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-line bg-white px-2 py-2 text-xs outline-none"
        >
          {TIME_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={propose}
        disabled={!date}
        className="mt-2 w-full rounded-lg bg-warn py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        Propose New Time →
      </button>
    </div>
  );
}

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
  const chatMessages = useChatMessages();
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
                    {booking.workerName} · {getTenure(booking.tenureId).label}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-info">
                    🕐 {formatSchedule(booking.schedule)}
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

              {(booking.status === "accepted" || booking.status === "in_progress") &&
                (booking.schedule?.when ?? "asap") === "asap" && <TrackWorker booking={booking} />}

              {booking.status !== "cancelled" && (
                <Link
                  href={`/app/chat/${booking.id}`}
                  className="relative mt-3 flex items-center justify-center gap-2 rounded-xl border border-info-mid bg-info-light py-2.5 text-xs font-bold text-info"
                >
                  💬 Chat with {booking.workerName.split(" ")[0]}
                  {unreadCount(chatMessages, booking.id, "user") > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-kaam text-[10px] font-extrabold text-white">
                      {unreadCount(chatMessages, booking.id, "user")}
                    </span>
                  )}
                </Link>
              )}

              {booking.status === "reschedule" && <ReschedulePicker booking={booking} />}

              {booking.status === "completed" && <RatingStars booking={booking} />}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
