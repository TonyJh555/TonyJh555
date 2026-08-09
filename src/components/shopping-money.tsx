"use client";

import { useState } from "react";
import { updateBooking } from "@/lib/bookings";
import { inr } from "@/lib/format";
import { compressImage } from "@/lib/media";
import {
  handlesShoppingMoney,
  ledgerSettlement,
  SHOPPING_MONEY,
  shoppingStage,
} from "@/lib/shopping";
import type { Booking } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/**
 * The money on a shopping job, written down by both sides.
 *
 * "Buy For Me" and the errand trips are the only jobs where the worker carries
 * the customer's cash, and the failure mode is quiet: a worker who pays for
 * ₹4,000 of groceries out of their own pocket on a ₹300 trip has made a loan
 * they cannot afford and cannot enforce. Nobody sets out to do that — it
 * happens because the money hadn't arrived and the shop was closing.
 *
 * So the amount is on the screen before the shop, and the arithmetic afterwards
 * is done in the open. The customer enters what they sent, because only they
 * know they sent it; the worker enters the bill and photographs it, because
 * only they were at the till. Neither can write the other's figure. A ledger
 * one person fills in alone is that person's word, which is the argument this
 * is meant to prevent.
 *
 * The change is the number that matters and gets the largest type. The case
 * that gets forgotten — the bill came in over and the worker is owed money
 * back — is the one shown in the alarming colour.
 */
