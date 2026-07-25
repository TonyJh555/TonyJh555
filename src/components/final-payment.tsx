"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Booking } from "@/lib/types";
import { updateBooking, useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { sendMessage } from "@/lib/chat";
import { inr } from "@/lib/format";
import { clockTime } from "@/lib/completion";
import {
  awaitingCashConfirmation,
  claimCashPatch,
  finalPaidPatch,
  needsFinalPayment,
  outstandingBalance,
} from "@/lib/payment-policy";
import { sendInvoiceEmail } from "@/lib/invoice";
import { useLanguage } from "@/components/language-provider";

/**
 * The final payment screen — mandatory, like a bank or recharge flow.
 *
 * When a job runs past the base hour the extra minutes are real money the
 * customer owes. Until this screen was added the app worked out that amount
 * and then marked it collected in the same breath, so ₹500-odd of overtime
 * simply evaporated and the worker was never paid for minutes they worked.
 *
 * So this is a full-screen gate, not a card that can be scrolled past: it
 * covers the whole app the moment a job closes with a balance, and there is no
 * back button and no dismiss. The customer sees exactly what they're paying
 * for — minutes worked, the per-minute rate, GST — pays, and the app returns.
 *
 * The one door out is support: a customer who genuinely disputes the amount
 * must be able to reach a human, and a dispute is not the same as walking away
 * (the gate is still there when they come back).
 *
 * It shows on My Bookings, where the job lives. Elsewhere the customer gets a
 * bright, tappable banner — opening the app should show the app, not a wall.
 */
export function FinalPayment() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const pathname = usePathname();
  const router = useRouter();
  const bookings = useBookings();
  const customer = useCustomer();
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Watchdog — the button always comes back, whatever went wrong.
  useEffect(() => {
    if (!paying) return;
    const bail = setTimeout(() => {
      setPaying(false);
      setErr("That's taking longer than it should. Tap to try again — nothing has been charged twice.");
    }, 8000);
    return () => clearTimeout(bail);
  }, [paying]);

  const mine = bookings.filter((b) =>
    customer ? b.customerId === customer.id : !b.customerId,
  );
  // Oldest first — clear the longest-standing due before any newer one.
  // A cash job the customer has already declared paid is out of their hands —
  // it's the worker's turn to confirm, so stop holding them here.
  const booking = mine
    .filter((b) => needsFinalPayment(b) && !awaitingCashConfirmation(b))
    .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""))[0];
  if (!booking) return null;

  const due = outstandingBalance(booking);
  const cash = booking.paymentMethod === "cash";
  const worker = booking.workerName.split(" ")[0];
  const s = booking.settlement;

  // Anywhere but My Bookings: a banner they can act on, not a wall.
  if (!(pathname?.startsWith("/app/bookings") ?? false)) {
    return (
      <button
        onClick={() => router.push("/app/bookings")}
        className="fixed inset-x-0 bottom-20 z-[340] mx-auto flex w-full max-w-[430px] items-center gap-3 px-4"
      >
        <span className="flex flex-1 items-center gap-3 rounded-2xl bg-kaam px-4 py-3 text-left text-white shadow-kaam">
          <span className="text-xl">🧾</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-extrabold">
              {ml ? "ജോലി പൂർത്തിയായി — അവസാന പേയ്‌മെന്റ്" : "Work completed — final payment"}
            </span>
            <span className="block truncate text-[11px] text-white/85">
              {booking.subService} · {worker} · {inr(due)}
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-extrabold">
            {ml ? "അടയ്ക്കൂ →" : "Pay →"}
          </span>
        </span>
      </button>
    );
  }

  const pay = () => {
    setPaying(true);
    // Simulates the Razorpay round-trip; production waits for the webhook.
    setTimeout(
      () => {
        try {
          settle();
        } catch {
          setPaying(false);
          setErr(
            ml
              ? "പൂർത്തിയായില്ല. വീണ്ടും ശ്രമിക്കൂ."
              : "That didn't go through. Try again.",
          );
        }
      },
      cash ? 300 : 900,
    );
  };

  /**
   * The money move happens first and alone. Everything after it — the chat
   * note, the invoice email — is best-effort, because a failure there must
   * never leave the customer stuck on "Processing…" with a payment that
   * actually went through.
   */
  const settle = () => {
    if (cash) {
      // KAAM can't see cash change hands, so the customer's word starts the
      // settlement and the worker's word finishes it.
      updateBooking(booking.id, claimCashPatch(booking));
      setPaying(false);
      try {
        sendMessage({
          bookingId: booking.id,
          sender: "system",
          text: `💵 Customer says ${inr(due)} was paid in cash. ${worker}, please confirm you received it.`,
        });
      } catch {
        /* best-effort */
      }
      return;
    }

    updateBooking(booking.id, finalPaidPatch(booking));
    setPaying(false);
    try {
      sendMessage({
        bookingId: booking.id,
        sender: "system",
        text: `💚 Final payment of ${inr(due)} received — the job is fully settled. Thank you!`,
      });
      // The money is in, so now the invoice is the truth. Both sides get it.
      sendInvoiceEmail({
        booking,
        quote: booking.quote,
        settlement: booking.settlement,
        completedAt: booking.completedAt ?? new Date().toISOString(),
      });
    } catch {
      /* best-effort */
    }
  };

  return (
    // Above the mandatory-rating sheet (z-350): pay first, rate after.
    <div className="fixed inset-0 z-[360] flex items-end justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="max-h-full w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
        <p className="text-center text-[11px] font-extrabold uppercase tracking-wider text-mid">
          {ml ? "അവസാന പേയ്‌മെന്റ്" : "Final payment"}
        </p>
        <h2 className="mt-1 text-center font-display text-2xl font-extrabold text-ink">
          {ml ? "ജോലി പൂർത്തിയായി 🎉" : "Work completed 🎉"}
        </h2>
        <p className="mt-1 text-center text-xs text-mid">
          {booking.subService} · {worker}
          {booking.completedAt && ` · ${clockTime(booking.completedAt)}`}
        </p>

        {/* The amount, and exactly where it comes from. */}
        <div className="mt-4 rounded-2xl border-2 border-kaam bg-kaam-light p-4 text-center">
          <p className="text-[11px] font-bold text-kaam">
            {ml ? "ഇനി അടയ്ക്കാനുള്ളത്" : "Amount to pay now"}
          </p>
          <p className="font-display text-4xl font-extrabold text-kaam">{inr(due)}</p>
        </div>

        {s && s.extraMinutes > 0 && (
          <div className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-3 text-[11px] leading-relaxed text-warn">
            ⏱ <b>{ml ? "സത്യസന്ധമായ ബില്ലിംഗ്" : "Fair billing"}:</b>{" "}
            {ml
              ? `ജോലി ${s.actualMinutes} മിനിറ്റ് നീണ്ടു — ബേസ് അവർ + ${s.extraMinutes} മിനിറ്റ് മാത്രം അധികം. മുഴുവൻ മണിക്കൂറായി കൂട്ടിയിട്ടില്ല.`
              : `the job ran ${s.actualMinutes} min — the base hour plus ${s.extraMinutes} min billed by the minute. Never rounded up to a second hour.`}
          </div>
        )}

        <p className="mt-3 rounded-xl bg-surf p-3 text-[11px] leading-relaxed text-mid">
          {cash
            ? ml
              ? `${worker}-ന് നേരിട്ട് പണം നൽകൂ. അവർ ലഭിച്ചെന്ന് സ്ഥിരീകരിച്ചാൽ ഇൻവോയ്സ് ലഭിക്കും.`
              : `Hand the money to ${worker} directly. They'll confirm they received it, and your invoice follows.`
            : ml
              ? `ഈ പണം മുഴുവനും ${worker}-ന്റെ അധ്വാനത്തിനുള്ളതാണ്. അടച്ചാൽ ഉടൻ ഇൻവോയ്സ് ലഭിക്കും.`
              : `This covers the minutes ${worker} actually worked for you. Your invoice is emailed the moment it's paid.`}
        </p>

        {err && (
          <p className="mt-3 rounded-xl border border-kaam-mid bg-kaam-light p-2.5 text-[11px] font-semibold text-kaam">
            {err}
          </p>
        )}

        <button
          onClick={pay}
          disabled={paying}
          className="mt-4 w-full rounded-2xl bg-kaam py-4 text-base font-extrabold text-white shadow-kaam disabled:opacity-60"
        >
          {paying
            ? ml ? "പ്രോസസ്സ് ചെയ്യുന്നു…" : "Processing…"
            : cash
              ? ml ? `${inr(due)} ${worker}-ന് നൽകി ✓` : `I paid ${worker} ${inr(due)} in cash ✓`
              : ml ? `${inr(due)} അടയ്ക്കൂ →` : `Pay ${inr(due)} →`}
        </button>

        <p className="mt-3 text-center text-[10px] leading-relaxed text-dim">
          {ml
            ? "തുക ശരിയല്ലെന്ന് തോന്നുന്നുണ്ടോ? "
            : "Think the amount is wrong? "}
          <Link href={`/app/support?booking=${booking.id}`} className="font-bold text-kaam underline">
            {ml ? "ഞങ്ങളോട് സംസാരിക്കൂ" : "Talk to us"}
          </Link>
          {ml
            ? " — ഞങ്ങൾ പരിശോധിക്കും. തെറ്റാണെങ്കിൽ പൂർണ്ണമായി തിരികെ നൽകും."
            : " — we'll check it, and refund in full if we got it wrong."}
        </p>
      </div>
    </div>
  );
}

/** Small inline nudge on the bookings list, for when the gate is dismissed. */
export function FinalPaymentDue({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const due = outstandingBalance(booking);
  if (due <= 0) return null;
  // Cash already handed over — the ball is in the worker's court now.
  if (awaitingCashConfirmation(booking)) {
    return (
      <p className="mt-2 rounded-lg bg-info-light px-2.5 py-1.5 text-[11px] font-bold text-info">
        {ml
          ? `💵 ${inr(due)} പണമായി നൽകി — ${booking.workerName.split(" ")[0]} സ്ഥിരീകരിക്കാൻ കാത്തിരിക്കുന്നു`
          : `💵 ${inr(due)} paid in cash — waiting for ${booking.workerName.split(" ")[0]} to confirm`}
      </p>
    );
  }
  return (
    <p className="mt-2 rounded-lg bg-kaam-light px-2.5 py-1.5 text-[11px] font-bold text-kaam">
      {ml ? `💳 ${inr(due)} അടയ്ക്കാൻ ബാക്കി` : `💳 ${inr(due)} still to pay for this job`}
    </p>
  );
}
