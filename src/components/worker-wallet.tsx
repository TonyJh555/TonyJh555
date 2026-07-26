"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { inr } from "@/lib/format";
import { payoutsAreLive } from "@/lib/payouts";
import { Card } from "@/components/ui";
import {
  availableBalance,
  pendingEarnings,
  instantFee,
  nextSettlement,
  recordWithdrawal,
  useWithdrawals,
  withdrawalsFor,
  type WithdrawalKind,
} from "@/lib/earnings-wallet";

/**
 * Worker earnings wallet — real withdrawable balance + cash-out flow. Cash
 * out to UPI instantly (small fee) or free on the weekly settlement, with a
 * full withdrawal history. Replaces the old alert()-only "instant payout".
 */
export function WorkerWallet({ workerId, bookings }: { workerId: string; bookings: Booking[] }) {
  const list = useWithdrawals();
  const balance = availableBalance(bookings, workerId, list);
  const pending = pendingEarnings(bookings, workerId);
  const history = withdrawalsFor(list, workerId);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [upi, setUpi] = useState("");
  const [kind, setKind] = useState<WithdrawalKind>("instant");
  const [msg, setMsg] = useState("");
  // Money leaving deserves a second, deliberate tap at least as much as money
  // coming in. One tap must never send a worker's earnings anywhere.
  const [confirming, setConfirming] = useState(false);

  const amt = Number(amount) || 0;
  const fee = kind === "instant" ? instantFee(amt) : 0;
  const validUpi = /.+@.+/.test(upi.trim());
  const canWithdraw = amt > 0 && amt <= balance && validUpi;
  const settleDate = nextSettlement().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const live = payoutsAreLive();

  const submit = () => {
    setConfirming(false);
    const entry = recordWithdrawal(bookings, workerId, amt, kind, upi);
    if (!entry) {
      setMsg("Enter a valid amount (within your balance) and a UPI id.");
      return;
    }
    setMsg(
      live
        ? entry.kind === "instant"
          ? `⚡ ${inr(entry.net)} sent to ${entry.upi} — arrives in minutes.`
          : `🗓️ ${inr(entry.net)} scheduled to ${entry.upi} on ${settleDate}, free.`
        : `🧪 Demo only — no money was actually sent. Recorded ${inr(entry.net)} to ${entry.upi}. ` +
          `ഡെമോ മാത്രം — യഥാർത്ഥ പണം അയച്ചിട്ടില്ല.`,
    );
    setAmount("");
    setUpi("");
    setOpen(false);
  };

  return (
    <Card className="overflow-hidden p-0">
      {/* Balance header */}
      <div className="bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] p-4 text-white">
        <p className="text-xs text-white/70">Available to withdraw</p>
        <p className="font-display text-3xl font-extrabold">{inr(balance)}</p>
        {pending > 0 && (
          <p className="mt-1 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold">
            ⏳ {inr(pending)} waiting for the customer&apos;s final payment
            <span className="block opacity-80">
              ഉപഭോക്താവ് അടച്ചാൽ ഉടൻ ഇത് പിൻവലിക്കാം
            </span>
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-white/60">
          Free weekly settlement every Friday · or cash out instantly
        </p>
        <button
          onClick={() => {
            setOpen((o) => !o);
            setMsg("");
            if (!open && !amount) setAmount(String(balance));
          }}
          disabled={balance <= 0}
          className="mt-3 w-full rounded-xl bg-white py-2.5 text-xs font-extrabold text-good disabled:opacity-50"
        >
          {open ? "Close" : "💸 Withdraw earnings"}
        </button>
      </div>

      {open && (
        <div className="p-4">
          <label className="text-[10px] font-bold tracking-wide text-dim uppercase">Amount</label>
          <div className="mt-1 flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="₹0"
              className="flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
            />
            <button
              onClick={() => setAmount(String(balance))}
              className="rounded-xl border border-line bg-surf px-3 text-xs font-bold text-mid"
            >
              All {inr(balance)}
            </button>
          </div>

          <label className="mt-3 block text-[10px] font-bold tracking-wide text-dim uppercase">
            UPI id
          </label>
          <input
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
            placeholder="name@upi"
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setKind("instant")}
              className={`rounded-xl border p-2.5 text-left ${
                kind === "instant" ? "border-kaam bg-kaam-light" : "border-line bg-white"
              }`}
            >
              <p className="text-xs font-bold">⚡ Instant</p>
              <p className="text-[10px] text-mid">
                In minutes · fee {inr(fee)}
              </p>
            </button>
            <button
              onClick={() => setKind("weekly")}
              className={`rounded-xl border p-2.5 text-left ${
                kind === "weekly" ? "border-kaam bg-kaam-light" : "border-line bg-white"
              }`}
            >
              <p className="text-xs font-bold">🗓️ Weekly</p>
              <p className="text-[10px] text-mid">Free · by {settleDate}</p>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-surf px-3 py-2 text-xs">
            <span className="font-semibold text-mid">You&apos;ll receive</span>
            <span className="font-extrabold text-good">{inr(Math.max(0, amt - fee))}</span>
          </div>

          {!live && (
            <p className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-2.5 text-[11px] font-semibold leading-relaxed text-warn">
              ⚠️ Demo — no real money leaves yet.
              <span className="block opacity-90">ഡെമോ — യഥാർത്ഥ പണം ഇപ്പോൾ അയയ്ക്കില്ല.</span>
            </p>
          )}

          {confirming ? (
            <div className="mt-3 rounded-xl border-2 border-kaam bg-kaam-light p-3">
              <p className="text-xs font-extrabold text-kaam">
                Send {inr(Math.max(0, amt - fee))} to {upi.trim()}?
                <span className="block font-bold opacity-90">
                  {inr(Math.max(0, amt - fee))} {upi.trim()}-ലേക്ക് അയയ്ക്കണോ?
                </span>
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-ink">
                Check the UPI id carefully — money sent to a wrong id can&apos;t be recovered.
                <span className="block opacity-80">UPI ഐഡി ശ്രദ്ധിച്ച് പരിശോധിക്കൂ.</span>
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-lg border border-line bg-white py-2 text-xs font-bold text-mid"
                >
                  Back · പിന്നോട്ട്
                </button>
                <button
                  onClick={submit}
                  className="flex-[2] rounded-lg bg-kaam py-2 text-xs font-extrabold text-white"
                >
                  Yes, send it · അതെ, അയയ്ക്കൂ
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={!canWithdraw}
              className="mt-3 w-full rounded-xl bg-kaam py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {kind === "instant" ? "⚡ Cash out now" : "🗓️ Schedule free payout"}
            </button>
          )}
        </div>
      )}

      {msg && !open && (
        <p className="mx-4 mb-4 rounded-xl bg-good-light px-3 py-2 text-[11px] font-semibold text-good">
          {msg}
        </p>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <p className="mb-2 text-[10px] font-bold tracking-wide text-dim uppercase">
            Withdrawal history
          </p>
          <div className="flex flex-col gap-2">
            {history.slice(0, 6).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold">
                    {w.kind === "instant" ? "⚡ Instant" : "🗓️ Weekly"} · {inr(w.net)}
                  </p>
                  <p className="text-[10px] text-dim">
                    {w.upi} · {new Date(w.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {w.fee > 0 ? ` · fee ${inr(w.fee)}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    w.status === "paid" ? "bg-good-light text-good" : "bg-info-light text-info"
                  }`}
                >
                  {w.status === "paid" ? "Paid" : "Scheduled"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
