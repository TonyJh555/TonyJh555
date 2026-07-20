"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { updateBooking, useBookings } from "@/lib/bookings";
import { sendMessage, unreadCount, useChatMessages } from "@/lib/chat";
import { getCategory } from "@/data/categories";
import { getWorker } from "@/data/workers";
import { getTenure } from "@/lib/pricing";
import { formatSchedule, inr } from "@/lib/format";
import { etaMinutes, geocode, haversineKm, jitter } from "@/lib/geo";
import { addReview, hasReviewed } from "@/lib/reviews";
import { refund } from "@/lib/wallet";
import { useCustomer } from "@/lib/auth";
import { compressImage } from "@/lib/media";
import type { Booking, BookingStatus } from "@/lib/types";
import { Card, Tag, WorkerCardSkeleton } from "@/components/ui";
import { useCloudStatus } from "@/lib/supabase";
import { LiveMap } from "@/components/live-map";
import { StatusTimeline } from "@/components/status-timeline";
import { JobMeter } from "@/components/job-meter";
import { statusMessage, useTrustedContacts, waLink } from "@/lib/safety";
import { SosButton } from "@/components/sos-button";
import { SyncStatus } from "@/components/sync-status";
import { NotifyToggle } from "@/components/notify-toggle";
import { MyPlans } from "@/components/my-plans";
import { useLanguage } from "@/components/language-provider";

const TIP_OPTIONS = [20, 50, 100];

/**
 * Uber-style "finding your worker" strip: shows who currently holds the
 * offer and the live countdown before dispatch passes it to the next
 * nearest worker (see src/lib/dispatch.ts).
 */
function DispatchStatus({ booking }: { booking: Booking }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const d = booking.dispatch;
  if (!d) return null;
  const left = d.offerExpiresAt
    ? Math.max(0, Math.round((new Date(d.offerExpiresAt).getTime() - now) / 1000))
    : null;
  return (
    <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3 text-[11px] leading-relaxed text-info">
      <p className="font-bold">
        🔎 Offer with {booking.workerName.split(" ")[0]}
        {d.attempt > 1 && ` — nearest available worker (#${d.attempt})`}
      </p>
      <p className="mt-0.5">
        {left === null
          ? "They'll confirm as soon as they're free — we'll keep you posted here and in chat."
          : `No response in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} and we automatically pass your job to the next nearest available worker — you don't have to do a thing.`}
      </p>
    </div>
  );
}

/** Live "worker is on the way" tracker shown for ASAP bookings in progress. */
function TrackWorker({ booking }: { booking: Booking }) {
  const worker = getWorker(booking.workerId);
  const customer =
    booking.coords ?? jitter(geocode(booking.address, worker?.city ?? "Kochi"), booking.id, 3);
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

/** Customer-initiated reschedule of an upcoming booking (worker re-confirms). */
function ChangeTime({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    booking.schedule?.when === "scheduled" ? booking.schedule.date : new Date().toISOString().slice(0, 10),
  );
  const [time, setTime] = useState(
    booking.schedule?.when === "scheduled" ? booking.schedule.time : "10:00",
  );

  const save = () => {
    if (!date) return;
    const schedule = { when: "scheduled" as const, date, time };
    updateBooking(booking.id, { schedule, status: "requested" });
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text: `Customer changed the time 🕐 ${formatSchedule(schedule)} — waiting for ${booking.workerName.split(" ")[0]} to confirm.`,
    });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-line bg-surf py-2.5 text-xs font-bold text-mid"
      >
        🕐 Change time
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3">
      <p className="mb-2 text-xs font-bold text-info">Pick a new time:</p>
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
      <div className="mt-2 flex gap-2">
        <button
          onClick={save}
          disabled={!date}
          className="flex-1 rounded-lg bg-info py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Update time →
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-mid"
        >
          Cancel
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-dim">
        ℹ️ {booking.workerName.split(" ")[0]} will re-confirm the new slot.
      </p>
    </div>
  );
}

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

/**
 * Uber-style "share my trip": send the booking status to family over any app.
 * Deliberately excludes the start code — status + who's coming only.
 */
function ShareStatus({ booking }: { booking: Booking }) {
  const [copied, setCopied] = useState(false);
  const contacts = useTrustedContacts();
  const text = statusMessage(booking);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled the share sheet
    }
  };
  return (
    <div className="mt-3">
      <button
        onClick={share}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surf py-2.5 text-xs font-bold text-mid"
      >
        {copied ? "✅ Copied — paste to family" : "📤 Share status with family"}
      </button>
      {contacts.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {contacts.map((c) => (
            <a
              key={c.id}
              href={waLink(c.phone, text)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-kaam-mid bg-kaam-light px-2.5 py-1.5 text-[10px] font-bold text-kaam"
            >
              💬 WhatsApp {c.name}
            </a>
          ))}
        </div>
      ) : (
        <Link href="/app/safety" className="mt-1.5 block text-center text-[10px] font-bold text-kaam">
          Add trusted contacts for one-tap sharing →
        </Link>
      )}
    </div>
  );
}

