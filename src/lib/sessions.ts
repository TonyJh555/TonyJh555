import { hasCareNote, type CareNote } from "./care-notes";
import type { SessionMark, Subscription, VisitPattern } from "./types";

/**
 * The visits a plan actually contains.
 *
 * A Care Plan or a lesson package was one payment and then silence: a family
 * paid for three months of a nurse and the app could not say when she was
 * next due, whether she came on Thursday, or how much of the term was left.
 * A parent paying for twelve piano lessons had no idea which lesson their
 * child was on. The money was recurring; nothing else was.
 *
 * The schedule is *derived* from a weekly pattern rather than stored as rows,
 * so a term is described by "Mon, Wed, Fri at 16:00" and not by ninety
 * records that can drift out of sync with it. Only what actually happened —
 * a visit marked done or missed — is written down, because that is the part
 * no formula can recreate.
 *
 * One engine for both, deliberately: a nurse's visit and a violin lesson are
 * the same shape, and the family checking either wants the same three
 * answers — when is the next one, did the last one happen, how many are left.
 */

/** One occurrence in a plan's term. */
export interface PlanSession {
  /** YYYY-MM-DD. */
  date: string;
  /** HH:MM, from the pattern. */
  time: string;
  /** 1-based position in the term, for "lesson 7 of 24". */
  index: number;
  /** What was recorded, if anything. */
  mark?: SessionMark;
}

export interface PlanProgress {
  total: number;
  done: number;
  missed: number;
  /** Sessions still ahead (neither past nor marked). */
  remaining: number;
  /** The next session due, or null once the term is finished. */
  next: PlanSession | null;
  /** The most recent session that has already passed. */
  last: PlanSession | null;
  /** 0..1, by sessions completed against the whole term. */
  fraction: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD for a date, in local time (dates here are calendar days). */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Weekday names for the pattern picker, Sunday first to match getDay(). */
export const WEEKDAYS = [
  { day: 0, short: "Sun", shortMl: "ഞായർ" },
  { day: 1, short: "Mon", shortMl: "തിങ്കൾ" },
  { day: 2, short: "Tue", shortMl: "ചൊവ്വ" },
  { day: 3, short: "Wed", shortMl: "ബുധൻ" },
  { day: 4, short: "Thu", shortMl: "വ്യാഴം" },
  { day: 5, short: "Fri", shortMl: "വെള്ളി" },
  { day: 6, short: "Sat", shortMl: "ശനി" },
] as const;

/**
 * Every session in the term, in order. Returns [] when no pattern has been
 * agreed yet — a plan without a schedule is a plan whose visits nobody has
 * settled, and inventing dates for it would be worse than showing none.
 */
export function plannedSessions(
  sub: Pick<Subscription, "startDate" | "renewsOn" | "visits" | "sessions">,
): PlanSession[] {
  const pattern = sub.visits;
  if (!pattern || pattern.days.length === 0) return [];

  const start = new Date(sub.startDate);
  const end = new Date(sub.renewsOn);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  const wanted = new Set(pattern.days);
  const marks = new Map((sub.sessions ?? []).map((m) => [m.date, m]));
  const out: PlanSession[] = [];

  // Walk calendar days from the start of the term to its renewal date.
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let index = 0;
  while (cursor.getTime() <= last.getTime()) {
    if (wanted.has(cursor.getDay())) {
      const date = isoDate(cursor);
      out.push({ date, time: pattern.time, index: ++index, mark: marks.get(date) });
    }
    cursor.setTime(cursor.getTime() + DAY_MS);
  }
  return out;
}

/** When a session falls, as a real timestamp. */
export function sessionAt(session: Pick<PlanSession, "date" | "time">): Date {
  return new Date(`${session.date}T${session.time}`);
}

/** Where the plan has got to. */
export function planProgress(
  sub: Pick<Subscription, "startDate" | "renewsOn" | "visits" | "sessions">,
  now: Date = new Date(),
): PlanProgress {
  const sessions = plannedSessions(sub);
  const done = sessions.filter((s) => s.mark?.status === "done").length;
  const missed = sessions.filter((s) => s.mark?.status === "missed").length;

  const upcoming = sessions.filter((s) => !s.mark && sessionAt(s).getTime() > now.getTime());
  const past = sessions.filter((s) => sessionAt(s).getTime() <= now.getTime());

  return {
    total: sessions.length,
    done,
    missed,
    remaining: upcoming.length,
    next: upcoming[0] ?? null,
    last: past[past.length - 1] ?? null,
    fraction: sessions.length === 0 ? 0 : done / sessions.length,
  };
}

/**
 * A session that has come and gone with nobody recording it. Shown to the
 * worker as something to close off, never auto-marked: only the two people
 * who were there know whether a visit happened.
 */
export function unrecordedSessions(
  sub: Pick<Subscription, "startDate" | "renewsOn" | "visits" | "sessions">,
  now: Date = new Date(),
): PlanSession[] {
  return plannedSessions(sub).filter(
    (s) => !s.mark && sessionAt(s).getTime() <= now.getTime(),
  );
}

/** Today's sessions for a plan — the worker's "what's on now" list. */
export function sessionsOn(
  sub: Pick<Subscription, "startDate" | "renewsOn" | "visits" | "sessions">,
  day: Date = new Date(),
): PlanSession[] {
  const date = isoDate(day);
  return plannedSessions(sub).filter((s) => s.date === date);
}

/**
 * Record what happened at one session. Re-marking the same date replaces the
 * earlier record rather than stacking, so a mistake can be corrected without
 * leaving two contradictory truths on the same visit.
 */
export function markSessionPatch(
  sub: Pick<Subscription, "sessions">,
  date: string,
  status: SessionMark["status"],
  by: SessionMark["by"],
  note?: string,
  care?: CareNote,
  now: Date = new Date(),
): Pick<Subscription, "sessions"> {
  const rest = (sub.sessions ?? []).filter((m) => m.date !== date);
  const trimmed = note?.trim();
  // A visit that did not happen has no handover — recording food and
  // medicines against it would be recording something nobody witnessed.
  const handover = status === "done" && hasCareNote(care) ? care : undefined;
  return {
    sessions: [
      ...rest,
      {
        date,
        status,
        by,
        at: now.toISOString(),
        ...(trimmed ? { note: trimmed } : {}),
        ...(handover ? { care: handover } : {}),
      },
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** "Mon, Wed, Fri at 4:00 pm" — the pattern in words. */
export function describePattern(pattern: VisitPattern | undefined, ml = false): string {
  if (!pattern || pattern.days.length === 0) return ml ? "സമയം ഉറപ്പിച്ചിട്ടില്ല" : "No days agreed yet";
  const days = [...pattern.days]
    .sort((a, b) => a - b)
    .map((d) => (ml ? WEEKDAYS[d].shortMl : WEEKDAYS[d].short))
    .join(", ");
  return ml ? `${days} · ${pattern.time}` : `${days} at ${pattern.time}`;
}
