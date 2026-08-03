"use client";

import { useState } from "react";
import { currentRoster } from "@/lib/roster";
import { getCategory } from "@/data/categories";
import { updateBooking, useBookings } from "@/lib/bookings";
import { cancelRefund } from "@/lib/payment-policy";
import { refund } from "@/lib/wallet";
import { sendMessage } from "@/lib/chat";
import { useAwayMap } from "@/lib/availability";
import { usePresence } from "@/lib/presence";
import { dispatchPhase, initialDispatch } from "@/lib/dispatch";
import { suggestWorkers } from "@/lib/worker-status";
import { inr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { Avatar, Stars } from "@/components/ui";
import { WorkerStatusDot } from "@/components/worker-status-dot";
import { useLanguage } from "@/components/language-provider";

/**
 * "Choose another worker" — the customer's escape hatch, and the only way a
 * job ever changes hands.
 *
 * KAAM never reassigns a request behind the customer's back: they picked this
 * person off their reviews and rating. But when that person hasn't replied, or
 * has declined, the customer shouldn't be stuck either. So we suggest who else
 * does this work — free ones first, each with their live status — and they
 * choose. The booking (and its chat) moves with them.
 */
export function ChooseWorker({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const bookings = useBookings();
  const presence = usePresence();
  const away = useAwayMap();
  const [open, setOpen] = useState(false);

  // Only while nobody has committed, and only once the countdown has stopped
  // (before that, the chosen worker still has the offer in their hands). Read
  // the same phase the status card reads, so the two can never disagree about
  // whether the offer is still live.
  const phase = dispatchPhase(booking);
  if (!phase || phase.phase === "offered") return null;

  const exclude = [booking.workerId, ...(booking.dispatch?.passedIds ?? [])];
  const options = suggestWorkers(currentRoster(), booking.categoryId, { presence, away, bookings }, exclude);
  const freeNow = options.filter((o) => o.status.id === "available").length;

  // Thin supply is the honest weakness of letting customers choose their own
  // worker: a catalogue always looks full, a list of people does not. Saying
  // nothing at all is the one unacceptable answer — the customer is left on
  // "keep waiting" with no button and no idea why.
  if (options.length === 0) return <NoOneElse booking={booking} refused={phase.phase === "declined"} />;

  const pick = (workerId: string, workerName: string) => {
    updateBooking(booking.id, {
      workerId,
      workerName,
      dispatch: {
        passedIds: exclude,
        attempt: (booking.dispatch?.attempt ?? 1) + 1,
        offerExpiresAt: initialDispatch(new Date(), booking).offerExpiresAt,
      },
    });
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text: `🔄 You moved this request to ${workerName.split(" ")[0]}. They've been notified — you'll be asked to pay only if they accept.`,
    });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-kaam-mid bg-kaam-light py-2.5 text-xs font-bold text-kaam"
      >
        👥 {ml ? "മറ്റൊരു തൊഴിലാളിയെ തിരഞ്ഞെടുക്കൂ" : "Choose another worker"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surf p-3">
      <p className="text-xs font-extrabold text-ink">
        👥 {ml ? "ഈ ജോലി ചെയ്യുന്ന മറ്റുള്ളവർ" : "Others who do this work"}
      </p>
      {freeNow > 0 ? (
        <p className="mt-0.5 mb-2 text-[11px] text-mid">
          {ml
            ? "ഇപ്പോൾ സ്വതന്ത്രരായവർ ആദ്യം. റേറ്റിംഗ് നോക്കി നിങ്ങൾ തന്നെ തിരഞ്ഞെടുക്കൂ."
            : "Free right now shown first. You choose — we never switch your worker for you."}
        </p>
      ) : (
        // Everyone listed is busy, offline or on leave. Better to say so than
        // to let the customer pick a second name and wait all over again.
        <p className="mt-1 mb-2 rounded-lg border border-warn-mid bg-warn-light p-2 text-[11px] leading-relaxed font-semibold text-warn">
          {ml
            ? "ഇവരാരും ഇപ്പോൾ സ്വതന്ത്രരല്ല — എല്ലാവരും ജോലിയിലോ ഓഫ്‌ലൈനിലോ ആണ്. തിരഞ്ഞെടുത്താൽ കാത്തിരിക്കേണ്ടി വരും."
            : "None of these are free at the moment — they're on a job, offline or on leave. You can still pick one, but expect to wait."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {options.map(({ worker, status }) => (
          <button
            key={worker.id}
            onClick={() => pick(worker.id, worker.name)}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-white p-2.5 text-left"
          >
            <Avatar initials={worker.initials} size={38} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold">{worker.name}</span>
                <WorkerStatusDot status={status} />
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <Stars rating={worker.rating} size={11} />
                <span className="text-[10px] text-dim">({worker.reviewCount})</span>
                <span className="text-[10px] font-semibold text-mid">📍 {worker.distanceKm} km</span>
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-extrabold text-kaam">
              {inr(worker.rate)}/{worker.unit}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setOpen(false)}
        className="mt-2 w-full text-center text-[11px] font-bold text-mid"
      >
        {ml ? "വേണ്ട — കാത്തിരിക്കാം" : "No thanks — I'll keep waiting"}
      </button>
    </div>
  );
}

/**
 * Nobody else does this work nearby — the honest low-supply screen.
 *
 * This is the real cost of letting customers choose their own worker: a
 * catalogue always looks stocked, a list of people can genuinely be empty. The
 * one thing KAAM must never do here is go quiet. Say it plainly, say that no
 * money is involved, and give a way out that costs nothing.
 */
function NoOneElse({ booking, refused }: { booking: Booking; refused: boolean }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const category = getCategory(booking.categoryId);
  // No Malayalam trade names in the catalogue yet, and inventing them here
  // would be worse than the English one Kerala customers already read on the
  // service tiles.
  const trade = category?.label ?? "worker";
  const { amount: refundAmount } = cancelRefund(booking);
  const [confirming, setConfirming] = useState(false);

  const cancel = () => {
    updateBooking(booking.id, {
      status: "cancelled",
      cancelReason: "No other worker available nearby",
    });
    if (refundAmount > 0) {
      refund(refundAmount, `Refund · no ${trade} available`);
    }
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text:
        `Request cancelled — no other ${trade.toLowerCase()} is available nearby right now.` +
        (refundAmount > 0 ? ` ${inr(refundAmount)} refunded to KAAM Cash.` : " Nothing was charged."),
    });
  };

  return (
    <div className="mt-3 rounded-xl border border-line bg-surf p-3">
      <p className="text-xs font-extrabold text-ink">
        🌙 {ml
          ? `അടുത്ത് വേറെ ${trade} ഇപ്പോൾ ഇല്ല`
          : `No other ${trade.toLowerCase()} nearby right now`}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {/* Once they've refused, "we'll tell you when they accept" is a lie —
            there is nobody left to accept. Say the request is finished. */}
        {refused
          ? ml
            ? "അവർ ഇത് സ്വീകരിക്കില്ല, മറ്റാരും ഇപ്പോൾ ലഭ്യമല്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും നോക്കൂ — രാവിലെ കൂടുതൽ പേർ ഓൺലൈനിൽ വരും."
            : "They won't be taking it, and nobody else is available right now. Worth trying again later — more workers come online through the morning."
          : ml
            ? "നിങ്ങളുടെ അഭ്യർത്ഥന ഇപ്പോഴും സജീവമാണ് — അവർ സ്വീകരിച്ചാൽ ഉടൻ അറിയിക്കും. രാവിലെ കൂടുതൽ പേർ ഓൺലൈനിൽ വരും."
            : "Your request is still live — you'll be told the moment they accept. More workers come online through the morning."}
      </p>
      <p className="mt-1.5 text-[11px] font-bold text-good">
        {refundAmount > 0
          ? ml
            ? `✓ ഇപ്പോൾ റദ്ദാക്കിയാൽ ${inr(refundAmount)} പൂർണ്ണമായി തിരികെ ലഭിക്കും.`
            : `✓ Cancel now and you get the full ${inr(refundAmount)} back.`
          : ml
            ? "✓ ഒന്നും ഈടാക്കിയിട്ടില്ല — റദ്ദാക്കുന്നത് സൗജന്യമാണ്."
            : "✓ Nothing has been charged — cancelling costs you nothing."}
      </p>

      {confirming ? (
        <div className="mt-2 flex gap-2">
          <button
            onClick={cancel}
            className="flex-1 rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white"
          >
            {ml ? "അതെ, റദ്ദാക്കൂ" : "Yes, cancel it"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-xl border border-line bg-white py-2.5 text-xs font-bold text-mid"
          >
            {ml ? "വേണ്ട" : "Keep waiting"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-2 w-full rounded-xl border border-line bg-white py-2.5 text-xs font-bold text-mid"
        >
          {ml ? "അഭ്യർത്ഥന റദ്ദാക്കൂ" : "Cancel this request"}
        </button>
      )}
    </div>
  );
}
