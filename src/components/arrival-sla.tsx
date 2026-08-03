"use client";

import { useEffect, useState } from "react";
import { updateBooking, useBookings } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { goodwill, refund } from "@/lib/wallet";
import { inr } from "@/lib/format";
import { findWorker } from "@/lib/roster";
import {
  APOLOGY_CREDIT,
  apologyOwed,
  ARRIVAL_BREACH_MINUTES,
  breachCancelPatch,
  breachRefund,
  DELAY_REASONS,
  delayReason,
  arrivalState,
  minutesLate,
  noticeGivenInTime,
  noticePatch,
  promisedArrival,
  lateStrikes,
  STRIKE_WINDOW_DAYS,
  type DelayReasonId,
} from "@/lib/arrival";
import type { Booking } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/** A ticking clock, shared by both panels. */
function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}

function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}

/**
 * The customer's side of "he said three and came at seven".
 *
 * Three things it must say, in this order: you are not paying for this wait;
 * here is what he told you, if he told you anything; and here is the way out
 * if you've had enough. The way out only appears after a full hour, because
 * offering it at twenty minutes would end perfectly good jobs over traffic.
 */
export function ArrivalWatch({ booking }: { booking: Booking }) {
  const ml = useLanguage().lang === "ml";
  const now = useNow();
  const [done, setDone] = useState<null | { apologised: boolean }>(null);
  const worker = findWorker(booking.workerId);
  const all = useBookings();
  const first = booking.workerName.split(" ")[0];

  if (done) {
    return (
      <div className="mt-3 rounded-xl border border-good-mid bg-good-light p-3 text-[11px] leading-relaxed text-good">
        <p className="font-extrabold">
          ✅ {ml ? "ബുക്കിംഗ് റദ്ദാക്കി — പണം മുഴുവൻ തിരികെ" : "Cancelled — everything refunded"}
        </p>
        <p className="mt-0.5">
          {done.apologised
            ? ml
              ? `ഒപ്പം ${inr(APOLOGY_CREDIT)} KAAM ക്യാഷ് — കാത്തിരുന്നതിന് ഞങ്ങളുടെ ക്ഷമാപണം. ഇത് തൊഴിലാളിയിൽ നിന്നല്ല, KAAM നൽകുന്നതാണ്.`
              : `Plus ${inr(APOLOGY_CREDIT)} KAAM Cash — our apology for the wait. It comes from KAAM, not from the worker.`
            : ml
              ? "അടച്ച പണം മുഴുവൻ തിരികെ ലഭിച്ചു."
              : "Every rupee you paid has been returned."}
        </p>
      </div>
    );
  }

  const state = arrivalState(booking, worker, now);
  if (state === "unknown" || state === "on_time") return null;

  const late = minutesLate(booking, worker, now);
  const promised = promisedArrival(booking, worker);
  const notice = booking.arrivalNotice;
  const breached = state === "breached";

  // Paid when the worker earned a strike for it, and not more than once a
  // month — see apologyOwed. The cancellation itself is always free.
  const apologised = apologyOwed(booking, worker, all, now);

  const giveUp = () => {
    const back = breachRefund(booking);
    updateBooking(booking.id, breachCancelPatch(now, apologised));
    if (back > 0 && booking.paymentMethod !== "cash") {
      refund(back, `Refund · ${first} did not arrive for ${booking.subService}`);
    }
    // KAAM's own apology, not a fine taken off the worker.
    if (apologised) goodwill(APOLOGY_CREDIT, "Sorry you were kept waiting — from KAAM");
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text:
        `⚠️ ${first} had not arrived ${hhmm(late)} after the promised time, so the customer cancelled. ` +
        `Everything paid has been refunded${back > 0 ? ` (${inr(back)})` : ""}` +
        (apologised ? `, and KAAM has credited the customer ${inr(APOLOGY_CREDIT)}.` : "."),
    });
    setDone({ apologised });
  };

  return (
    <div
      className={`mt-3 rounded-xl border p-3 text-[11px] leading-relaxed ${
        breached ? "border-kaam-mid bg-kaam-light text-kaam" : "border-warn-mid bg-warn-light text-warn"
      }`}
    >
      <p className="font-extrabold">
        {breached ? "⚠️" : "🕐"}{" "}
        {ml ? `${first} ${hhmm(late)} വൈകി` : `${first} is ${hhmm(late)} late`}
        {promised && (
          <span className="block font-semibold opacity-90">
            {ml ? "പറഞ്ഞ സമയം: " : "Promised: "}
            {promised.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
        )}
      </p>

      {/* What he actually said, if anything. A worker who warned you is a
          different situation to one who vanished, and the screen should not
          make them look the same. */}
      {notice ? (
        <p className="mt-1.5 rounded-lg border border-line bg-white px-2.5 py-2 font-semibold text-ink">
          💬 {delayReason(notice.reason, ml)}
          {notice.minutes ? (ml ? ` · ഏകദേശം ${notice.minutes} മിനിറ്റ് കൂടി` : ` · about ${notice.minutes} more minutes`) : ""}
        </p>
      ) : (
        <p className="mt-1">
          {ml
            ? `${first} ഇതുവരെ ഒന്നും അറിയിച്ചിട്ടില്ല.`
            : `${first} hasn't sent word yet.`}
        </p>
      )}

      <p className="mt-1.5">
        {ml
          ? "കാത്തിരിക്കുന്ന സമയത്തിന് നിങ്ങൾ ഒന്നും നൽകുന്നില്ല — ബില്ലിംഗ് തുടങ്ങുന്നത് അവർ എത്തി കോഡ് നൽകുമ്പോൾ മാത്രം."
          : "You are not paying for this wait — billing only starts when they arrive and enter your code."}
      </p>

      {breached && (
        <button
          onClick={giveUp}
          className="mt-2.5 w-full rounded-lg bg-kaam py-2.5 text-[11px] font-extrabold text-white"
        >
          {ml ? "മതി — റദ്ദാക്കി പണം തിരികെ വാങ്ങൂ" : "Enough — cancel and get everything back"}
          <span className="block text-[10px] font-semibold opacity-90">
            {apologised
              ? ml
                ? `മുഴുവൻ റീഫണ്ട് + ${inr(APOLOGY_CREDIT)} KAAM ക്യാഷ്`
                : `Full refund + ${inr(APOLOGY_CREDIT)} KAAM Cash`
              : ml
                ? "മുഴുവൻ റീഫണ്ട്"
                : "Full refund"}
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * The worker's side, and the reason this is an SLA rather than a whip.
 *
 * It appears *before* they are late, not after, and the one action on it
 * protects them: a delay sent before the promised time means the job never
 * counts against their record, whatever the reason and however late they end
 * up being. Nobody is fined for the monsoon. What is asked is a message.
 */
export function ArrivalPromise({ booking }: { booking: Booking }) {
  const ml = useLanguage().lang === "ml";
  const now = useNow(15_000);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DelayReasonId | null>(null);
  const [minutes, setMinutes] = useState(15);
  const worker = findWorker(booking.workerId);

  if (booking.status !== "accepted") return null;
  const promised = promisedArrival(booking, worker);
  if (!promised) return null;

  const late = minutesLate(booking, worker, now);
  const toGo = Math.round((promised.getTime() - now.getTime()) / 60_000);
  const notice = booking.arrivalNotice;
  const covered = noticeGivenInTime(booking, worker);

  // Nothing to say while there is still comfortable time in hand.
  if (!notice && toGo > 30) return null;

  const send = () => {
    if (!reason) return;
    updateBooking(booking.id, noticePatch(reason, reason === "customer_absent" ? undefined : minutes, now));
    sendMessage({
      bookingId: booking.id,
      sender: "worker",
      text:
        reason === "customer_absent"
          ? `📍 I've reached ${booking.address ?? "your address"} but nobody is answering. Please call me.`
          : `🕐 ${delayReason(reason)} — I'll be about ${minutes} minutes later than ${promised.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}. Sorry.`,
    });
    setOpen(false);
  };

  if (notice) {
    return (
      <div className="mt-2 rounded-xl border border-good-mid bg-good-light p-2.5 text-[11px] leading-relaxed text-good">
        <p className="font-extrabold">
          ✅ {ml ? "ഉപഭോക്താവിനെ അറിയിച്ചു" : "The customer has been told"}
        </p>
        <p className="mt-0.5 text-ink">
          {delayReason(notice.reason, ml)}
          {notice.minutes ? (ml ? ` · ${notice.minutes} മിനിറ്റ് കൂടി` : ` · ${notice.minutes} more minutes`) : ""}
        </p>
        {covered && (
          <p className="mt-1 font-semibold">
            {ml
              ? "സമയത്തിന് മുൻപ് അറിയിച്ചതിനാൽ ഇത് നിങ്ങളുടെ റെക്കോർഡിൽ വരില്ല."
              : "You sent it before the promised time, so this job won't count against your record."}
          </p>
        )}
      </div>
    );
  }

  if (open) {
    return (
      <div className="mt-2 rounded-xl border-2 border-warn bg-warn-light p-3">
        <p className="text-xs font-extrabold text-warn">
          🕐 {ml ? "എന്താണ് പറ്റിയത്?" : "What's holding you up?"}
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
          {DELAY_REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              className={`rounded-xl border px-3 py-2 text-left text-[11px] font-bold ${
                reason === r.id ? "border-warn bg-warn text-white" : "border-line bg-white text-ink"
              }`}
            >
              {ml ? r.labelMl : r.label}
            </button>
          ))}
        </div>

        {reason && reason !== "customer_absent" && (
          <div className="mt-2.5">
            <p className="text-[11px] font-bold text-ink">
              {ml ? "എത്ര മിനിറ്റ് കൂടി വേണം?" : "How many more minutes?"}
            </p>
            <div className="mt-1.5 flex gap-1.5">
              {[10, 15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`flex-1 rounded-lg border py-2 text-[11px] font-extrabold ${
                    minutes === m ? "border-warn bg-warn text-white" : "border-line bg-white text-mid"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2.5 flex gap-2">
          <button
            onClick={send}
            disabled={!reason}
            className="flex-1 rounded-xl bg-warn py-2.5 text-[11px] font-extrabold text-white disabled:opacity-40"
          >
            {ml ? "ഉപഭോക്താവിനെ അറിയിക്കൂ" : "Tell the customer"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-[11px] font-bold text-mid"
          >
            {ml ? "വേണ്ട" : "Back"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-2 rounded-xl border p-2.5 text-[11px] leading-relaxed ${
        late > 0 ? "border-warn-mid bg-warn-light text-warn" : "border-info-mid bg-info-light text-info"
      }`}
    >
      <p className="font-extrabold">
        🕐{" "}
        {late > 0
          ? ml
            ? `നിങ്ങൾ ${hhmm(late)} വൈകി`
            : `You're ${hhmm(late)} past the promised time`
          : ml
            ? `${toGo} മിനിറ്റിനുള്ളിൽ എത്തണം`
            : `Due there in ${toGo} min`}
      </p>
      <p className="mt-0.5 text-ink">
        {ml
          ? `${ARRIVAL_BREACH_MINUTES} മിനിറ്റ് വൈകിയാൽ ഉപഭോക്താവിന് റദ്ദാക്കാം. പക്ഷേ സമയത്തിന് മുൻപ് അറിയിച്ചാൽ അത് നിങ്ങളുടെ റെക്കോർഡിൽ വരില്ല — കാരണം ഏതായാലും.`
          : `Past ${ARRIVAL_BREACH_MINUTES} minutes the customer can cancel. But if you tell them before the promised time, it never counts against your record — whatever the reason.`}
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-lg bg-white py-2 text-[11px] font-extrabold text-warn shadow-card"
      >
        {ml ? "വൈകുമെന്ന് അറിയിക്കൂ →" : "Tell them I'm running late →"}
      </button>
    </div>
  );
}

/**
 * The worker's own punctuality record.
 *
 * Shown to them, in their own app, all the time — not produced as evidence
 * after they have already been downranked. A consequence nobody saw coming is
 * the complaint that follows gig platforms around, and it is entirely
 * avoidable: put the number on the screen while it can still be changed.
 *
 * A clean record is worth saying out loud too. Most workers have one, and a
 * panel that only ever appears to accuse is a panel workers learn to dread.
 */
export function PunctualityRecord({
  worker,
  bookings,
}: {
  worker: { id: string; etaMinutes: number };
  bookings: Booking[];
}) {
  const ml = useLanguage().lang === "ml";
  const strikes = lateStrikes(bookings, worker.id, worker);

  if (strikes.length === 0) {
    return (
      <div className="mb-5 rounded-2xl border border-good-mid bg-good-light p-3 text-[11px] leading-relaxed text-good">
        <p className="font-extrabold">
          ⏱ {ml ? "സമയനിഷ്ഠ: കുറ്റമറ്റത്" : "Punctuality: clean"}
        </p>
        <p className="mt-0.5 text-ink">
          {ml
            ? `കഴിഞ്ഞ ${STRIKE_WINDOW_DAYS} ദിവസത്തിൽ വൈകി എത്തിയ ജോലികളില്ല. വൈകുമെന്ന് സമയത്തിന് മുൻപ് അറിയിച്ചാൽ അത് ഒരിക്കലും ഇവിടെ വരില്ല.`
            : `No late arrivals in the last ${STRIKE_WINDOW_DAYS} days. Telling a customer before the promised time keeps a job off this list, however late you end up.`}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-warn-mid bg-warn-light p-3 text-[11px] leading-relaxed text-warn">
      <p className="font-extrabold">
        ⏱ {ml
          ? `${strikes.length} ജോലിക്ക് വൈകി എത്തി — അറിയിച്ചതുമില്ല`
          : `${strikes.length} late arrival${strikes.length === 1 ? "" : "s"} with no warning sent`}
      </p>
      <p className="mt-0.5 text-ink">
        {ml
          ? `കഴിഞ്ഞ ${STRIKE_WINDOW_DAYS} ദിവസത്തിൽ. വൈകുന്നത് പ്രശ്നമല്ല — പറയാതിരിക്കുന്നതാണ്. അടുത്ത തവണ പുറപ്പെടും മുൻപ് ഒരു സന്ദേശം അയച്ചാൽ മതി.`
          : `In the last ${STRIKE_WINDOW_DAYS} days. Being late isn't the problem — saying nothing is. One message before the promised time is all it takes.`}
      </p>
      <ul className="mt-1.5 space-y-0.5 text-[10px] font-semibold text-mid">
        {strikes.slice(0, 3).map((b) => (
          <li key={b.id}>
            · {b.subService} — {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </li>
        ))}
      </ul>
    </div>
  );
}
