"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { pausePatch, resumePatch } from "@/lib/metered";
import { minutesOverdue } from "@/lib/no-show";
import {
  awaitingApprovalFrom,
  canReschedule,
  codeMatches,
  makeRescheduleCode,
  reschedulesLeft,
} from "@/lib/reschedule";
import { useLanguage } from "@/components/language-provider";

/**
 * Pause & reschedule a running job — the "worker needs to buy parts and come
 * back tomorrow" flow. Either side proposes a new time (freezing the fair-
 * billing meter), the other agrees by entering a 4-digit code, and the worker
 * resumes with the customer's start code at the next visit. Capped at 3.
 */

function fmt(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return `${date} ${time}`;
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PauseReschedule({ booking, viewer }: { booking: Booking; viewer: "customer" | "worker" }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [entered, setEntered] = useState("");
  const [resumeCode, setResumeCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (booking.status !== "in_progress") return null;

  const req = booking.reschedule;
  const other = viewer === "worker" ? "customer" : "worker";
  const otherLabel = other === "worker"
    ? ml ? "തൊഴിലാളി" : "the worker"
    : ml ? "ഉപഭോക്താവ്" : "the customer";
  const mine = req && req.by === viewer;

  const notify = (text: string) => sendMessage({ bookingId: booking.id, sender: "system", text });

  // 1 — Propose a new time (pauses the meter).
  const propose = () => {
    const code = makeRescheduleCode();
    updateBooking(booking.id, {
      reschedule: { by: viewer, date, time, code, requestedAt: new Date().toISOString() },
      ...pausePatch(booking),
    });
    notify(
      `⏸ ${viewer === "worker" ? "Worker" : "Customer"} asked to pause and come back on ${fmt(date, time)}. ` +
        `The other side enters the 4-digit code to agree — the billing clock is paused until then.`,
    );
    setOpen(false);
  };

  // Cancel a pending proposal → resume the meter (nobody rescheduled after all).
  const cancel = () => {
    updateBooking(booking.id, { reschedule: undefined, ...resumePatch(new Date(), booking) });
    notify("↩️ Reschedule cancelled — the job continues and the clock is running again.");
  };

  // 2 — Agree by entering the code → lock the new time (stays paused till the visit).
  const approve = () => {
    if (!codeMatches(req, entered)) {
      setErr(ml ? "കോഡ് ശരിയല്ല. വീണ്ടും വായിക്കാൻ പറയൂ." : "That code doesn't match. Ask them to read it out again.");
      return;
    }
    setErr(null);
    setEntered("");
    updateBooking(booking.id, {
      reschedule: undefined,
      schedule: { when: "scheduled", date: req!.date, time: req!.time },
      rescheduleCount: (booking.rescheduleCount ?? 0) + 1,
    });
    notify(
      `✅ Both sides agreed — the visit is rescheduled to ${fmt(req!.date, req!.time)}. ` +
        `You'll both get a reminder 1 hour before. The clock resumes when the worker restarts the job.`,
    );
  };

  // 3 — Worker resumes at the next visit with the customer's start code.
  const resume = () => {
    if (resumeCode.trim() !== booking.startCode) {
      setErr(ml ? "സ്റ്റാർട്ട് കോഡ് ശരിയല്ല. ഉപഭോക്താവിനോട് കോഡ് ചോദിക്കൂ." : "Start code doesn't match. Ask the customer for their code.");
      return;
    }
    setErr(null);
    setResumeCode("");
    updateBooking(booking.id, resumePatch(new Date(), booking));
    notify("▶️ Job resumed — the fair-billing clock is running again from where it paused.");
  };

  const paused = Boolean(booking.pausedAt);
  const box = "mt-3 rounded-xl border border-line bg-surf p-3";

  // ── Pending proposal ──────────────────────────────────────────────
  if (req) {
    if (mine) {
      return (
        <div className={box}>
          <p className="text-xs font-bold text-ink">
            ⏳ {ml ? `${otherLabel} സമ്മതിക്കാൻ കാത്തിരിക്കുന്നു` : `Waiting for ${otherLabel} to agree`}
          </p>
          <p className="mt-1 text-[11px] text-mid">
            {ml ? "പുതിയ സമയം: " : "New time: "}<strong>{fmt(req.date, req.time)}</strong>.{" "}
            {ml
              ? `സ്ഥിരീകരിക്കാൻ ഈ കോഡ് ${otherLabel}-ന് വായിച്ചു കൊടുക്കൂ:`
              : `Read this code to ${otherLabel} so they can confirm:`}
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
    if (awaitingApprovalFrom(req, viewer)) {
      return (
        <div className={box}>
          <p className="text-xs font-bold text-ink">
            🕐 {req.by === "worker"
              ? ml ? "തൊഴിലാളി സമയം മാറ്റാൻ ആഗ്രഹിക്കുന്നു" : "The worker wants to reschedule"
              : ml ? "ഉപഭോക്താവ് സമയം മാറ്റാൻ ആഗ്രഹിക്കുന്നു" : "The customer wants to reschedule"}
          </p>
          <p className="mt-1 text-[11px] text-mid">
            {ml ? "തിരികെ വരുന്നത്: " : "Come back on "}<strong>{fmt(req.date, req.time)}</strong>.{" "}
            {ml
              ? "സമ്മതമാണെങ്കിൽ അവർ കാണിക്കുന്ന 4 അക്ക കോഡ് നൽകൂ."
              : "Enter the 4-digit code they show you to agree."}
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
              onClick={approve}
              disabled={entered.length !== 4}
              className="rounded-lg bg-good px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {ml ? "സമ്മതം" : "Agree"}
            </button>
          </div>
          {err && <p className="mt-1.5 text-[11px] font-semibold text-kaam">{err}</p>}
          <button onClick={cancel} className="mt-2 w-full text-center text-[11px] font-bold text-mid">
            {ml ? "വേണ്ട — ഇപ്പോൾ തുടരാം" : "Decline — carry on now"}
          </button>
        </div>
      );
    }
  }

  // ── Agreed & paused, waiting for the next visit ───────────────────
  if (paused && !req) {
    // Once the worker is overdue this panel is both redundant and wrong on the
    // customer's side — it still promises "a reminder 1 hour before" a visit
    // that is already late. WorkerNoShow owns that story, start code included.
    // The worker keeps this panel, because it holds the resume input.
    if (viewer === "customer" && minutesOverdue(booking) > 0) return null;
    return (
      <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3">
        <p className="text-xs font-bold text-info">
          ⏸ {ml ? "നിർത്തി · വീണ്ടും തുടങ്ങുന്നത് " : "Paused · resumes "}
          {booking.schedule?.when === "scheduled"
            ? fmt(booking.schedule.date, booking.schedule.time)
            : ml ? "സമ്മതിച്ച സമയത്ത്" : "at the agreed time"}
        </p>
        <p className="mt-1 text-[11px] text-info/90">
          {ml
            ? "ബില്ലിംഗ് ക്ലോക്ക് നിർത്തി — ഇടവേളയ്ക്ക് പണം ഈടാക്കില്ല. ഒരു മണിക്കൂർ മുൻപ് രണ്ടുപേർക്കും ഓർമ്മപ്പെടുത്തൽ ലഭിക്കും."
            : "The billing clock is frozen — no charge for the gap. You'll both get a reminder 1 hour before."}
        </p>
        {viewer === "worker" ? (
          <>
            <p className="mt-2 text-[11px] font-bold text-ink">
              {ml
                ? "ഉപഭോക്താവിന്റെ അടുത്ത് തിരിച്ചെത്തിയോ? തുടരാൻ അവരുടെ സ്റ്റാർട്ട് കോഡ് നൽകൂ:"
                : "Back at the customer? Enter their start code to resume:"}
            </p>
            <div className="mt-1.5 flex gap-2">
              <input
                value={resumeCode}
                onChange={(e) => setResumeCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder={ml ? "സ്റ്റാർട്ട് കോഡ്" : "Start code"}
                className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-center font-mono tracking-[0.3em] outline-none focus:border-kaam"
              />
              <button
                onClick={resume}
                disabled={resumeCode.length !== 4}
                className="rounded-lg bg-kaam px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                ▶ {ml ? "തുടരൂ" : "Resume"}
              </button>
            </div>
            {err && <p className="mt-1.5 text-[11px] font-semibold text-kaam">{err}</p>}
          </>
        ) : (
          <p className="mt-2 text-[11px] text-mid">
            {ml ? "തൊഴിലാളി തിരിച്ചെത്തുമ്പോൾ ജോലി തുടരാൻ നിങ്ങളുടെ സ്റ്റാർട്ട് കോഡ് " : "Show your start code "}
            <strong className="font-mono">{booking.startCode}</strong>
            {ml ? " കാണിക്കൂ." : " when the worker returns to continue the job."}
          </p>
        )}
      </div>
    );
  }

  // ── Offer to pause & reschedule ───────────────────────────────────
  if (!canReschedule(booking)) {
    if ((booking.rescheduleCount ?? 0) >= 3) {
      return (
        <p className="mt-3 text-center text-[11px] text-dim">
          {ml ? "റീഷെഡ്യൂൾ പരിധി കഴിഞ്ഞു (3 തവണ)." : "Reschedule limit reached (3 times)."}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-line bg-white py-2.5 text-xs font-bold text-mid"
        >
          ⏸ {ml ? "നിർത്തി സമയം മാറ്റൂ" : "Pause & reschedule"} · {reschedulesLeft(booking)} {ml ? "ബാക്കി" : "left"}
        </button>
      ) : (
        <div className={box}>
          <p className="text-xs font-bold text-ink">
            {ml ? "നിർത്തി പിന്നീട് വരൂ" : "Pause & come back later"}
          </p>
          <p className="mt-0.5 text-[11px] text-mid">
            {ml
              ? `ക്ലോക്ക് ഇപ്പോൾ നിൽക്കും. എപ്പോൾ തിരിച്ചുവരണമെന്ന് തിരഞ്ഞെടുക്കൂ — ${otherLabel} 4 അക്ക കോഡ് നൽകി സ്ഥിരീകരിക്കും.`
              : `The clock stops now. Pick when to return — ${otherLabel} confirms with a 4-digit code.`}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-2 text-xs outline-none focus:border-kaam"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-line bg-white px-2 py-2 text-xs outline-none focus:border-kaam"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-line bg-white py-2 text-xs font-bold text-mid">
              {ml ? "പിന്നോട്ട്" : "Back"}
            </button>
            <button onClick={propose} className="flex-1 rounded-lg bg-kaam py-2 text-xs font-bold text-white">
              {ml ? "നിർദ്ദേശിക്കൂ " : "Propose "}{fmt(date, time)} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
