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
            <SessionRow key={s.date} session={s} ml={ml} lesson={lesson} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session,
  ml,
  lesson,
  now,
}: {
  session: PlanSession;
  ml: boolean;
  lesson: boolean;
  now: Date;
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
 * The worker's side: today's visits, and any that have gone by unrecorded.
 *
 * Nothing is ever marked automatically. Only the two people who were there
 * know whether a visit happened, and a plan that quietly ticked itself off
 * would be worth less than no record at all.
 */
export function WorkerSessions({ sub }: { sub: Subscription }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const lesson = isTeachable(sub.categoryId);

  if (!sub.visits) return null;

  const today = isoDate(now);
  const open = [
    ...plannedSessions(sub).filter((s) => s.date === today && !s.mark),
    ...unrecordedSessions(sub, now).filter((s) => s.date !== today),
  ];
  if (open.length === 0) return null;

  const mark = (date: string, status: "done" | "missed") => {
    updateSubscription(sub.id, markSessionPatch(sub, date, status, "worker", note, new Date()));
    setNote("");
    setNoting(null);
  };

  return (
    <div className="mt-2 rounded-xl border border-warn-mid bg-warn-light p-2.5">
      <p className="text-[11px] font-extrabold text-warn">
        📅 {ml ? "രേഖപ്പെടുത്താനുള്ള സന്ദർശനങ്ങൾ" : "Visits to record"}
      </p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {open.slice(0, 4).map((s) => (
          <div key={s.date} className="rounded-lg border border-line bg-white p-2">
            <p className="text-[11px] font-bold text-ink">
              {fmtDay(s.date, ml)} · {s.time}
              {lesson && ` · ${ml ? "പാഠം" : "lesson"} ${s.index}`}
            </p>
            {noting === s.date ? (
              <>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    lesson
                      ? ml ? "എന്ത് പഠിപ്പിച്ചു?" : "What did you cover?"
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
                onClick={() => setNoting(s.date)}
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
