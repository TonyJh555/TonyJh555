"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { spend } from "@/lib/wallet";
import { inr } from "@/lib/format";
import {
  awaitingConfirmation,
  confirmPatch,
  confirmSecondsLeft,
} from "@/lib/payment-policy";
import { useLanguage } from "@/components/language-provider";

/**
 * Pay-to-confirm — the moment money actually moves.
 *
 * A customer never pays for a job nobody has taken. The booking is placed for
 * free; the instant a worker accepts, this card appears with a short countdown.
 * Paying locks the job in (and only then does the worker set off). Letting it
 * lapse quietly returns the job to the dispatch queue — so no worker ever
 * travels for a booking that was never paid for.
 */
export function ConfirmPayment({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!awaitingConfirmation(booking)) return null;

  const due = booking.payment?.dueOnAccept ?? 0;
  const left = confirmSecondsLeft(booking, new Date(now));
  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");
  const worker = booking.workerName.split(" ")[0];

  const pay = () => {
    setPaying(true);
    // Simulates the Razorpay round-trip; production waits for the webhook.
    setTimeout(() => {
      updateBooking(booking.id, confirmPatch(booking));
      // Wallet credit is spent here too — not at booking time.
      const wallet = booking.payment?.walletApplied ?? 0;
      if (wallet > 0) spend(wallet, `Booking · ${booking.subService}`);
      sendMessage({
        bookingId: booking.id,
        sender: "system",
        text: `💚 Payment received — booking confirmed. ${worker} is on the way!`,
      });
      setPaying(false);
    }, 900);
  };

  return (
    <div className="mt-3 rounded-2xl border-2 border-good bg-good-light p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-good">
            {ml ? `🎉 ${worker} ജോലി സ്വീകരിച്ചു!` : `🎉 ${worker} accepted your job!`}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink">
            {ml
              ? `സ്ഥിരീകരിക്കാൻ ${inr(due)} അടയ്ക്കൂ. പണം ലഭിച്ചാൽ ഉടൻ ${worker} പുറപ്പെടും.`
              : `Pay ${inr(due)} to confirm. ${worker} sets off the moment it's paid.`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-extrabold ${
            left <= 30 ? "bg-kaam text-white" : "bg-white text-good"
          }`}
        >
          {mins}:{secs}
        </span>
      </div>

      <button
        onClick={pay}
        disabled={paying}
        className="mt-3 w-full rounded-xl bg-good py-3 text-sm font-extrabold text-white shadow-[0_6px_24px_rgba(21,128,61,0.22)] disabled:opacity-60"
      >
        {paying
          ? ml ? "പ്രോസസ്സ് ചെയ്യുന്നു…" : "Processing…"
          : ml ? `${inr(due)} അടച്ച് സ്ഥിരീകരിക്കൂ` : `Pay ${inr(due)} & confirm`}
      </button>

      <p className="mt-2 text-center text-[10px] leading-relaxed text-mid">
        {ml
          ? "സമയം കഴിഞ്ഞാൽ ജോലി അടുത്ത തൊഴിലാളിയിലേക്ക് പോകും — പണം നഷ്ടപ്പെടില്ല."
          : "If the timer runs out the job simply passes to the next worker — you lose nothing."}
      </p>
    </div>
  );
}
