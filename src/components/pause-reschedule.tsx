"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { updateBooking } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { pausePatch, resumePatch } from "@/lib/metered";
import {
  awaitingApprovalFrom,
  canReschedule,
  codeMatches,
  makeRescheduleCode,
  reschedulesLeft,
} from "@/lib/reschedule";

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
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [entered, setEntered] = useState("");
  const [resumeCode, setResumeCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (booking.status !== "in_progress") return null;

  const req = booking.reschedule;
  const other = viewer === "worker" ? "customer" : "worker";
  const otherLabel = other === "worker" ? "the worker" : "the customer";
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
    updateBooking(booking.id, { reschedule: undefined, ...resumePatch() });
    notify("↩️ Reschedule cancelled — the job continues and the clock is running again.");
  };

  // 2 — Agree by entering the code → lock the new time (stays paused till the visit).
  const approve = () => {
    if (!codeMatches(req, entered)) {
      setErr("That code doesn't match. Ask them to read it out again.");
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
      setErr("Start code doesn't match. Ask the customer for their code.");
      return;
    }
    setErr(null);
    setResumeCode("");
    updateBooking(booking.id, resumePatch());
    notify("▶️ Job resumed — the fair-billing clock is running again from where it paused.");
  };

  const paused = Boolean(booking.pausedAt);
  const box = "mt-3 rounded-xl border border-line bg-surf p-3";

  // ── Pending proposal ──────────────────────────────────────────────
  if (req) {
    if (mine) {
      return (
        <div className={box}>
          <p className="text-xs font-bold text-ink">⏳ Waiting for {otherLabel} to agree</p>
          <p className="mt-1 text-[11px] text-mid">
            New time: <strong>{fmt(req.date, req.time)}</strong>. Read this code to {otherLabel} so they can confirm:
          </p>
          <p className="my-2 text-center font-mono text-2xl font-extrabold tracking-[0.4em] text-kaam">
            {req.code}
          </p>
          <button onClick={cancel} className="w-full rounded-lg border border-line bg-white py-2 text-[11px] font-bold text-mid">
            Cancel — keep working
          </button>
        </div>
      );
    }
    if (awaitingApprovalFrom(req, viewer)) {
      return (
        <div className={box}>
          <p className="text-xs font-bold text-ink">
            🕐 {req.by === "worker" ? "The worker" : "The customer"} wants to reschedule
          </p>
          <p className="mt-1 text-[11px] text-mid">
            Come back on <strong>{fmt(req.date, req.time)}</strong>. Enter the 4-digit code they show you to agree.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={entered}
              onChange={(e) => setEntered(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="4-digit code"
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-center font-mono tracking-[0.3em] outline-none focus:border-kaam"
            />
            <button
              onClick={approve}
              disabled={entered.length !== 4}
              className="rounded-lg bg-good px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Agree
            </button>
          </div>
          {err && <p className="mt-1.5 text-[11px] font-semibold text-kaam">{err}</p>}
          <button onClick={cancel} className="mt-2 w-full text-center text-[11px] font-bold text-mid">
            Decline — carry on now
          </button>
        </div>
      );
    }
  }

  // ── Agreed & paused, waiting for the next visit ───────────────────
  if (paused && !req) {
    return (
      <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3">
        <p className="text-xs font-bold text-info">
          ⏸ Paused · resumes {booking.schedule?.when === "scheduled" ? fmt(booking.schedule.date, booking.schedule.time) : "at the agreed time"}
        </p>
        <p className="mt-1 text-[11px] text-info/90">
          The billing clock is frozen — no charge for the gap. You&apos;ll both get a reminder 1 hour before.
        </p>
        {viewer === "worker" ? (
          <>
            <p className="mt-2 text-[11px] font-bold text-ink">Back at the customer? Enter their start code to resume:</p>
            <div className="mt-1.5 flex gap-2">
              <input
                value={resumeCode}
                onChange={(e) => setResumeCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="Start code"
                className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-center font-mono tracking-[0.3em] outline-none focus:border-kaam"
              />
              <button
                onClick={resume}
                disabled={resumeCode.length !== 4}
                className="rounded-lg bg-kaam px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                ▶ Resume
              </button>
            </div>
            {err && <p className="mt-1.5 text-[11px] font-semibold text-kaam">{err}</p>}
          </>
        ) : (
          <p className="mt-2 text-[11px] text-mid">
            Show your start code <strong className="font-mono">{booking.startCode}</strong> when the worker returns to continue the job.
          </p>
        )}
      </div>
    );
  }

  // ── Offer to pause & reschedule ───────────────────────────────────
  if (!canReschedule(booking)) {
    if ((booking.rescheduleCount ?? 0) >= 3) {
      return <p className="mt-3 text-center text-[11px] text-dim">Reschedule limit reached (3 times).</p>;
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
          ⏸ Pause &amp; reschedule · {reschedulesLeft(booking)} left
        </button>
      ) : (
        <div className={box}>
          <p className="text-xs font-bold text-ink">Pause &amp; come back later</p>
          <p className="mt-0.5 text-[11px] text-mid">
            The clock stops now. Pick when to return — {otherLabel} confirms with a 4-digit code.
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
              Back
            </button>
            <button onClick={propose} className="flex-1 rounded-lg bg-kaam py-2 text-xs font-bold text-white">
              Propose {fmt(date, time)} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
