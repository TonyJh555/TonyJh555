"use client";

import { useState } from "react";
import { updateBooking } from "@/lib/bookings";
import {
  intakeDone,
  intakeFlags,
  intakeRequired,
  questionsFor,
  type IntakeId,
} from "@/lib/intake";
import type { Booking } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/**
 * Six health questions before somebody works on your body — and the answers,
 * turned into instructions, on the worker's screen before they arrive.
 *
 * KAAM was asking nothing. A therapist learning about a pregnancy or a spinal
 * surgery at the door has already wasted the trip; one who never learns is why
 * every one of these trades asks on paper elsewhere in the world.
 *
 * Asked after the worker accepts rather than during booking, deliberately.
 * Nobody should have to disclose a pregnancy to a stranger who may yet say no,
 * and health details must not sit on a request that never became a job.
 */

/** The customer's side: answer once, before the visit. */
export function HealthIntake({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [yes, setYes] = useState<IntakeId[]>(booking.intake?.yes ?? []);
  const [note, setNote] = useState(booking.intake?.note ?? "");
  const [open, setOpen] = useState(false);

  const questions = questionsFor(booking.categoryId);
  if (!intakeRequired(booking.categoryId) || questions.length === 0) return null;
  // Only once someone has actually taken the job, and only before it starts.
  if (booking.status !== "accepted") return null;

  const done = intakeDone(booking);

  const save = () => {
    updateBooking(booking.id, {
      intake: { yes, note: note.trim() || undefined, answeredAt: new Date().toISOString() },
    });
    setOpen(false);
  };

  if (done && !open) {
    return (
      <div className="mt-3 rounded-xl border border-good-mid bg-good-light p-3">
        <p className="text-[11px] font-bold text-good">
          ✓ {ml ? "ആരോഗ്യ വിവരങ്ങൾ നൽകി" : "Health details shared"}
          {booking.intake!.yes.length > 0 &&
            ` · ${booking.intake!.yes.length} ${ml ? "കാര്യം" : "noted"}`}
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-1 text-[11px] font-bold text-good underline"
        >
          {ml ? "മാറ്റൂ" : "Change"}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-warn-mid bg-warn-light py-2.5 text-xs font-bold text-warn"
      >
        🩺 {ml
          ? `${booking.workerName.split(" ")[0]}-ന് അറിയേണ്ട ${questions.length} കാര്യങ്ങൾ`
          : `${questions.length} things ${booking.workerName.split(" ")[0]} needs to know`}
      </button>
    );
  }

  const toggle = (id: IntakeId) =>
    setYes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="mt-3 rounded-xl border border-line bg-surf p-3">
      <p className="text-xs font-extrabold text-ink">
        🩺 {ml ? "തുടങ്ങും മുൻപ്" : "Before they start"}
      </p>
      <p className="mt-0.5 mb-2 text-[11px] leading-relaxed text-mid">
        {ml
          ? `${booking.workerName.split(" ")[0]} മാത്രമേ ഇത് കാണൂ. ബാധകമായവ ടിക്ക് ചെയ്യൂ — ഒന്നുമില്ലെങ്കിൽ അതും പറയാം.`
          : `Only ${booking.workerName.split(" ")[0]} sees this. Tick anything that applies — "none of these" is a fine answer.`}
      </p>

      <div className="flex flex-col gap-1.5">
        {questions.map((q) => {
          const on = yes.includes(q.id);
          return (
            <button
              key={q.id}
              onClick={() => toggle(q.id)}
              className={`rounded-lg border p-2.5 text-left ${
                on ? "border-kaam bg-kaam-light" : "border-line bg-white"
              }`}
            >
              <span className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[9px] font-bold text-white ${
                    on ? "border-kaam bg-kaam" : "border-line"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[11px] font-bold ${on ? "text-kaam" : "text-ink"}`}>
                    {ml ? q.labelMl : q.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-mid">
                    {ml ? q.whyMl : q.why}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={ml ? "മറ്റെന്തെങ്കിലും? ഉദാ: ഇടത് കാൽമുട്ട്" : "Anything else? e.g. left knee"}
        className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-kaam"
      />

      <button
        onClick={save}
        className="mt-2 w-full rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white"
      >
        {yes.length === 0
          ? ml ? "ഒന്നും ബാധകമല്ല" : "None of these apply"
          : ml ? "അയയ്ക്കൂ" : "Share with them"}
      </button>
    </div>
  );
}

/**
 * The worker's side: what to do differently, most serious first.
 *
 * Instructions rather than a list of conditions — a diagnosis with no action
 * attached is a privacy cost with no safety benefit, and it is not the
 * worker's business what the customer has, only what it changes.
 */
export function IntakeBrief({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  if (!intakeRequired(booking.categoryId)) return null;
  if (booking.status !== "accepted" && booking.status !== "in_progress") return null;

  const flags = intakeFlags(booking.intake);

  if (!intakeDone(booking)) {
    return (
      <p className="mt-2 rounded-xl border border-line bg-surf p-2.5 text-[11px] leading-relaxed text-mid">
        🩺 {ml
          ? "ആരോഗ്യ വിവരങ്ങൾ ഇതുവരെ നൽകിയിട്ടില്ല. എത്തുമ്പോൾ ചോദിക്കൂ."
          : "No health details yet. Ask when you arrive."}
      </p>
    );
  }

  if (flags.length === 0 && !booking.intake?.note) {
    return (
      <p className="mt-2 rounded-xl border border-good-mid bg-good-light p-2.5 text-[11px] font-semibold text-good">
        🩺 {ml ? "ആരോഗ്യപരമായി പ്രത്യേകതകളില്ല." : "Nothing to work around — they answered none."}
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-warn-mid bg-warn-light p-2.5">
      <p className="text-[11px] font-extrabold text-warn">
        🩺 {ml ? "എത്തും മുൻപ് വായിക്കൂ" : "Read before you arrive"}
      </p>
      <ul className="mt-1 flex flex-col gap-1">
        {flags.map((f) => (
          <li
            key={f.id}
            className={`text-[11px] leading-relaxed ${
              f.serious ? "font-bold text-kaam" : "text-warn"
            }`}
          >
            {f.serious ? "⚠️ " : "• "}
            {ml ? f.actionMl : f.action}
          </li>
        ))}
      </ul>
      {booking.intake?.note && (
        <p className="mt-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] text-ink">
          “{booking.intake.note}”
        </p>
      )}
    </div>
  );
}
