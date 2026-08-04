/**
 * Tastings, site visits, and looking at what a company has actually built.
 *
 * These are not an inconvenience to be tolerated — they are how a wedding is
 * decided. Nobody hands over three lakhs for a sadya they have not eaten, and
 * no caterer prices a venue they have not seen. A platform that ignores this
 * is a platform where the real decision happens somewhere else, and whatever
 * happens somewhere else eventually gets booked there too.
 *
 * So they belong here, for two reasons that point the same way.
 *
 * The first is that it is simply a better product. Agreeing a tasting over
 * chat means six messages and a misremembered time; agreeing it here means one
 * proposal, one confirmation, and a date both sides can see. That alone is
 * worth doing.
 *
 * The second is quieter but matters more. The partner agreement says a
 * customer KAAM introduced stays with KAAM for a year — and a clause is only
 * as good as what can be shown. "They met through us" is an assertion. A
 * tasting proposed on the 3rd, confirmed on the 4th and marked done on the
 * 9th, for a wedding on the 14th of December, is a record. The point is not to
 * catch anybody; it is that a rule nobody can evidence gets quietly ignored by
 * the few who would, and then resented by the many who wouldn't.
 *
 * Free, always, and said so on the screen. The moment a tasting costs
 * something it happens off the platform and takes the booking with it.
 */

export type VisitKind = "tasting" | "site_visit" | "showcase";

export interface VisitKindMeta {
  id: VisitKind;
  label: string;
  labelMl: string;
  icon: string;
  /** Which side normally travels — it decides where the meeting is. */
  who: "company" | "customer";
  hint: string;
  hintMl: string;
}

export const VISIT_KINDS: VisitKindMeta[] = [
  {
    id: "tasting",
    label: "Food tasting",
    labelMl: "രുചി പരിശോധന",
    icon: "🍛",
    who: "customer",
    hint: "The customer comes and tastes the menu before deciding.",
    hintMl: "തീരുമാനിക്കുന്നതിന് മുൻപ് ഉപഭോക്താവ് വന്ന് ഭക്ഷണം രുചിച്ചു നോക്കുന്നു.",
  },
  {
    id: "site_visit",
    label: "Site visit",
    labelMl: "സ്ഥലം കാണൽ",
    icon: "📍",
    who: "company",
    hint: "The company sees the venue — the kitchen, the power, the space.",
    hintMl: "കമ്പനി വേദി കാണുന്നു — അടുക്കള, കറന്റ്, സ്ഥലം.",
  },
  {
    id: "showcase",
    label: "See past work",
    labelMl: "മുൻപത്തെ ജോലി കാണൽ",
    icon: "📸",
    who: "customer",
    hint: "The customer visits to see a setup the company has built before.",
    hintMl: "കമ്പനി മുൻപ് ചെയ്ത ഒരു സെറ്റപ്പ് ഉപഭോക്താവ് നേരിട്ട് കാണുന്നു.",
  },
];

export type VisitStatus = "proposed" | "confirmed" | "done" | "cancelled";

export interface EventVisit {
  id: string;
  requestId: string;
  companyId: string;
  kind: VisitKind;
  /** YYYY-MM-DD. */
  date: string;
  /** HH:MM, 24-hour. */
  time: string;
  /** Where to meet, in whoever proposed it's own words. */
  place: string;
  /** Which side put it forward — the other side is the one who confirms. */
  proposedBy: "customer" | "company";
  status: VisitStatus;
  createdAt: string;
  confirmedAt?: string;
  doneAt?: string;
}

export function visitKind(id: VisitKind): VisitKindMeta {
  return VISIT_KINDS.find((k) => k.id === id) ?? VISIT_KINDS[0];
}

/** Every visit between this customer and this company, soonest first. */
export function visitsFor(
  all: EventVisit[],
  requestId: string,
  companyId: string,
): EventVisit[] {
  return all
    .filter((v) => v.requestId === requestId && v.companyId === companyId)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

/** The next thing actually in the diary, if there is one. */
export function nextVisit(
  all: EventVisit[],
  requestId: string,
  companyId: string,
  now: Date = new Date(),
): EventVisit | undefined {
  const today = now.toISOString().slice(0, 10);
  return visitsFor(all, requestId, companyId).find(
    (v) => (v.status === "proposed" || v.status === "confirmed") && v.date >= today,
  );
}

/**
 * Is this side the one being asked to agree?
 *
 * Whoever proposed cannot also confirm — a meeting one party arranged with
 * itself is not an agreement, and the record would be worthless.
 */
export function awaitingConfirmation(
  visit: Pick<EventVisit, "status" | "proposedBy">,
  side: "customer" | "company",
): boolean {
  return visit.status === "proposed" && visit.proposedBy !== side;
}

export interface VisitProblem {
  field: "date" | "place";
  message: string;
  messageMl: string;
}

/** What is wrong with a proposed meeting, if anything. */
export function visitProblems(
  input: { date: string; place: string },
  eventDate: string,
): VisitProblem[] {
  const out: VisitProblem[] = [];
  if (!input.date) {
    out.push({
      field: "date",
      message: "Pick a day.",
      messageMl: "ഒരു ദിവസം തിരഞ്ഞെടുക്കൂ.",
    });
  } else if (eventDate && input.date > eventDate) {
    // A tasting after the wedding helps nobody.
    out.push({
      field: "date",
      message: "That is after the function itself — pick a day before it.",
      messageMl: "അത് പരിപാടിക്ക് ശേഷമാണ് — അതിന് മുൻപുള്ള ഒരു ദിവസം തിരഞ്ഞെടുക്കൂ.",
    });
  }
  if (input.place.trim().length < 3) {
    out.push({
      field: "place",
      message: "Say where to meet.",
      messageMl: "എവിടെ കാണണമെന്ന് പറയൂ.",
    });
  }
  return out;
}

/** The line that goes in the chat, so the thread carries the whole story. */
export function visitMessage(visit: EventVisit, ml = false): string {
  const k = visitKind(visit.kind);
  const when = `${visit.date} ${visit.time}`;
  if (ml) {
    return `${k.icon} ${k.labelMl} — ${when}, ${visit.place}`;
  }
  return `${k.icon} ${k.label} — ${when}, ${visit.place}`;
}
