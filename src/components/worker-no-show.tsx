"use client";

import { useEffect, useState } from "react";
import { findWorker, useRoster } from "@/lib/roster";
import { addBooking, updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { refund } from "@/lib/wallet";
import { inr } from "@/lib/format";
import {
  minutesOverdue,
  noShowGraceLapsed,
  noShowPatch,
  noShowSettlement,
  resumeDueAt,
} from "@/lib/no-show";
import { handoverAvailable, handoverFrom, handoverPatch } from "@/lib/handover";
import { dispatchQueue, jobCoords } from "@/lib/dispatch";
import { handoverBrief } from "@/lib/job-report";
import type { Booking } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/**
 * The worker agreed to come back and hasn't — the customer's way out.
 *
 * Two buttons, no code. "He's here" hands over to the normal resume, which
 * still needs the start code because presence is the thing being proved.
 * "He never came" ends the job and returns the money, and needs no code at
 * all: absence cannot be confirmed by a number held by the absent party.
 *
 * Before the grace runs out this says only that the worker is running late,
 * because being late is not abandonment and a customer shouldn't be nudged
 * into ending a job over twenty minutes of Kerala traffic.
 */
export function WorkerNoShow({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [now, setNow] = useState(() => new Date());
  const [confirming, setConfirming] = useState(false);
  const [handedTo, setHandedTo] = useState<string | null>(null);
  const roster = useRoster();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Once the job has been handed on, say so and stop — the successor is the
  // live booking now, and this panel has nothing left to offer.
  if (handedTo) {
    return (
      <div className="mt-3 rounded-xl border border-good-mid bg-good-light p-3 text-[11px] leading-relaxed text-good">
        <p className="font-extrabold">
          ✅ {ml ? "വേറൊരാൾ ജോലി തീർക്കാൻ വരുന്നു" : "Someone else is coming to finish it"}
        </p>
        <p className="mt-0.5">
          {ml
            ? `${handedTo}-ന് ജോലി അയച്ചു. ഇതുവരെ ചെയ്ത ജോലിയുടെ വിവരവും ഫോട്ടോകളും അവർക്ക് കിട്ടും. ബേസ് അവർ വീണ്ടും നൽകേണ്ട.`
            : `Sent to ${handedTo}, with the report and photos of what was already done. You do not pay the base hour a second time.`}
        </p>
      </div>
    );
  }

  const due = resumeDueAt(booking);
  if (!due) return null;
  // While a reschedule is still being agreed, that panel owns the screen.
  if (booking.reschedule) return null;

  const late = minutesOverdue(booking, now);
  if (late <= 0) return null;

  const worker = findWorker(booking.workerId);
  const first = booking.workerName.split(" ")[0];
  const lapsed = noShowGraceLapsed(booking, now);

  /* ── Merely late ────────────────────────────────────────────────── */
  if (!lapsed) {
    return (
      <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3 text-[11px] leading-relaxed text-info">
        <p className="font-bold">
          🕐 {ml ? `${first} ${late} മിനിറ്റ് വൈകി` : `${first} is ${late} min late`}
        </p>
        <p className="mt-0.5">
          {ml
            ? "ബില്ലിംഗ് ക്ലോക്ക് നിർത്തിയിരിക്കുന്നു — കാത്തിരിക്കുന്ന സമയത്തിന് നിങ്ങൾ ഒന്നും നൽകുന്നില്ല."
            : "The billing clock is stopped — you are not paying for this waiting time."}
        </p>
      </div>
    );
  }

  /* ── Overdue enough to offer a way out ──────────────────────────── */
  const s = noShowSettlement(booking, worker);

  // Who could finish it. The worker who didn't come back is excluded, and so
  // is anyone already passed over — the ordinary dispatch rules, not a special
  // case. Nobody free nearby means the offer is simply not shown: a button
  // that promises a replacement and produces none is worse than no button.
  const successor = handoverAvailable(booking, now)
    ? dispatchQueue(roster, booking.categoryId, jobCoords(booking), [booking.workerId])[0]
    : undefined;

  const handOver = () => {
    if (!successor) return;
    const next = handoverFrom(booking, successor, now);
    addBooking(next);
    updateBooking(booking.id, handoverPatch(booking, next.id, now, worker));
    if (s.refund > 0 && booking.paymentMethod !== "cash") {
      refund(s.refund, `Refund · ${first} did not return for ${booking.subService}`);
    }
    // The brief travels with the job, not just the report field: the new
    // worker reads the chat before they read anything else.
    const brief = handoverBrief(booking.report);
    sendMessage({
      bookingId: next.id,
      sender: "system",
      text:
        `🔁 Taking over an unfinished job. ${first} started this ${booking.subService} ` +
        `and did not return for the agreed visit.` +
        (brief ? `\n📋 ${brief}` : "\n📋 No report was left — ask the customer what was done.") +
        `\nThe customer has already paid for the first worker's minutes, so this visit ` +
        `bills from its first minute. Your trip is guaranteed at the base hour either way.`,
    });
    setHandedTo(successor.name.split(" ")[0]);
  };

  const endIt = () => {
    // The worker is passed so the patch can bank the minutes actually worked
    // before they stopped coming — the same figure the customer is refunded
    // against, rather than a second opinion about it.
    updateBooking(booking.id, noShowPatch(booking, now, worker));
    if (s.refund > 0 && booking.paymentMethod !== "cash") {
      refund(s.refund, `Refund · ${first} did not return for ${booking.subService}`);
    }
    sendMessage({
      bookingId: booking.id,
      sender: "system",
      text:
        `⚠️ ${first} did not return for the rescheduled visit, so the customer ended the job.` +
        (s.workedMinutes > 0
          ? ` ${s.workedMinutes} min of work was done and charged (${inr(s.workerKeeps)}).`
          : " No work had been done.") +
        (s.refund > 0 ? ` ${inr(s.refund)} refunded to KAAM Cash.` : ""),
    });
  };

  return (
    <div className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-3 text-[11px] leading-relaxed text-warn">
      <p className="font-extrabold">
        ⚠️ {ml
          ? `${first} ${Math.floor(late / 60)} മണിക്കൂർ ${late % 60} മിനിറ്റ് വൈകി`
          : `${first} is ${Math.floor(late / 60)}h ${late % 60}m overdue`}
      </p>
      <p className="mt-0.5">
        {ml
          ? "കാത്തിരുന്ന സമയത്തിന് ഒന്നും ഈടാക്കിയിട്ടില്ല. ഇനി എന്ത് ചെയ്യണം?"
          : "You have not been charged for any of this waiting. What would you like to do?"}
      </p>

      {confirming ? (
        <div className="mt-2 rounded-lg border border-warn-mid bg-white p-2.5">
          <p className="font-bold text-ink">
            {ml ? "ജോലി അവസാനിപ്പിക്കണോ?" : "End this job?"}
          </p>
          <table className="mt-1.5 w-full text-[11px] text-mid">
            <tbody>
              <tr>
                <td className="py-0.5">
                  {ml ? `ചെയ്ത ജോലി (${s.workedMinutes} മിനിറ്റ്)` : `Work done (${s.workedMinutes} min)`}
                </td>
                <td className="py-0.5 text-right font-semibold tabular-nums">{inr(s.workerKeeps)}</td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-0.5 font-bold text-good">
                  {ml ? "നിങ്ങൾക്ക് തിരികെ" : "Back to you"}
                </td>
                <td className="py-0.5 text-right font-extrabold text-good tabular-nums">
                  {inr(s.refund)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1.5 text-[10px] leading-relaxed text-mid">
            {ml
              ? "വന്നിട്ടില്ലാത്ത ജോലിക്ക് ബേസ് അവർ ഈടാക്കില്ല — ചെയ്ത മിനിറ്റുകൾക്ക് മാത്രം."
              : "The base hour is not kept for a visit that never happened — only the minutes actually worked."}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={endIt}
              className="flex-1 rounded-lg bg-kaam py-2 text-[11px] font-extrabold text-white"
            >
              {ml ? "അതെ, അവസാനിപ്പിക്കൂ" : "Yes, end it"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg border border-line bg-white py-2 text-[11px] font-bold text-mid"
            >
              {ml ? "വേണ്ട" : "Keep waiting"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          <p className="rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] font-semibold text-ink">
            ✅ {ml ? "അവർ എത്തിയോ? ഈ കോഡ് പറഞ്ഞുകൊടുത്താൽ ജോലി തുടരും: " : "Has he arrived? Read out this code and the job carries on: "}
            <strong className="font-mono tracking-[0.2em] text-kaam">{booking.startCode}</strong>
          </p>
          {/* The better answer, so it sits above the other one. Ending a job
              is not the same as getting it finished: it returns the money and
              leaves the customer with the wall still open and nobody coming. */}
          {successor && (
            <button
              onClick={handOver}
              className="rounded-lg border-2 border-good bg-good py-2.5 text-[11px] font-extrabold text-white"
            >
              🔁 {ml ? "വേറൊരാൾ വന്ന് തീർക്കട്ടെ" : "Get someone else to finish it"}
              <span className="block text-[10px] font-semibold opacity-90">
                {ml
                  ? `${successor.name.split(" ")[0]} അടുത്തുണ്ട് · ബേസ് അവർ വീണ്ടും നൽകേണ്ട`
                  : `${successor.name.split(" ")[0]} is nearby · you don't pay the base hour twice`}
              </span>
            </button>
          )}
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-kaam-mid bg-white py-2 text-[11px] font-bold text-kaam"
          >
            {ml ? `${first} വന്നില്ല — ജോലി അവസാനിപ്പിക്കൂ` : `${first} never came — end this job`}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The worker's own view of the same clock: how overdue they are, and the
 * plain consequence. Workers are told before they lose the job, not after —
 * a penalty nobody saw coming is the complaint that follows gig platforms
 * around, and it is avoidable with one honest line.
 */
export function OverdueWarning({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!resumeDueAt(booking) || booking.reschedule) return null;
  const late = minutesOverdue(booking, now);
  if (late <= 0) return null;

  const lapsed = noShowGraceLapsed(booking, now);
  return (
    <div
      className={`mt-2 rounded-xl border p-2.5 text-[11px] leading-relaxed ${
        lapsed ? "border-kaam-mid bg-kaam-light text-kaam" : "border-warn-mid bg-warn-light text-warn"
      }`}
    >
      <p className="font-extrabold">
        {lapsed ? "⚠️" : "🕐"}{" "}
        {ml ? `നിങ്ങൾ ${late} മിനിറ്റ് വൈകി` : `You are ${late} min late`}
        <span className="block font-semibold opacity-90">
          {ml ? "ഉപഭോക്താവ് കാത്തിരിക്കുന്നു" : "The customer is waiting"}
        </span>
      </p>
      <p className="mt-1">
        {lapsed
          ? ml
            ? "ഉപഭോക്താവിന് ഇപ്പോൾ ഈ ജോലി അവസാനിപ്പിക്കാം. ചെയ്ത മിനിറ്റുകൾക്ക് മാത്രമേ പണം ലഭിക്കൂ. ഉടൻ വിളിക്കൂ."
            : "The customer can now end this job. You'd be paid only for the minutes you actually worked. Call them now."
          : ml
            ? "സാധിക്കുമെങ്കിൽ ഉടൻ എത്തൂ, അല്ലെങ്കിൽ വിളിച്ചു പറയൂ."
            : "Get there soon if you can, or call and tell them."}
      </p>
    </div>
  );
}
