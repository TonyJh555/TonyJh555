"use client";

import { useState } from "react";
import { PAY_METHODS } from "@/lib/bookings";
import { inr } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

/**
 * The payment step. One tap must never move money.
 *
 * Every charge in KAAM goes through here: choose how you're paying, see the
 * exact amount and who it's for, and confirm. That second, deliberate action
 * is the whole point — a customer should never look back and wonder whether
 * they meant to pay.
 *
 * When no gateway is configured it says so, plainly, on the sheet. A demo that
 * looks identical to a real payment is worse than no demo at all: it teaches
 * you to trust a screen that isn't doing anything.
 */

/** True when a real payment gateway is wired up for this deploy. */
export function paymentsAreLive(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
}

export interface PayLine {
  label: string;
  amount: number;
  /** Shown as a deduction. */
  minus?: boolean;
  /** Emphasised (the total). */
  strong?: boolean;
}

export function PaySheet({
  title,
  subtitle,
  lines,
  total,
  method,
  onMethod,
  onConfirm,
  busy,
  error,
  cashLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  lines: PayLine[];
  total: number;
  /** Omit to hide the method picker (cash jobs). */
  method?: string;
  onMethod?: (id: string) => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string | null;
  /** Button text for a cash job, where nothing is collected online. */
  cashLabel?: string;
  /** Extra content between the amount and the methods (tips, offers…). */
  children?: React.ReactNode;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [confirming, setConfirming] = useState(false);
  const live = paymentsAreLive();
  const online = Boolean(method && onMethod);
  const chosen = PAY_METHODS.find((m) => m.id === method);

  /* ── Step 2: confirm exactly what is about to be charged ───────── */
  if (confirming) {
    return (
      <div className="mt-4">
        <div className="rounded-2xl border-2 border-kaam bg-white p-4">
          <p className="text-center text-[11px] font-extrabold tracking-wider text-mid uppercase">
            {ml ? "പേയ്‌മെന്റ് സ്ഥിരീകരിക്കൂ" : "Confirm payment"}
          </p>
          <p className="mt-1 text-center font-display text-4xl font-extrabold text-kaam">
            {inr(total)}
          </p>
          <p className="mt-1 text-center text-xs text-mid">{title}</p>

          {online && chosen && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-surf p-3">
              <span className="text-xl">{chosen.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold">{chosen.label}</span>
                <span className="block text-[10px] text-mid">{chosen.sub}</span>
              </span>
              <button
                onClick={() => setConfirming(false)}
                className="shrink-0 text-[11px] font-bold text-kaam"
              >
                {ml ? "മാറ്റൂ" : "Change"}
              </button>
            </div>
          )}

          {!live && (
            <p className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-2.5 text-[11px] leading-relaxed font-semibold text-warn">
              ⚠️ {ml
                ? "ഡെമോ പേയ്‌മെന്റ് — യഥാർത്ഥ പണം നീങ്ങില്ല. Razorpay കീകൾ ചേർത്താൽ ഇത് ശരിക്കുള്ള പേയ്‌മെന്റാകും."
                : "Demo payment — no real money will move. This becomes a real charge once Razorpay keys are set."}
            </p>
          )}

          {error && (
            <p className="mt-2 rounded-xl border border-kaam-mid bg-kaam-light p-2.5 text-[11px] font-semibold text-kaam">
              {error}
            </p>
          )}

          <button
            onClick={onConfirm}
            disabled={busy}
            className="mt-3 w-full rounded-2xl bg-kaam py-4 text-base font-extrabold text-white shadow-kaam disabled:opacity-60"
          >
            {busy
              ? ml ? "പ്രോസസ്സ് ചെയ്യുന്നു…" : "Processing…"
              : online
                ? ml ? `${chosen?.label} വഴി ${inr(total)} അടയ്ക്കൂ` : `Pay ${inr(total)} with ${chosen?.label}`
                : (cashLabel ?? (ml ? "സ്ഥിരീകരിക്കൂ" : "Confirm"))}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="mt-2 w-full text-center text-[11px] font-bold text-mid disabled:opacity-40"
          >
            ← {ml ? "പിന്നോട്ട്" : "Back"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 1: what you're paying for ────────────────────────────── */
  return (
    <div className="mt-4">
      <div className="rounded-2xl border-2 border-kaam bg-kaam-light p-4">
        {subtitle && <p className="text-center text-[11px] font-bold text-kaam">{subtitle}</p>}
        <p className="text-center font-display text-4xl font-extrabold text-kaam">{inr(total)}</p>
      </div>

      {lines.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className={l.strong ? "border-t border-line" : ""}>
                <td className={`py-1.5 ${l.strong ? "font-bold text-ink" : "text-mid"}`}>
                  {l.label}
                </td>
                <td
                  className={`py-1.5 text-right tabular-nums ${
                    l.strong ? "font-extrabold" : l.minus ? "font-semibold text-good" : "font-semibold"
                  }`}
                >
                  {l.minus ? "− " : ""}
                  {inr(Math.abs(l.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {children}

      {online && (
        <>
          <p className="mt-3 mb-1.5 text-[11px] font-bold tracking-wide text-dim uppercase">
            {ml ? "എങ്ങനെ അടയ്ക്കും?" : "How would you like to pay?"}
          </p>
          <div className="flex flex-col gap-1.5">
            {PAY_METHODS.filter((m) => m.id !== "cash").map((m) => (
              <button
                key={m.id}
                onClick={() => onMethod?.(m.id)}
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

      {error && (
        <p className="mt-3 rounded-xl border border-kaam-mid bg-kaam-light p-2.5 text-[11px] font-semibold text-kaam">
          {error}
        </p>
      )}

      <button
        onClick={() => setConfirming(true)}
        disabled={busy || total < 0}
        className="mt-4 w-full rounded-2xl bg-kaam py-4 text-base font-extrabold text-white shadow-kaam disabled:opacity-60"
      >
        {online
          ? ml ? `${inr(total)} അടയ്ക്കൂ →` : `Pay ${inr(total)} →`
          : (cashLabel ?? (ml ? "തുടരൂ →" : "Continue →"))}
      </button>
    </div>
  );
}