const CANCEL_FEE = 50; // convenience fee once a worker has accepted

const CANCEL_REASONS = [
  "Booked by mistake",
  "Found another option",
  "Worker taking too long",
  "Changed my plans",
  "Price too high",
  "Other",
];

/** Cancel an upcoming booking with a clear, upfront refund policy. */
function CancelBooking({ booking }: { booking: Booking }) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const paidOnline = booking.paymentMethod !== "cash";
  const fee = booking.status === "accepted" ? CANCEL_FEE : 0;
  // Refund what was actually collected — an event's 30% advance refunds the
  // advance, not the full booking value.
  const paidSoFar = booking.payment?.paidNow ?? booking.quote.totalUserPays;
  const refundAmount = paidOnline ? Math.max(0, paidSoFar - fee) : 0;

  const cancel = () => {
    updateBooking(booking.id, { status: "cancelled", cancelReason: reason || "Not specified" });
    if (refundAmount > 0) refund(refundAmount, `Refund · cancelled ${booking.subService}`);
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text:
        `Booking cancelled by customer.` +
        (reason ? ` Reason: ${reason}.` : "") +
        (refundAmount > 0 ? ` ${inr(refundAmount)} refunded to KAAM Cash.` : "") +
        (fee > 0 ? ` (₹${fee} late-cancellation fee applied.)` : ""),
    });
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-3 w-full rounded-xl border border-line bg-surf py-2.5 text-xs font-bold text-mid"
      >
        Cancel booking
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-kaam-mid bg-kaam-light p-3">
      <p className="text-xs font-bold text-kaam">Cancel this booking?</p>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {booking.status === "requested"
          ? "Free cancellation — the worker hasn't accepted yet."
          : `A ₹${CANCEL_FEE} convenience fee applies as the worker already accepted.`}
        {paidOnline
          ? ` You'll get ${inr(refundAmount)} back as KAAM Cash.`
          : " No charge — you hadn't paid yet."}
      </p>
      <p className="mt-2 mb-1 text-[10px] font-bold tracking-wide text-dim uppercase">
        Reason (optional)
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setReason(reason === r ? "" : r)}
            className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
              reason === r ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={cancel}
          className="flex-1 rounded-lg bg-kaam py-2 text-xs font-bold text-white"
        >
          Yes, cancel
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg border border-line bg-white py-2 text-xs font-bold text-mid"
        >
          Keep booking
        </button>
      </div>
    </div>
  );
}

