"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { inr } from "@/lib/format";
import {
  awaitingCashConfirmation,
  CASH_CONFIRM_MINUTES,
  finalPaidPatch,
  outstandingBalance,
} from "@/lib/payment-policy";
import { sendInvoiceEmail } from "@/lib/invoice";

/**
 * "Did you get the cash?" — the worker's half of a cash settlement.
 *
 * Card and UPI leave a trail KAAM can read; cash does not. If the customer's
 * tap were enough on its own, "I paid him" would settle every dispute in the
 * customer's favour and the worker would have nowhere to go. So the customer
 * declares, and the worker confirms.
 *
 * Deliberately two plain buttons in both languages: this is the screen a
 * worker taps at the end of a long day, standing in someone's doorway.
 */
export function CashReceived({ booking }: { booking: Booking }) {
  const [busy, setBusy] = useState(false);
  if (!awaitingCashConfirmation(booking)) return null;

  const due = outstandingBalance(booking);

  const received = () => {
    setBusy(true);
    updateBooking(booking.id, finalPaidPatch(booking));
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text: `💚 ${booking.workerName.split(" ")[0]} confirmed receiving ${inr(due)} in cash — the job is fully settled.`,
    });
    sendInvoiceEmail({
      booking,
      quote: booking.quote,
      settlement: booking.settlement,
      completedAt: booking.completedAt ?? new Date().toISOString(),
    });
  };

  const notYet = () => {
    setBusy(true);
    // No money moves. The record stays open and our team picks it up.
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text: `⚠️ ${booking.workerName.split(" ")[0]} hasn't received the ${inr(due)} yet. KAAM support will contact both sides — nothing is marked paid.`,
    });
  };

  return (
    <div className="mt-3 rounded-xl border-2 border-warn bg-warn-light p-3">
      <p className="text-xs font-extrabold text-warn">
        💵 Customer says they paid you {inr(due)} in cash
        <span className="block font-bold opacity-90">
          ഉപഭോക്താവ് {inr(due)} പണമായി നൽകിയെന്ന് പറയുന്നു
        </span>
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink">
        Did you receive it? Nothing counts as paid until you say so.
        <span className="block opacity-80">
          നിങ്ങൾക്ക് കിട്ടിയോ? നിങ്ങൾ പറഞ്ഞാൽ മാത്രമേ പണം ലഭിച്ചതായി കണക്കാക്കൂ.
        </span>
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={received}
          disabled={busy}
          className="flex-[2] rounded-xl bg-good py-2.5 text-center text-white disabled:opacity-50"
        >
          <span className="block text-sm font-extrabold">✓ Yes, I got it</span>
          <span className="block text-[10px] font-semibold opacity-90">അതെ, കിട്ടി</span>
        </button>
        <button
          onClick={notYet}
          disabled={busy}
          className="flex-1 rounded-xl border border-kaam-mid bg-white py-2.5 text-center text-kaam disabled:opacity-50"
        >
          <span className="block text-xs font-bold">✗ Not yet</span>
          <span className="block text-[10px] font-semibold opacity-90">ഇല്ല</span>
        </button>
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-warn/80">
        If you don&apos;t answer within {Math.round(CASH_CONFIRM_MINUTES / 60)} hours we&apos;ll settle it
        automatically, so your earnings are never stuck.
        <span className="block">
          {Math.round(CASH_CONFIRM_MINUTES / 60)} മണിക്കൂറിനുള്ളിൽ മറുപടി ഇല്ലെങ്കിൽ സ്വയം തീർപ്പാക്കും.
        </span>
      </p>
    </div>
  );
}
