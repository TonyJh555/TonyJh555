"use client";

import { useState } from "react";
import type { Booking, Worker } from "@/lib/types";
import { updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { inr } from "@/lib/format";
import { pausePatch, settleBooking, workedMinutes } from "@/lib/metered";
import { completionDue } from "@/lib/payment-policy";
import { sendInvoiceEmail } from "@/lib/invoice";
import {
  awaitingCompletionFrom,
  canRequestCompletion,
  clockTime,
  completionCodeMatches,
  makeCompletionCode,
} from "@/lib/completion";
import { useLanguage } from "@/components/language-provider";
import { useDailyCapMinutes } from "@/lib/site-settings";

/**
 * Two-sided job completion — the closing OTP.
 *
 * Either side declares the work finished; the billing clock stops at that
 * instant (so a slow confirmation can never inflate the bill) and the other
 * side enters a 4-digit code to agree. Both then see the exact minute the job
 * ended, which is the record that protects each of them from the other.
 */
export function CompleteJob({
  booking,
  viewer,
  worker,
}: {
  booking: Booking;
  viewer: "customer" | "worker";
  worker?: Pick<Worker, "unit" | "rate">;
}) {
  const { lang } = useLanguage();
  const capMinutes = useDailyCapMinutes();
  const ml = lang === "ml";
  const [entered, setEntered] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (booking.status !== "in_progress") return null;
  const req = booking.completion;

  const notify = (text: string) => sendMessage({ bookingId: booking.id, sender: "system", text });

  // Declare the work finished — freezes the meter at this exact moment.
  const declare = () => {
    const now = new Date();
    const code = makeCompletionCode();
    const mins = workedMinutes(booking, now);
    updateBooking(booking.id, {
      completion: { by: viewer, at: now.toISOString(), code },
      ...pausePatch(booking, now), // clock stops HERE, not on confirmation
    });
    notify(
      `🏁 ${viewer === "worker" ? "Worker" : "Customer"} marked the work finished at ${clockTime(now.toISOString())} — ` +
        `billing stopped at ${mins} min. The other side enters the 4-digit code to confirm.`,
    );
  };

  const cancel = () => {
    // Wrongly ended → resume the clock from where it froze.
    updateBooking(booking.id, {
      completion: undefined,
      startedAt: new Date().toISOString(),
      pausedAt: undefined,
    });
    notify("↩️ Completion cancelled — the job continues and the clock is running again.");
  };

  // Confirm the other side's declaration → settle and close the job.
  const confirm = () => {
    if (!completionCodeMatches(req, entered)) {
      setErr(ml ? "കോഡ് ശരിയല്ല. വീണ്ടും ചോദിക്കൂ." : "That code doesn't match. Ask them to read it again.");
      return;
    }
    setErr(null);
    setEntered("");
    const endedAt = req!.at;
    const settled = worker ? settleBooking(booking, worker, new Date(endedAt), capMinutes) : null;
    const s = settled?.settlement;
    const due = completionDue(booking, s?.extraUserPays ?? 0);
    updateBooking(booking.id, {
      status: "completed",
      completedAt: endedAt,
      completion: undefined,
      ...(settled ? { quote: settled.quote, settlement: settled.settlement } : {}),
      // `balancePaidAt` is stamped by the payment screen, NOT here — writing it
      // now would mark the extra minutes collected when nobody has paid a rupee.
      ...(booking.payment
        ? {
            payment: {
              ...booking.payment,
              balanceDue: due,
              ...(due === 0 ? { balancePaidAt: endedAt } : {}),
            },
          }
        : {}),
    });
    notify(
      `✅ Both sides confirmed — work completed at ${clockTime(endedAt)}` +
        (s ? ` · ${s.billedMinutes} min billed.` : "."),
    );
    // Nothing left to collect → the job is settled, so invoice it now. When
    // there's a balance the invoice follows the payment (see FinalPayment).
    if (due === 0) {
      sendInvoiceEmail({
        booking,
        quote: settled?.quote,
        settlement: s,
        completedAt: endedAt,
      });
    }
  };

  const box = "mt-3 rounded-xl border border-line bg-surf p-3";

  /* ── A completion is pending ─────────────────────────────────── */
  if (req) {
    const mine = req.by === viewer;
    const other = viewer === "worker" ? (ml ? "ഉപഭോക്താവ്" : "the customer") : ml ? "തൊഴിലാളി" : "the worker";

    if (mine) {
      return (
        <div className={box}>
          <p className="text-xs font-bold text-ink">
            🏁 {ml ? `${clockTime(req.at)}-ന് ജോലി തീർന്നതായി രേഖപ്പെടുത്തി` : `Work marked finished at ${clockTime(req.at)}`}
          </p>
          <p className="mt-1 text-[11px] text-mid">
            {ml
              ? `ബില്ലിംഗ് ക്ലോക്ക് നിന്നു. സ്ഥിരീകരിക്കാൻ ഈ കോഡ് ${other}-ന് വായിച്ചു കൊടുക്കൂ:`
              : `The billing clock has stopped. Read this code to ${other} so they can confirm:`}
          </p>
          <p className="my-2 text-center font-mono text-2xl font-extrabold tracking-[0.4em] text-kaam">
            {req.code}
          </p>
          <button onClick={cancel} className="w-full rounded-lg border border-line bg-white py-2 text-[11px] font-bold text-mid">
            {ml ? "റദ്ദാക്കൂ — ജോലി തുടരുന്നു" : "Cancel — keep working"}
          </button>
        </div>
      );
    }

    if (awaitingCompletionFrom(req, viewer)) {
      return (
        <div className="mt-3 rounded-xl border-2 border-good bg-good-light p-3">
          <p className="text-xs font-extrabold text-good">
            🏁 {req.by === "worker"
              ? ml ? "തൊഴിലാളി ജോലി തീർന്നെന്ന് പറയുന്നു" : "The worker says the work is done"
              : ml ? "ഉപഭോക്താവ് ജോലി തീർന്നെന്ന് പറയുന്നു" : "The customer says the work is done"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink">
            {ml
              ? `${clockTime(req.at)}-ന് ബില്ലിംഗ് നിർത്തി. സമ്മതമാണെങ്കിൽ അവർ കാണിക്കുന്ന 4 അക്ക കോഡ് നൽകൂ.`
              : `Billing stopped at ${clockTime(req.at)}. If you agree, enter the 4-digit code they show you.`}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={entered}
              onChange={(e) => setEntered(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder={ml ? "4 അക്ക കോഡ്" : "4-digit code"}
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-center font-mono tracking-[0.3em] outline-none focus:border-kaam"
            />
            <button
              onClick={confirm}
              disabled={entered.length !== 4}
              className="rounded-lg bg-good px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {ml ? "സ്ഥിരീകരിക്കൂ" : "Confirm"}
            </button>
          </div>
          {err && <p className="mt-1.5 text-[11px] font-semibold text-kaam">{err}</p>}
          <button onClick={cancel} className="mt-2 w-full text-center text-[11px] font-bold text-mid">
            {ml ? "ഇല്ല, ജോലി തീർന്നിട്ടില്ല" : "No — the work isn't finished"}
          </button>
        </div>
      );
    }
  }

  /* ── Offer to end the job ────────────────────────────────────── */
  if (!canRequestCompletion(booking)) return null;

  return (
    <button
      onClick={declare}
      className="mt-3 w-full rounded-xl border border-good-mid bg-good-light py-2.5 text-center"
    >
      <span className="block text-xs font-extrabold text-good">
        🏁 {ml ? "ജോലി തീർന്നു" : "Work is done"}
        {booking.settlement ? "" : ` · ${inr(booking.quote.totalUserPays)}`}
      </span>
      <span className="block text-[10px] font-semibold text-good/80">
        {ml ? "ക്ലോക്ക് ഇപ്പോൾ നിൽക്കും · മറ്റേയാൾ കോഡ് നൽകി സ്ഥിരീകരിക്കും" : "Stops the clock now · the other side confirms with a code"}
      </span>
    </button>
  );
}
