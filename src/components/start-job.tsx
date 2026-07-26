"use client";

import { useState } from "react";
import type { Booking, Worker } from "@/lib/types";
import { updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { clockTime, startCodeMatches } from "@/lib/completion";
import { isMetered } from "@/lib/metered";

/**
 * Starting the job — the worker types the code the customer reads out.
 *
 * This is the whole point of the start code: it proves the worker is actually
 * standing at the customer's door. The button used to print the code on the
 * worker's own screen ("code 7686"), which meant they could tap start from
 * anywhere and the customer's copy proved nothing. The code is now never shown
 * on this side; it is only ever compared against what they type.
 *
 * The clock starts the moment it matches, so the customer is billed from the
 * minute work really began.
 */
export function StartJob({ booking, worker }: { booking: Booking; worker: Worker }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const start = () => {
    if (!startCodeMatches(booking.startCode, code)) {
      setErr("That code doesn't match · കോഡ് ശരിയല്ല");
      setCode("");
      return;
    }
    const startedAt = new Date().toISOString();
    updateBooking(booking.id, { status: "in_progress", startedAt });
    // Both sides get the exact start time on the record.
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text:
        `🔧 OTP verified — work started at ${clockTime(startedAt)}.` +
        (isMetered(booking, worker)
          ? " ⏱ Fair-billing clock is on: the base price covers the first hour; after that you pay only for the minutes actually worked."
          : ""),
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-1 rounded-xl bg-good py-2.5 text-center text-white"
      >
        <span className="block text-sm font-extrabold">✅ Paid — Start job</span>
        <span className="block text-[10px] font-semibold opacity-90">
          ജോലി തുടങ്ങുക · ഉപഭോക്താവിന്റെ കോഡ് ചോദിക്കൂ
        </span>
      </button>
    );
  }

  return (
    <div className="flex-1 rounded-xl border-2 border-good bg-good-light p-3">
      <p className="text-[11px] font-extrabold text-good">
        🔐 Ask the customer for their 4-digit code
        <span className="block font-bold opacity-90">
          ഉപഭോക്താവിനോട് 4 അക്ക കോഡ് ചോദിക്കൂ
        </span>
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
            setErr(null);
          }}
          inputMode="numeric"
          autoFocus
          placeholder="• • • •"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-good"
        />
        <button
          onClick={start}
          disabled={code.length !== 4}
          className="rounded-lg bg-good px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40"
        >
          Start
          <span className="block text-[9px] font-semibold opacity-90">തുടങ്ങൂ</span>
        </button>
      </div>
      {err && <p className="mt-1.5 text-[11px] font-bold text-kaam">{err}</p>}
      <p className="mt-1.5 text-[10px] leading-relaxed text-good/80">
        The clock starts the moment the code matches — enter it when you&apos;re ready to work.
        <span className="block">കോഡ് ശരിയായാൽ ഉടൻ ക്ലോക്ക് തുടങ്ങും.</span>
      </p>
      <button
        onClick={() => {
          setOpen(false);
          setCode("");
          setErr(null);
        }}
        className="mt-1.5 w-full text-center text-[10px] font-bold text-mid"
      >
        Not yet · ഇപ്പോൾ വേണ്ട
      </button>
    </div>
  );
}