export function ShoppingMoney({
  booking,
  viewer,
}: {
  booking: Booking;
  viewer: "customer" | "worker";
}) {
  const ml = useLanguage().lang === "ml";
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  if (!handlesShoppingMoney(booking.categoryId)) return null;
  if (booking.status === "cancelled") return null;
  // Nothing to send before somebody has agreed to go.
  if (booking.status === "requested") return null;

  const ledger = booking.shopping;
  const stage = shoppingStage(ledger);
  const owed = ledgerSettlement(ledger);
  const rupees = Number(amount);
  const valid = Number.isFinite(rupees) && rupees > 0;

  const recordSent = () => {
    if (!valid) return;
    updateBooking(booking.id, {
      shopping: { ...ledger, sent: Math.round(rupees), sentAt: new Date().toISOString() },
    });
    setAmount("");
  };

  const recordBill = () => {
    if (!valid) return;
    updateBooking(booking.id, {
      shopping: { ...ledger, bill: Math.round(rupees), billAt: new Date().toISOString() },
    });
    setAmount("");
  };

  const attachBill = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const billPhoto = await compressImage(file);
      updateBooking(booking.id, { shopping: { ...ledger, billPhoto } });
    } catch {
      /* a photo the phone can't read must not block the number */
    }
    setBusy(false);
  };

  const settle = () =>
    updateBooking(booking.id, {
      shopping: { ...ledger, settledAt: new Date().toISOString() },
    });

  const money = (
    <input
      value={amount}
      onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
      inputMode="numeric"
      placeholder="₹"
      className="w-24 rounded-lg border border-line bg-white px-2.5 py-2 text-sm font-bold outline-none focus:border-warn"
    />
  );

  return (
    <div className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-3">
      <p className="text-xs font-extrabold text-warn">
        💰 {ml ? SHOPPING_MONEY.titleMl : SHOPPING_MONEY.title}
      </p>

      {/* The rule, while it still matters. Once the money is out it is noise. */}
      {stage === "awaiting_money" &&
        (viewer === "worker" ? (
          <p className="mt-1 text-[11px] font-bold leading-relaxed text-warn">
            {ml ? SHOPPING_MONEY.worker.ml : SHOPPING_MONEY.worker.en}
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {SHOPPING_MONEY.lines.map((line) => (
              <li key={line.en} className="text-[11px] leading-relaxed text-warn">
                · {ml ? line.ml : line.en}
              </li>
            ))}
          </ul>
        ))}

      {/* What each side has written down so far. */}
      {(ledger?.sent || ledger?.bill !== undefined) && (
        <dl className="mt-2 space-y-1 rounded-lg bg-white/70 px-2.5 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] text-mid">{ml ? "അയച്ചത്" : "You sent"}</dt>
            <dd className="text-[11px] font-extrabold text-ink">
              {ledger?.sent ? inr(ledger.sent) : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] text-mid">{ml ? "ബിൽ" : "Shopping bill"}</dt>
            <dd className="text-[11px] font-extrabold text-ink">
              {ledger?.bill !== undefined ? inr(ledger.bill) : "—"}
            </dd>
          </div>
        </dl>
      )}

      {/* The customer's entry. */}
      {viewer === "customer" && !ledger?.sent && (
        <div className="mt-2 flex items-center gap-1.5">
          {money}
          <button
            onClick={recordSent}
            disabled={!valid}
            className="flex-1 rounded-lg bg-warn py-2 text-[11px] font-extrabold text-white disabled:opacity-40"
          >
            {ml ? "ഈ തുക അയച്ചു" : "I sent this much"}
          </button>
        </div>
      )}

      {/* The worker's entry — only once money has actually reached them. */}
      {viewer === "worker" && stage === "shopping" && (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            {money}
            <button
              onClick={recordBill}
              disabled={!valid}
              className="flex-1 rounded-lg bg-warn py-2 text-[11px] font-extrabold text-white disabled:opacity-40"
            >
              {ml ? "ബിൽ തുക രേഖപ്പെടുത്തൂ" : "Record the bill"}
            </button>
          </div>
          <label className="mt-1.5 block cursor-pointer rounded-lg border border-line bg-white py-2 text-center text-[11px] font-bold text-mid">
            📷 {busy
              ? ml ? "ചേർക്കുന്നു…" : "Adding…"
              : ledger?.billPhoto
                ? ml ? "ബില്ലിന്റെ ഫോട്ടോ ചേർത്തു — മാറ്റാം" : "Bill photo added — change it"
                : ml ? "ബില്ലിന്റെ ഫോട്ടോ എടുക്കൂ" : "Photograph the bill"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => attachBill(e.target.files)}
            />
          </label>
        </>
      )}

      {ledger?.billPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ledger.billPhoto}
          alt={ml ? "ബിൽ" : "The bill"}
          className="mt-1.5 max-h-44 w-full rounded-lg border border-line object-contain"
        />
      )}

      {/* The arithmetic, once both figures are in. */}
      {owed && owed.changeDue > 0 && (
        <p className="mt-2 rounded-lg border border-good-mid bg-good-light px-2.5 py-2 text-good">
          <span className="block text-[11px] font-bold">
            {ml ? "തിരികെ കിട്ടാനുള്ള ബാക്കി" : "Change coming back to you"}
          </span>
          <span className="block text-lg font-extrabold">{inr(owed.changeDue)}</span>
        </p>
      )}
      {owed?.workerCovered && (
        <p className="mt-2 rounded-lg border border-kaam bg-white px-2.5 py-2 text-kaam">
          <span className="block text-[11px] font-bold">
            {viewer === "worker"
              ? ml ? "നിങ്ങൾ സ്വന്തം പണം മുടക്കി — തിരികെ കിട്ടണം" : "You covered this yourself — it's owed back to you"
              : ml ? "ബിൽ കൂടുതലായി — ഇത് അവർക്ക് കൊടുക്കണം" : "The bill came in over — this is owed to them"}
          </span>
          <span className="block text-lg font-extrabold">{inr(owed.topUpDue)}</span>
        </p>
      )}

      {stage === "awaiting_settlement" && (
        <button
          onClick={settle}
          className="mt-2 w-full rounded-lg border border-line bg-white py-2 text-[11px] font-extrabold text-ink"
        >
          {owed?.workerCovered
            ? ml ? "കൊടുത്തു കഴിഞ്ഞു" : "Paid them back"
            : ml ? "ബാക്കി കിട്ടി" : "Got the change"}
        </button>
      )}

      {stage === "settled" && (
        <p className="mt-2 text-[11px] font-extrabold text-good">
          ✔ {ml ? "പണത്തിന്റെ കണക്ക് തീർന്നു" : "Money settled"}
        </p>
      )}
    </div>
  );
}
