"use client";

import { useState } from "react";
import { addBooking, updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { useWarrantyDays } from "@/lib/site-settings";
import { revisitFrom, warrantyDaysLeft, warrantyOpen, warrantyUsedPatch } from "@/lib/warranty";
import { handoverBrief } from "@/lib/job-report";
import { useLanguage } from "@/components/language-provider";
import type { Booking } from "@/lib/types";

/**
 * "The same problem came back."
 *
 * The promise that makes a repair marketplace worth using, offered where it is
 * actually needed: on the finished job, for as long as it is covered. One tap
 * books someone to come back, at no cost to the customer.
 *
 * The worker who did it gets the offer first — they know the fault, the house
 * and what they already tried — and the report they wrote travels with it, so
 * whoever attends starts from a real handover rather than a blank page.
 */
export function WarrantyRevisit({ booking }: { booking: Booking }) {
  const ml = useLanguage().lang === "ml";
  const days = useWarrantyDays();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  // The confirmation is checked first on purpose: claiming the revisit marks
  // the original as used, which immediately closes the window — so a check for
  // "still open" above this would make the success message vanish the instant
  // it was earned.
  if (done) {
    return (
      <div className="mt-3 rounded-xl border border-good-mid bg-good-light p-3 text-[11px] leading-relaxed text-good">
        <p className="font-bold">
          ✅ {ml ? "സൗജന്യ സന്ദർശനം ബുക്ക് ചെയ്തു" : "Free revisit booked"}
        </p>
        <p className="mt-0.5">
          {ml
            ? "ആദ്യം ജോലി ചെയ്ത ആൾക്ക് തന്നെയാണ് ആദ്യം അയച്ചത്. നിങ്ങൾ ഒന്നും നൽകേണ്ടതില്ല."
            : "Sent first to the person who did the work. You pay nothing."}
        </p>
      </div>
    );
  }

  if (!warrantyOpen(booking, days)) return null;
  const left = warrantyDaysLeft(booking, days);

  const claim = () => {
    const now = new Date();
    const revisit = revisitFrom(booking, reason, now);
    addBooking(revisit);
    updateBooking(booking.id, warrantyUsedPatch(now));

    // The old job's handover is the brief for the new one.
    const brief = handoverBrief(booking.report);
    sendMessage({
      bookingId: revisit.id,
      sender: "system",
      text:
        `🔁 Free revisit — the same fault came back within ${days} days of ${booking.subService}.` +
        (reason.trim() ? ` Customer says: "${reason.trim()}".` : "") +
        ` The customer pays nothing; KAAM pays the normal payout.` +
        (brief ? `\n📋 Last visit — ${brief}` : ""),
    });
    setDone(true);
  };

  if (!asking) {
    return (
      <button
        onClick={() => setAsking(true)}
        className="mt-3 w-full rounded-xl border border-info-mid bg-info-light py-2.5 text-center"
      >
        <span className="block text-xs font-extrabold text-info">
          🔁 {ml ? "അതേ പ്രശ്നം വീണ്ടും വന്നോ?" : "Same problem came back?"}
        </span>
        <span className="block text-[10px] font-semibold text-info/80">
          {ml
            ? `സൗജന്യമായി വീണ്ടും വരും · ഇനി ${left} ദിവസം കൂടി`
            : `We come back free · ${left} day${left === 1 ? "" : "s"} of cover left`}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border-2 border-info bg-info-light p-3">
      <p className="text-xs font-extrabold text-info">
        🔁 {ml ? "എന്താണ് വീണ്ടും സംഭവിച്ചത്?" : "What came back?"}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink">
        {ml
          ? "ഇതേ തകരാർ ആണെങ്കിൽ വീണ്ടും വരുന്നത് സൗജന്യമാണ്. വേറൊരു പ്രശ്നമാണെങ്കിൽ അത് പുതിയ ബുക്കിംഗ് ആണ്."
          : "If it's the same fault, the visit is free. A different problem is a new booking at the normal price."}
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 120))}
        placeholder={ml ? "ഉദാ: ഫാൻ വീണ്ടും ശബ്ദമുണ്ടാക്കുന്നു" : "e.g. the fan is making the same noise again"}
        className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs outline-none focus:border-info"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={claim}
          className="flex-1 rounded-xl bg-info py-2.5 text-xs font-extrabold text-white"
        >
          {ml ? "സൗജന്യ സന്ദർശനം ബുക്ക് ചെയ്യൂ" : "Book the free revisit"}
        </button>
        <button
          onClick={() => setAsking(false)}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-mid"
        >
          {ml ? "വേണ്ട" : "Back"}
        </button>
      </div>
    </div>
  );
}
