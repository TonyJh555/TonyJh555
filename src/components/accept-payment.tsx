"use client";

import { useEffect, useState } from "react";
import { PAY_METHODS, updateBooking, useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { sendMessage } from "@/lib/chat";
import { spend, useWallet } from "@/lib/wallet";
import { isMember, memberDiscount, useMembership } from "@/lib/membership";
import { applyCoupon, couponDiscount, type Coupon } from "@/lib/coupons";
import { setPaymentPref } from "@/lib/payment-pref";
import { inr } from "@/lib/format";
import {
  awaitingCustomerAction,
  confirmPatch,
  confirmSecondsLeft,
  policyFor,
} from "@/lib/payment-policy";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { useLanguage } from "@/components/language-provider";

/**
 * Accepted → pay → start code. The middle step of the KAAM booking flow.
 *
 * A customer requests a worker's availability for free. Only when that worker
 * accepts is there a price to review and money to pay — because only then is
 * there a real job. So the price breakdown, the promo code, KAAM Cash and the
 * payment method all live here, after acceptance, not at request time.
 *
 * It is a full-screen gate for the same reason the final payment is: the start
 * code is what lets a worker begin, and it must never be readable by someone
 * who hasn't paid. Nothing here can be scrolled past or dismissed.
 */
export function AcceptPayment() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const bookings = useBookings();
  const customer = useCustomer();
  const wallet = useWallet();
  const membership = useMembership(customer?.id);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [useCash, setUseCash] = useState(true);
  const [method, setMethod] = useState<string>("gpay");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const mine = bookings.filter((b) =>
    customer ? b.customerId === customer.id : !b.customerId,
  );
  // The just-paid booking, so the code can be shown before the gate closes.
  const paid = done ? mine.find((b) => b.id === done) : undefined;
  const booking = paid ?? mine.find(awaitingCustomerAction);
  if (!booking) return null;

  const worker = booking.workerName.split(" ")[0];

  /* ── The code, revealed only once the money is settled ─────────── */
  if (paid) {
    return (
      <Sheet>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-good-light text-3xl">
            ✅
          </div>
          <h2 className="font-display text-xl font-extrabold text-good">
            {ml ? "പേയ്‌മെന്റ് പൂർത്തിയായി!" : "Payment done!"}
          </h2>
          <p className="mt-1 text-xs text-mid">
            {ml
              ? `${worker} ഇപ്പോൾ പുറപ്പെടും. ജോലി തുടങ്ങാൻ ഈ കോഡ് അവർക്ക് നൽകൂ.`
              : `${worker} is setting off now. Give them this code to start the job.`}
          </p>
        </div>
        <div className="mt-4 rounded-2xl border-2 border-kaam bg-kaam-light p-5 text-center">
          <p className="text-[11px] font-bold text-kaam">
            {ml ? "സ്റ്റാർട്ട് കോഡ്" : "Your start code"}
          </p>
          <p className="font-mono text-5xl font-extrabold tracking-[0.3em] text-kaam">
            {booking.startCode}
          </p>
        </div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-mid">
          {ml
            ? "ജോലി തുടങ്ങുമ്പോൾ മാത്രം കോഡ് നൽകൂ — അപ്പോഴാണ് ക്ലോക്ക് തുടങ്ങുന്നത്."
            : "Only share it when they're ready to begin — that's when the clock starts."}
        </p>
        <button
          onClick={() => setDone(null)}
          className="mt-4 w-full rounded-2xl bg-kaam py-3.5 text-sm font-extrabold text-white shadow-kaam"
        >
          {ml ? "മനസ്സിലായി" : "Got it"}
        </button>
      </Sheet>
    );
  }

  /* ── Review the price and pay ──────────────────────────────────── */
  const q = booking.quote;
  const policy = policyFor(booking.categoryId, booking.tenureId);
  const cash = booking.paymentMethod === "cash";
  const due = booking.payment?.dueOnAccept ?? 0;

  const member = isMember(membership);
  const memberOff = member ? memberDiscount(due, true) : 0;
  const couponOff = coupon ? couponDiscount(coupon, Math.max(0, due - memberOff)) : 0;
  const afterOffers = Math.max(0, due - memberOff - couponOff);
  const walletOff = useCash ? Math.min(wallet.balance, afterOffers) : 0;
  const payNow = Math.max(0, afterOffers - walletOff);

  const left = confirmSecondsLeft(booking, new Date(now));
  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");

  const tryCoupon = () => {
    const res = applyCoupon(couponCode, due);
    setCoupon(res.coupon ?? null);
    setCouponMsg(res.message);
  };

  const pay = () => {
    setPaying(true);
    // Simulates the Razorpay/UPI round-trip; production waits for the webhook.
    setTimeout(
      () => {
        updateBooking(
          booking.id,
          confirmPatch(booking, new Date(), {
            memberDiscount: memberOff || undefined,
            couponCode: coupon?.code,
            couponDiscount: couponOff || undefined,
            walletApplied: walletOff || undefined,
          }),
        );
        if (walletOff > 0) spend(walletOff, `Booking · ${booking.subService}`);
        if (!cash) setPaymentPref(method);
        sendMessage({
          bookingId: booking.id,
          sender: "system",
          text: cash
            ? `✅ ${inr(due || q.totalUserPays)} agreed, payable in cash when the work is done. ${worker} is on the way!`
            : `💚 ${inr(payNow)} paid — booking confirmed. ${worker} is on the way!`,
        });
        setPaying(false);
        setDone(booking.id);
      },
      cash ? 300 : 900,
    );
  };

  return (
    <Sheet>
      <div className="text-center">
        <p className="text-[11px] font-extrabold tracking-wider text-good uppercase">
          {ml ? "സ്വീകരിച്ചു" : "Accepted"}
        </p>
        <h2 className="mt-0.5 font-display text-xl font-extrabold">
          🎉 {ml ? `${worker} ജോലി സ്വീകരിച്ചു!` : `${worker} accepted your job!`}
        </h2>
        <p className="mt-1 text-xs text-mid">
          {booking.subService}
          {cash
            ? ml ? " · ജോലി കഴിഞ്ഞ് പണം" : " · pay when the work is done"
            : ml ? " · ഇപ്പോൾ പണം അടച്ച് ഉറപ്പിക്കൂ" : " · pay now to confirm"}
        </p>
        {left > 0 && !cash && (
          <p className="mt-2 inline-block rounded-full bg-warn-light px-3 py-1 font-mono text-xs font-extrabold text-warn">
            {mins}:{secs} {ml ? "ബാക്കി" : "left"}
          </p>
        )}
      </div>

      {/* The price review — deliberately here, after acceptance. */}
      <div className="mt-4">
        <QuoteBreakdown quote={q} />
      </div>
      <p className="mt-2 rounded-xl bg-surf p-2.5 text-[11px] leading-relaxed text-mid">
        {policy.note}
      </p>

      {!cash && (
        <>
          {/* Promo code */}
          <div className="mt-3 rounded-xl border border-line bg-white p-3">
            <p className="mb-1.5 text-[11px] font-bold tracking-wide text-dim uppercase">
              🎟️ {ml ? "പ്രോമോ കോഡ്" : "Promo code"}
            </p>
            {coupon ? (
              <p className="rounded-lg bg-good-light px-3 py-2 text-xs font-bold text-good">
                {coupon.code} {ml ? "പ്രയോഗിച്ചു" : "applied"} · −{inr(couponOff)}
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={ml ? "കോഡ് നൽകൂ" : "Enter code"}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
                />
                <button
                  onClick={tryCoupon}
                  disabled={!couponCode.trim()}
                  className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  {ml ? "പ്രയോഗിക്കൂ" : "Apply"}
                </button>
              </div>
            )}
            {couponMsg && !coupon && (
              <p className="mt-1.5 text-[11px] font-semibold text-kaam">{couponMsg}</p>
            )}
          </div>

          {/* KAAM Cash */}
          {wallet.balance > 0 && (
            <button
              onClick={() => setUseCash((v) => !v)}
              className="mt-2 flex w-full items-center justify-between rounded-xl border border-line bg-white p-3 text-left"
            >
              <span className="text-xs font-bold">
                💰 {ml ? "കാം ക്യാഷ് ഉപയോഗിക്കൂ" : "Use KAAM Cash"}
                <span className="block text-[10px] font-semibold text-mid">
                  {ml ? "ബാലൻസ് " : "Balance "}
                  {inr(wallet.balance)}
                </span>
              </span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 transition-colors ${useCash ? "bg-good" : "bg-line"}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition-transform ${useCash ? "translate-x-4" : ""}`}
                />
              </span>
            </button>
          )}

          {/* Payment method */}
          <p className="mt-3 mb-1.5 text-[11px] font-bold tracking-wide text-dim uppercase">
            {ml ? "എങ്ങനെ അടയ്ക്കും?" : "How would you like to pay?"}
          </p>
          <div className="flex flex-col gap-1.5">
            {PAY_METHODS.filter((m) => m.id !== "cash").map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left ${
                  method === m.id ? "border-kaam bg-kaam-light" : "border-line bg-white"
                }`}
              >
                <span className="text-lg">{m.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{m.label}</span>
                  <span className="block text-[10px] text-mid">{m.sub}</span>
                </span>
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    method === m.id ? "border-kaam bg-kaam" : "border-line"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={pay}
        disabled={paying}
        className="mt-4 w-full rounded-2xl bg-kaam py-4 text-base font-extrabold text-white shadow-kaam disabled:opacity-60"
      >
        {paying
          ? ml ? "പ്രോസസ്സ് ചെയ്യുന്നു…" : "Processing…"
          : cash
            ? ml ? "സമ്മതം — കോഡ് കാണിക്കൂ" : "Agreed — show my code"
            : ml ? `${inr(payNow)} അടയ്ക്കൂ →` : `Pay ${inr(payNow)} →`}
      </button>

      <p className="mt-2.5 text-center text-[10px] leading-relaxed text-dim">
        {cash
          ? ml
            ? "പണം ജോലി കഴിഞ്ഞ് നേരിട്ട് നൽകാം. കോഡ് നൽകിയാൽ മാത്രമേ ജോലി തുടങ്ങൂ."
            : "You'll pay the worker directly when the job is done. Work can only start once you give the code."
          : ml
            ? "പണം അടച്ചാൽ മാത്രമേ സ്റ്റാർട്ട് കോഡ് ലഭിക്കൂ — അതുവരെ ജോലി തുടങ്ങാനാവില്ല."
            : "The start code appears only after payment — nothing can begin before that."}
      </p>
    </Sheet>
  );
}

/** Shared full-screen shell — no back button, no dismiss. */
function Sheet({ children }: { children: React.ReactNode }) {
  return (
    // Below the final-payment gate (z-360) but above the rating sheet (z-350).
    <div className="fixed inset-0 z-[355] flex items-end justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="max-h-full w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
        {children}
      </div>
    </div>
  );
}