/** Full post-job flow: rate, write a review with a photo, and tip. */
function ReviewAndTip({ booking }: { booking: Booking }) {
  const customer = useCustomer();
  const [rating, setRating] = useState(booking.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [tipped, setTipped] = useState<number | null>(null);
  const alreadyReviewed = booking.rating != null || hasReviewed(booking.id);

  const submit = () => {
    if (!rating) return;
    updateBooking(booking.id, { rating });
    addReview({
      workerId: booking.workerId,
      bookingId: booking.id,
      customerName: customer?.name ?? "Customer",
      rating,
      text: text.trim() || undefined,
      photos: photo ? [photo] : [],
    });
  };

  const tip = (amount: number) => {
    setTipped(amount);
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text: `${(customer?.name ?? "Customer").split(" ")[0]} tipped ${inr(amount)} 🙏 100% goes to ${booking.workerName.split(" ")[0]}.`,
    });
  };

  if (alreadyReviewed) {
    return (
      <div className="mt-3 rounded-xl bg-surf p-3">
        <p className="text-xs font-semibold text-mid">
          You rated {booking.workerName.split(" ")[0]}:{" "}
          <span className="text-amber-500">{"★".repeat(booking.rating ?? rating)}</span>
          <span className="text-line">{"★".repeat(5 - (booking.rating ?? rating))}</span>
        </p>
        {tipped == null ? (
          <div className="mt-2">
            <p className="mb-1.5 text-[11px] font-bold text-mid">💛 Tip your worker?</p>
            <div className="flex gap-2">
              {TIP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => tip(amount)}
                  className="flex-1 rounded-lg border border-good-mid bg-good-light py-2 text-xs font-bold text-good"
                >
                  {inr(amount)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs font-bold text-good">
            🙏 Thank you! {inr(tipped)} tip sent to {booking.workerName.split(" ")[0]}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-white p-3">
      <p className="mb-1.5 text-xs font-bold text-ink">How was {booking.workerName.split(" ")[0]}?</p>
      <div className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
            className={`text-2xl ${star <= (hover || rating) ? "text-amber-500" : "text-line"}`}
            aria-label={`${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Share a few words (optional)"
            className="mb-2 w-full resize-none rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
          />
          <div className="mb-2 flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-line bg-surf px-3 py-2 text-xs font-bold text-mid">
              📷 {photo ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhoto(await compressImage(file));
                }}
              />
            </label>
            {photo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photo} alt="Review" className="h-10 w-10 rounded-lg object-cover" />
            )}
          </div>
          <button onClick={submit} className="w-full rounded-lg bg-kaam py-2 text-xs font-bold text-white">
            Submit Review
          </button>
        </>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const allBookings = useBookings();
  const customer = useCustomer();
  const chatMessages = useChatMessages();
  const cloudStatus = useCloudStatus();
  const { t } = useLanguage();

  // In cloud mode the store holds every customer's bookings. Show ONLY mine —
  // when logged in, exact-match my id; when not, only local unowned bookings.
  // This keeps chat (and everything else) tied strictly to my own bookings.
  const bookings = allBookings.filter((b) =>
    customer ? b.customerId === customer.id : !b.customerId,
  );

  return (
    <main className="px-4 pt-5">
      <h1 className="mb-4 font-display text-xl font-extrabold">{t.myBookings}</h1>

      <SyncStatus className="mb-4" />
      {bookings.length > 0 && <NotifyToggle className="mb-4 w-full justify-center" />}

      <MyPlans />

      {bookings.length === 0 && cloudStatus === "checking" && (
        <div className="flex flex-col gap-3">
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
        </div>
      )}

      {bookings.length === 0 && cloudStatus !== "checking" && (
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

              {isActive && (booking.payment?.balanceDue ?? 0) > 0 && !booking.payment?.balancePaidAt && (
                <p className="mt-2 rounded-lg bg-info-light px-2.5 py-1.5 text-[11px] font-bold text-info">
                  💳 Paid now {inr(booking.payment!.paidNow)} · {inr(booking.payment!.balanceDue)}{" "}
                  payable after the job
                </p>
              )}

              {(booking.status === "accepted" || booking.status === "in_progress") &&
                (booking.schedule?.when ?? "asap") === "asap" && <TrackWorker booking={booking} />}

              {booking.status === "requested" && <DispatchStatus booking={booking} />}

              <JobMeter booking={booking} perspective="user" />

              {booking.settlement && booking.settlement.extraMinutes > 0 && (
                <p className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-2.5 text-[11px] leading-relaxed text-warn">
                  ⏱ Fair billing: job ran {booking.settlement.actualMinutes} min — base hour +{" "}
                  {booking.settlement.extraMinutes} min billed by the minute (+
                  {inr(booking.settlement.extraUserPays)} incl. GST). No rounding up to full hours.
                </p>
              )}

              {isActive && <StatusTimeline booking={booking} />}

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

              {(booking.status === "accepted" || booking.status === "in_progress") && (
                <>
                  <SosButton workerName={booking.workerName} />
                  <ShareStatus booking={booking} />
                </>
              )}

              {(booking.status === "requested" || booking.status === "accepted") && (
                <>
                  <ChangeTime booking={booking} />
                  <CancelBooking booking={booking} />
                </>
              )}

              {booking.status === "reschedule" && <ReschedulePicker booking={booking} />}

              {booking.status === "completed" && <ReviewAndTip booking={booking} />}

              {(booking.status === "completed" || booking.status === "cancelled") && (
                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  {booking.status === "completed" && (
                    <Link
                      href={`/app/receipt/${booking.id}`}
                      className="flex-1 rounded-xl border border-line bg-surf py-2.5 text-center text-xs font-bold text-mid"
                    >
                      🧾 Invoice
                    </Link>
                  )}
                  <Link
                    href={`/app/book/${booking.workerId}`}
                    className="flex-1 rounded-xl border border-kaam-mid bg-kaam-light py-2.5 text-center text-xs font-bold text-kaam"
                  >
                    🔁 Book again
                  </Link>
                  <Link
                    href={`/app/support?booking=${booking.id}&category=${booking.status === "cancelled" ? "refund" : "quality"}`}
                    className="flex-1 rounded-xl border border-line bg-surf py-2.5 text-center text-xs font-bold text-mid"
                  >
                    🎧 Report issue
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
