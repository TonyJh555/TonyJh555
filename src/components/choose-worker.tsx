"use client";

import { useState } from "react";
import { WORKERS } from "@/data/workers";
import { updateBooking, useBookings } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { useAwayMap } from "@/lib/availability";
import { usePresence } from "@/lib/presence";
import { initialDispatch } from "@/lib/dispatch";
import { suggestWorkers } from "@/lib/worker-status";
import { inr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { Avatar, Stars } from "@/components/ui";
import { WorkerStatusDot } from "@/components/worker-status-dot";
import { useLanguage } from "@/components/language-provider";

/**
 * "Choose another worker" — the customer's escape hatch, and the only way a
 * job ever changes hands.
 *
 * KAAM never reassigns a request behind the customer's back: they picked this
 * person off their reviews and rating. But when that person hasn't replied, or
 * has declined, the customer shouldn't be stuck either. So we suggest who else
 * does this work — free ones first, each with their live status — and they
 * choose. The booking (and its chat) moves with them.
 */
export function ChooseWorker({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const bookings = useBookings();
  const presence = usePresence();
  const away = useAwayMap();
  const [open, setOpen] = useState(false);

  // Only while nobody has committed, and only once the countdown has stopped
  // (before that, the chosen worker still has the offer in their hands).
  if (booking.status !== "requested") return null;
  if (booking.dispatch?.offerExpiresAt) return null;

  const exclude = [booking.workerId, ...(booking.dispatch?.passedIds ?? [])];
  const options = suggestWorkers(WORKERS, booking.categoryId, { presence, away, bookings }, exclude);
  if (options.length === 0) return null;

  const pick = (workerId: string, workerName: string) => {
    updateBooking(booking.id, {
      workerId,
      workerName,
      dispatch: {
        passedIds: exclude,
        attempt: (booking.dispatch?.attempt ?? 1) + 1,
        offerExpiresAt: initialDispatch().offerExpiresAt,
      },
    });
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text: `🔄 You moved this request to ${workerName.split(" ")[0]}. They've been notified — you'll be asked to pay only if they accept.`,
    });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-kaam-mid bg-kaam-light py-2.5 text-xs font-bold text-kaam"
      >
        👥 {ml ? "മറ്റൊരു തൊഴിലാളിയെ തിരഞ്ഞെടുക്കൂ" : "Choose another worker"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surf p-3">
      <p className="text-xs font-extrabold text-ink">
        👥 {ml ? "ഈ ജോലി ചെയ്യുന്ന മറ്റുള്ളവർ" : "Others who do this work"}
      </p>
      <p className="mt-0.5 mb-2 text-[11px] text-mid">
        {ml
          ? "ഇപ്പോൾ സ്വതന്ത്രരായവർ ആദ്യം. റേറ്റിംഗ് നോക്കി നിങ്ങൾ തന്നെ തിരഞ്ഞെടുക്കൂ."
          : "Free right now shown first. You choose — we never switch your worker for you."}
      </p>

      <div className="flex flex-col gap-2">
        {options.map(({ worker, status }) => (
          <button
            key={worker.id}
            onClick={() => pick(worker.id, worker.name)}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-white p-2.5 text-left"
          >
            <Avatar initials={worker.initials} size={38} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold">{worker.name}</span>
                <WorkerStatusDot status={status} />
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <Stars rating={worker.rating} size={11} />
                <span className="text-[10px] text-dim">({worker.reviewCount})</span>
                <span className="text-[10px] font-semibold text-mid">📍 {worker.distanceKm} km</span>
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-extrabold text-kaam">
              {inr(worker.rate)}/{worker.unit}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setOpen(false)}
        className="mt-2 w-full text-center text-[11px] font-bold text-mid"
      >
        {ml ? "വേണ്ട — കാത്തിരിക്കാം" : "No thanks — I'll keep waiting"}
      </button>
    </div>
  );
}
