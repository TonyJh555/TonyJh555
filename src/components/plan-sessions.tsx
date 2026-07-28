"use client";

import { useState } from "react";
import { updateSubscription } from "@/lib/subscriptions";
import {
  describePattern,
  isoDate,
  markSessionPatch,
  planProgress,
  plannedSessions,
  sessionAt,
  unrecordedSessions,
  WEEKDAYS,
} from "@/lib/sessions";
import { isTeachable } from "@/lib/plans";
import {
  careConcerns,
  careFields,
  careReadings,
  careRequired,
  careTrend,
  handoverParts,
  hasCareNote,
  trendWarning,
  type CareNote,
} from "@/lib/care-notes";
import type { PlanSession } from "@/lib/sessions";
import type { Subscription } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/**
 * The visits inside a plan — what a recurring booking was always missing.
 *
 * A family paying for three months of a nurse could see the money leave and
 * nothing else: not when she was next due, not whether she came on Thursday,
 * not how much of the term was left. A parent paying for twelve piano lessons
 * had no idea which lesson their child was on. This is the answer to the three
 * questions either of them actually has — when is the next one, did the last
 * one happen, how many are left.
 */

function fmtDay(date: string, ml: boolean): string {
  return new Date(`${date}T00:00`).toLocaleDateString(ml ? "ml-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** The customer's view: progress, what's next, and the record so far. */
export function PlanSessions({ sub }: { sub: Subscription }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [open, setOpen] = useState(false);
  // One clock for the whole render, so every row agrees on what "past" means.
  const [now] = useState(() => new Date());
  const lesson = isTeachable(sub.categoryId);

  if (!sub.visits) return <AgreeDays sub={sub} />;

  const p = planProgress(sub, now);
  const sessions = plannedSessions(sub);
  const pct = Math.round(p.fraction * 100);
  // The most recent visit that actually carries a handover, which is not
  // always the last one on the calendar.
  const lastRecorded = [...sessions].reverse().find((s) => hasCareNote(s.mark?.care)) ?? null;

  return (
    <div className="mt-3 rounded-xl border border-line bg-surf p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-extrabold text-ink">
          📅 {ml ? "സന്ദർശനങ്ങൾ" : lesson ? "Lessons" : "Visits"}
        </p>
        <p className="text-[11px] font-bold text-good tabular-nums">
          {p.done} / {p.total} {ml ? "പൂർത്തിയായി" : "done"}
        </p>
      </div>
      <p className="mt-0.5 text-[11px] text-mid">{describePattern(sub.visits, ml)}</p>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-good transition-all" style={{ width: `${pct}%` }} />
      </div>

      {p.next ? (
        <p className="mt-2 text-[11px] font-bold text-info">
          ⏭ {ml ? "അടുത്തത്: " : "Next: "}
          {fmtDay(p.next.date, ml)} · {p.next.time}
          {lesson && ` · ${ml ? "പാഠം" : "lesson"} ${p.next.index}`}
        </p>
      ) : (
        <p className="mt-2 text-[11px] font-bold text-mid">
          {ml ? "ഈ ടേം പൂർത്തിയായി." : "This term is finished."}
        </p>
      )}

      {lastRecorded && <LastHandover sub={sub} session={lastRecorded} ml={ml} />}

      {p.missed > 0 && (
        <p className="mt-1 text-[11px] font-bold text-kaam">
          ⚠️ {p.missed} {ml ? "എണ്ണം നഷ്ടപ്പെട്ടു" : p.missed === 1 ? "was missed" : "were missed"}
        </p>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-2 w-full rounded-lg border border-line bg-white py-1.5 text-[11px] font-bold text-mid"
      >
        {open ? (ml ? "മറയ്ക്കൂ" : "Hide") : ml ? "എല്ലാം കാണൂ" : "See all"}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {sessions.map((s) => (
            <SessionRow
              key={s.date}
              session={s}
              ml={ml}
              lesson={lesson}
              now={now}
              categoryId={sub.categoryId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The last handover, at the top, where the family looks first.
 *
 * This is what they are actually paying for and never had: did amma eat, did
 * she take her tablets, was she herself today, what was her BP.
 */
function LastHandover({ sub, session, ml }: { sub: Subscription; session: PlanSession; ml: boolean }) {
  const care = session.mark?.care;
  if (!hasCareNote(care)) return null;

  // Only the readings are repeated as a warning: they carry something to do
  // about them. "Didn't eat" is already in the line above, in red.
  const concerns = careConcerns(care, sub.categoryId).filter((c) => c.reading);
  const trend = trendWarning(careTrend(sub.sessions, sub.categoryId), ml);
  const parts = handoverParts(care, ml, sub.categoryId);

  return (
    <div className="mt-2 rounded-lg border border-line bg-white p-2.5">
      <p className="text-[10px] font-extrabold text-dim">
        {ml ? "അവസാന സന്ദർശനം" : "Last visit"} · {fmtDay(session.date, ml)}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-ink">
        {parts.map((part, i) => (
          <span key={part.text} className={part.concern ? "font-extrabold text-kaam" : undefined}>
            {i > 0 && <span className="font-normal text-dim"> · </span>}
            {part.text}
          </span>
        ))}
      </p>
      {session.mark?.note && (
        <p className="mt-1 text-[11px] leading-relaxed text-mid">“{session.mark.note}”</p>
      )}
      {concerns.map((c) => (
        <p key={c.text} className="mt-1 text-[11px] font-bold leading-relaxed text-kaam">
          ⚠️ {ml ? c.textMl : c.text}
        </p>
      ))}
      {trend && (
        <p className="mt-1.5 rounded-lg border border-warn-mid bg-warn-light px-2 py-1.5 text-[11px] font-bold leading-relaxed text-warn">
          {ml ? "ശ്രദ്ധിക്കൂ: " : "Worth knowing: "}
          {trend}
        </p>
      )}
    </div>
  );
}

function SessionRow({
  session,
  ml,
  lesson,
  now,
  categoryId,
}: {
  session: PlanSession;
  ml: boolean;
  lesson: boolean;
  now: Date;
  categoryId: Subscription["categoryId"];
}) {
  const past = sessionAt(session).getTime() <= now.getTime();
  const icon =
    session.mark?.status === "done" ? "✅" : session.mark?.status === "missed" ? "✕" : past ? "•" : "○";
  const tone =
    session.mark?.status === "done"
      ? "text-good"
      : session.mark?.status === "missed"
        ? "text-kaam"
        : "text-mid";

  return (
    <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold ${tone}`}>
          {icon} {fmtDay(session.date, ml)} · {session.time}
        </span>
        <span className="shrink-0 text-[10px] font-bold text-dim">
          {lesson ? `#${session.index}` : `${ml ? "സന്ദർശനം" : "visit"} ${session.index}`}
        </span>
      </div>
      {hasCareNote(session.mark?.care) && (
        <p className="mt-0.5 text-[10px] leading-relaxed text-ink">
          {handoverParts(session.mark!.care, ml, categoryId).map((part, i) => (
            <span key={part.text} className={part.concern ? "font-bold text-kaam" : undefined}>
              {i > 0 && <span className="font-normal text-dim"> · </span>}
              {part.text}
            </span>
          ))}
        </p>
      )}
      {careConcerns(session.mark?.care, categoryId)
        .filter((c) => c.reading)
        .map((c) => (
          <p key={c.text} className="mt-0.5 text-[10px] font-bold leading-relaxed text-kaam">
            ⚠️ {ml ? c.textMl : c.text}
          </p>
        ))}
      {session.mark?.note && (
        <p className="mt-0.5 text-[10px] leading-relaxed text-mid">{session.mark.note}</p>
      )}
    </div>
  );
}

/**
 * No rhythm agreed yet. The plan is paid for and the days are still open, so
 * ask for them plainly rather than guessing a schedule nobody signed up to.
 */
function AgreeDays({ sub }: { sub: Subscription }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("16:00");

  const toggle = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <div className="mt-3 rounded-xl border border-info-mid bg-info-light p-3">
      <p className="text-xs font-extrabold text-info">
        📅 {ml ? "ദിവസങ്ങൾ തിരഞ്ഞെടുക്കൂ" : "Set the days"}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-info/90">
        {ml
          ? "ഏതെല്ലാം ദിവസങ്ങളിൽ വരണം? ഇത് സെറ്റ് ചെയ്താൽ എല്ലാ സന്ദർശനങ്ങളും ഓർമ്മപ്പെടുത്തലുകളും ഉണ്ടാകും."
          : "Which days should they come? Setting this creates every visit in the term, with reminders."}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {WEEKDAYS.map((d) => (
          <button
            key={d.day}
            onClick={() => toggle(d.day)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
              days.includes(d.day)
                ? "border-kaam bg-kaam text-white"
                : "border-line bg-white text-mid"
            }`}
          >
            {ml ? d.shortMl : d.short}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] font-bold text-info">{ml ? "സമയം" : "Time"}</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-kaam"
        />
      </div>

      <button
        onClick={() => updateSubscription(sub.id, { visits: { days: [...days].sort(), time } })}
        disabled={days.length === 0}
        className="mt-2 w-full rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
      >
        {ml ? "സ്ഥിരീകരിക്കൂ" : "Confirm these days"}
      </button>
    </div>
  );
}

/**
 * The handover form — four taps and, where it applies, two numbers.
 *
 * Chips rather than typing, because a carer finishing a shift will tap and
 * will not write, and because "she was fine" cannot be read across six visits
 * while "ate a little, refused tablets" can. Every part is optional: an
 * untouched form records nothing rather than recording a guess.
 */
function CareForm({
  categoryId,
  care,
  onChange,
  ml,
}: {
  categoryId: Subscription["categoryId"];
  care: CareNote;
  onChange: (care: CareNote) => void;
  ml: boolean;
}) {
  const readings = careReadings(categoryId);

  return (
    <div className="mt-1.5 rounded-lg border border-line bg-surf p-2">
      <p className="text-[10px] font-extrabold text-mid">
        {ml ? "വീട്ടുകാർക്കുള്ള വിവരം" : "For the family"}
      </p>

      {careFields(categoryId).map((field) => (
        <div key={field.id} className="mt-1.5">
          <p className="text-[10px] font-bold text-dim">{ml ? field.labelMl : field.label}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {field.options.map((o) => {
              const on = care[field.id] === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() =>
                    onChange({ ...care, [field.id]: on ? undefined : o.id } as CareNote)
                  }
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                    on ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
                  }`}
                >
                  {ml ? o.labelMl : o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {readings.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {readings.includes("bp") && (
            <>
              <span className="text-[10px] font-bold text-dim">BP</span>
              <input
                inputMode="numeric"
                value={care.bp?.sys ?? ""}
                onChange={(e) =>
                  onChange({
                    ...care,
                    bp: { sys: Number(e.target.value) || 0, dia: care.bp?.dia ?? 0 },
                  })
                }
                placeholder="120"
                className="w-12 rounded-lg border border-line bg-white px-1.5 py-1 text-center text-[11px] outline-none focus:border-kaam"
              />
              <span className="text-[11px] text-dim">/</span>
              <input
                inputMode="numeric"
                value={care.bp?.dia ?? ""}
                onChange={(e) =>
                  onChange({
                    ...care,
                    bp: { sys: care.bp?.sys ?? 0, dia: Number(e.target.value) || 0 },
                  })
                }
                placeholder="80"
                className="w-12 rounded-lg border border-line bg-white px-1.5 py-1 text-center text-[11px] outline-none focus:border-kaam"
              />
            </>
          )}
          {readings.includes("sugar") && (
            <>
              <span className="text-[10px] font-bold text-dim">{ml ? "ഷുഗർ" : "Sugar"}</span>
              <input
                inputMode="numeric"
                value={care.sugar ?? ""}
                onChange={(e) =>
                  onChange({ ...care, sugar: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="110"
                className="w-14 rounded-lg border border-line bg-white px-1.5 py-1 text-center text-[11px] outline-none focus:border-kaam"
              />
            </>
          )}
        </div>
      )}

      {/* Written down, not judged. What a number means is a doctor's call. */}
      {(care.bp || care.sugar) && (
        <p className="mt-1 text-[10px] leading-relaxed text-dim">
          {ml
            ? "വായിച്ചത് അതുപോലെ എഴുതൂ. അർത്ഥം ഡോക്ടർ പറയും."
            : "Write the reading as it shows. What it means is for their doctor."}
        </p>
      )}
    </div>
  );
}

/**
 * The worker's side: today's visits, and any that have gone by unrecorded.
 *
 * Nothing is ever marked automatically. Only the two people who were there
 * know whether a visit happened, and a plan that quietly ticked itself off
 * would be worth less than no record at all.
 */
export function WorkerSessions({ sub, context }: { sub: Subscription; context?: string }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [note, setNote] = useState("");
  const [care, setCare] = useState<CareNote>({});
  const [noting, setNoting] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const lesson = isTeachable(sub.categoryId);
  const caring = careRequired(sub.categoryId);

  if (!sub.visits) return null;

  const today = isoDate(now);
  const open = [
    ...plannedSessions(sub).filter((s) => s.date === today && !s.mark),
    ...unrecordedSessions(sub, now).filter((s) => s.date !== today),
  ];
  if (open.length === 0) return null;

  const mark = (date: string, status: "done" | "missed") => {
    updateSubscription(
      sub.id,
      markSessionPatch(sub, date, status, "worker", note, care, new Date()),
    );
    setNote("");
    setCare({});
    setNoting(null);
  };

  const open_ = (date: string) => {
    setNoting(date);
    setNote("");
    setCare({});
  };

  return (
    <div className="mt-2 rounded-xl border border-warn-mid bg-warn-light p-2.5">
      <p className="text-[11px] font-extrabold text-warn">
        📅 {ml ? "രേഖപ്പെടുത്താനുള്ള സന്ദർശനങ്ങൾ" : "Visits to record"}
      </p>
      {context && <p className="text-[10px] font-semibold text-warn/80">{context}</p>}
      <div className="mt-1.5 flex flex-col gap-1.5">
        {open.slice(0, 4).map((s) => (
          <div key={s.date} className="rounded-lg border border-line bg-white p-2">
            <p className="text-[11px] font-bold text-ink">
              {fmtDay(s.date, ml)} · {s.time}
              {lesson && ` · ${ml ? "പാഠം" : "lesson"} ${s.index}`}
            </p>
            {noting === s.date ? (
              <>
                {caring && <CareForm categoryId={sub.categoryId} care={care} onChange={setCare} ml={ml} />}
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    lesson
                      ? ml ? "എന്ത് പഠിപ്പിച്ചു?" : "What did you cover?"
                      : caring
                        ? ml ? "വീട്ടുകാർ അറിയേണ്ട മറ്റെന്തെങ്കിലും?" : "Anything else the family should know?"
                        : ml ? "എങ്ങനെയുണ്ടായിരുന്നു?" : "How were they today?"
                  }
                  className="mt-1.5 w-full rounded-lg border border-line px-2 py-1.5 text-[11px] outline-none focus:border-kaam"
                />
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    onClick={() => mark(s.date, "done")}
                    className="flex-1 rounded-lg bg-good py-1.5 text-[11px] font-extrabold text-white"
                  >
                    ✅ {ml ? "പൂർത്തിയായി" : "Done"}
                  </button>
                  <button
                    onClick={() => mark(s.date, "missed")}
                    className="flex-1 rounded-lg border border-kaam-mid bg-white py-1.5 text-[11px] font-bold text-kaam"
                  >
                    ✕ {ml ? "നടന്നില്ല" : "Didn't happen"}
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => open_(s.date)}
                className="mt-1.5 w-full rounded-lg border border-line bg-surf py-1.5 text-[11px] font-bold text-mid"
              >
                {ml ? "രേഖപ്പെടുത്തൂ" : "Record this visit"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
