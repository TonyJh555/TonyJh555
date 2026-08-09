import type { CategoryId, SessionMark } from "./types";

/**
 * The handover — what the carer leaves behind after a visit.
 *
 * A family paying for a home nurse three days a week gets a bill and a tick.
 * They do not get the one thing they are actually paying for: did amma eat,
 * did she take her tablets, was she herself today, what was her BP. That
 * conversation happens on the phone if it happens at all, and it disappears.
 * When the daughter in Dubai asks how the week went, nobody can answer, and
 * when the doctor asks at the next appointment, nobody can answer either.
 *
 * Recorded, never interpreted. A carer writes down 150/95; KAAM says that is
 * outside the usual range and worth mentioning to the doctor. It does not say
 * what it means, and it never suggests a medicine or a dose — that is a
 * doctor's job and pretending otherwise would be the most dangerous thing
 * this app could do.
 *
 * Structured rather than free text, because "she was fine" cannot be read
 * across six visits and "ate a little, refused tablets" can. The free note
 * stays for everything a form cannot hold.
 *
 * Stored inside the visit record that already exists (SessionMark.care), so
 * a plan's history stays one list and nothing new has to be kept in step.
 */

export type CareFieldId = "ate" | "meds" | "mood" | "sleep";
export type ReadingId = "bp" | "sugar";

export interface CareOption {
  id: string;
  label: string;
  labelMl: string;
  /** True where the family should be told, not just shown. */
  concern?: boolean;
}

export interface CareField {
  id: CareFieldId;
  label: string;
  labelMl: string;
  options: CareOption[];
}

/** One visit's record. Every part optional — a blank answer is "didn't apply". */
export interface CareNote {
  ate?: "all" | "some" | "none";
  meds?: "given" | "refused" | "none_due";
  mood?: "bright" | "ok" | "low" | "unsettled";
  sleep?: "well" | "broken" | "poorly";
  /** Blood pressure as it read on the machine. */
  bp?: { sys: number; dia: number };
  /** Blood sugar, mg/dL. */
  sugar?: number;
}

const ATE: CareField = {
  id: "ate",
  label: "Food",
  labelMl: "ഭക്ഷണം",
  options: [
    { id: "all", label: "Ate well", labelMl: "നന്നായി കഴിച്ചു" },
    { id: "some", label: "Ate a little", labelMl: "കുറച്ച് കഴിച്ചു" },
    { id: "none", label: "Didn't eat", labelMl: "കഴിച്ചില്ല", concern: true },
  ],
};

const MEDS: CareField = {
  id: "meds",
  label: "Medicines",
  labelMl: "മരുന്ന്",
  options: [
    { id: "given", label: "Taken on time", labelMl: "സമയത്ത് കഴിച്ചു" },
    { id: "refused", label: "Refused", labelMl: "കഴിക്കാൻ കൂട്ടാക്കിയില്ല", concern: true },
    { id: "none_due", label: "None due", labelMl: "ഇന്ന് ഒന്നുമില്ല" },
  ],
};

const MOOD: CareField = {
  id: "mood",
  label: "How they were",
  labelMl: "എങ്ങനെയുണ്ടായിരുന്നു",
  options: [
    { id: "bright", label: "Cheerful", labelMl: "സന്തോഷത്തിൽ" },
    { id: "ok", label: "As usual", labelMl: "പതിവുപോലെ" },
    { id: "low", label: "Quiet, low", labelMl: "മൗനമായി, വിഷമത്തിൽ", concern: true },
    { id: "unsettled", label: "Restless, upset", labelMl: "അസ്വസ്ഥനായി", concern: true },
  ],
};

const SLEEP: CareField = {
  id: "sleep",
  label: "Sleep",
  labelMl: "ഉറക്കം",
  options: [
    { id: "well", label: "Slept well", labelMl: "നന്നായി ഉറങ്ങി" },
    { id: "broken", label: "Broken sleep", labelMl: "ഇടയ്ക്കിടെ ഉണർന്നു" },
    { id: "poorly", label: "Barely slept", labelMl: "ഉറങ്ങിയില്ല", concern: true },
  ],
};

/** A baby sitter is asked about the child, not about tablets and blood pressure. */
const CHILD_MOOD: CareField = {
  ...MOOD,
  options: [
    { id: "bright", label: "Happy, playful", labelMl: "സന്തോഷത്തിൽ, കളിച്ചു" },
    { id: "ok", label: "As usual", labelMl: "പതിവുപോലെ" },
    { id: "low", label: "Clingy, quiet", labelMl: "പറ്റിച്ചേർന്ന്, മൗനമായി", concern: true },
    { id: "unsettled", label: "Crying, unsettled", labelMl: "കരഞ്ഞു, അസ്വസ്ഥനായി", concern: true },
  ],
};

const CHILD_SLEEP: CareField = {
  id: "sleep",
  label: "Nap",
  labelMl: "ഉറക്കം",
  options: [
    { id: "well", label: "Napped well", labelMl: "നന്നായി ഉറങ്ങി" },
    { id: "broken", label: "Short nap", labelMl: "കുറച്ച് നേരം" },
    { id: "poorly", label: "No nap", labelMl: "ഉറങ്ങിയില്ല" },
  ],
};

interface CareShape {
  fields: CareField[];
  readings: ReadingId[];
}

const SHAPES: Partial<Record<CategoryId, CareShape>> = {
  nurse: { fields: [ATE, MEDS, MOOD, SLEEP], readings: ["bp", "sugar"] },
  eldercare: { fields: [ATE, MEDS, MOOD, SLEEP], readings: ["bp"] },
  // The family paying for a bystander is usually not in the state, let alone
  // the ward. This note is the only thing they get from the night.
  bystander: { fields: [ATE, MEDS, MOOD, SLEEP], readings: ["bp", "sugar"] },
  babysitter: { fields: [ATE, CHILD_MOOD, CHILD_SLEEP], readings: [] },
};

/** Trades where somebody is looked after and the family is not in the room. */
export function careRequired(categoryId: CategoryId): boolean {
  return categoryId in SHAPES;
}

/** What this carer is asked after a visit. */
export function careFields(categoryId: CategoryId): CareField[] {
  return SHAPES[categoryId]?.fields ?? [];
}

/** Readings this carer takes — a baby sitter takes none. */
export function careReadings(categoryId: CategoryId): ReadingId[] {
  return SHAPES[categoryId]?.readings ?? [];
}

function optionFor(field: CareField, value: string | undefined): CareOption | undefined {
  return value ? field.options.find((o) => o.id === value) : undefined;
}

/** Has anything at all been recorded? */
export function hasCareNote(care: CareNote | undefined): boolean {
  if (!care) return false;
  return Boolean(care.ate || care.meds || care.mood || care.sleep || care.bp || care.sugar);
}

export type ReadingBand = "low" | "usual" | "high";

/**
 * Where a reading sits against the ordinary range. Bands, not diagnoses: the
 * only thing KAAM ever concludes is "worth mentioning", and the only person
 * who concludes anything else is a doctor.
 */
export function bpBand(sys: number, dia: number): ReadingBand {
  if (sys < 90 || dia < 60) return "low";
  if (sys >= 140 || dia >= 90) return "high";
  return "usual";
}

export function sugarBand(mgdl: number): ReadingBand {
  if (mgdl < 70) return "low";
  if (mgdl > 180) return "high";
  return "usual";
}

export function formatBp(bp: { sys: number; dia: number }): string {
  return `${bp.sys}/${bp.dia}`;
}

export interface CareConcern {
  /** What the family is told, plainly. */
  text: string;
  textMl: string;
  /** A reading outside the usual range, as opposed to an observation. */
  reading?: boolean;
}

/**
 * What the family should be told about this visit — not a summary, only the
 * parts that are worth a phone call. Readings come first: a number outside
 * the range is the one thing a doctor may want to hear today.
 */
export function careConcerns(care: CareNote | undefined, categoryId?: CategoryId): CareConcern[] {
  if (!care) return [];
  const out: CareConcern[] = [];

  if (care.bp) {
    const band = bpBand(care.bp.sys, care.bp.dia);
    if (band !== "usual") {
      const v = formatBp(care.bp);
      out.push({
        text: `Blood pressure ${v} — ${band === "high" ? "higher" : "lower"} than the usual range. Worth mentioning to their doctor.`,
        textMl: `രക്തസമ്മർദ്ദം ${v} — പതിവിലും ${band === "high" ? "കൂടുതൽ" : "കുറവ്"}. ഡോക്ടറോട് പറയുന്നത് നല്ലതാണ്.`,
        reading: true,
      });
    }
  }

  if (typeof care.sugar === "number") {
    const band = sugarBand(care.sugar);
    if (band !== "usual") {
      out.push({
        text: `Blood sugar ${care.sugar} — ${band === "high" ? "higher" : "lower"} than the usual range. Worth mentioning to their doctor.`,
        textMl: `ഷുഗർ ${care.sugar} — പതിവിലും ${band === "high" ? "കൂടുതൽ" : "കുറവ്"}. ഡോക്ടറോട് പറയുന്നത് നല്ലതാണ്.`,
        reading: true,
      });
    }
  }

  const fields = careFields(categoryId ?? "nurse");
  for (const field of fields) {
    const opt = optionFor(field, care[field.id]);
    if (opt?.concern) {
      out.push({ text: `${field.label}: ${opt.label}`, textMl: `${field.labelMl}: ${opt.labelMl}` });
    }
  }

  return out;
}

export interface HandoverPart {
  text: string;
  /** True for the parts a family should not skim past. */
  concern: boolean;
}

/**
 * The visit broken into its parts, in reading order, each marked if it is one
 * of the ones that matter. The screen can then emphasise "Didn't eat" in
 * place rather than repeating it underneath as a warning — a family reading
 * the same fact twice starts skipping the second copy, which is the one the
 * warnings live in.
 */
export function handoverParts(
  care: CareNote | undefined,
  ml = false,
  categoryId: CategoryId = "nurse",
): HandoverPart[] {
  if (!hasCareNote(care)) return [];
  const parts: HandoverPart[] = [];

  for (const field of careFields(categoryId)) {
    const opt = optionFor(field, care![field.id]);
    if (opt) parts.push({ text: ml ? opt.labelMl : opt.label, concern: Boolean(opt.concern) });
  }
  if (care!.bp) {
    parts.push({
      text: `BP ${formatBp(care!.bp)}`,
      concern: bpBand(care!.bp.sys, care!.bp.dia) !== "usual",
    });
  }
  if (typeof care!.sugar === "number") {
    parts.push({
      text: `${ml ? "ഷുഗർ" : "Sugar"} ${care!.sugar}`,
      concern: sugarBand(care!.sugar) !== "usual",
    });
  }

  return parts;
}

/**
 * The visit in one line — what a son reads on his phone at 8pm without
 * opening anything. "Ate well · Taken on time · As usual · BP 130/85".
 */
export function handoverLine(
  care: CareNote | undefined,
  ml = false,
  categoryId: CategoryId = "nurse",
): string {
  return handoverParts(care, ml, categoryId)
    .map((p) => p.text)
    .join(" · ");
}

export interface CareTrend {
  /** Recorded visits this looks across. */
  visits: number;
  ateWell: number;
  didNotEat: number;
  medsGiven: number;
  medsRefused: number;
  lowMood: number;
  /** Visits with at least one thing worth telling the family. */
  flagged: number;
  lastBp?: { date: string; sys: number; dia: number };
  lastSugar?: { date: string; value: number };
}

/**
 * The last few visits read together — the part a single note can never give
 * you. One refused tablet is a bad morning; four in six visits is something
 * the family needs to know before the next appointment.
 */
export function careTrend(
  marks: SessionMark[] | undefined,
  categoryId: CategoryId = "nurse",
  limit = 6,
): CareTrend {
  const recorded = (marks ?? [])
    .filter((m) => m.status === "done" && hasCareNote(m.care))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);

  const trend: CareTrend = {
    visits: recorded.length,
    ateWell: 0,
    didNotEat: 0,
    medsGiven: 0,
    medsRefused: 0,
    lowMood: 0,
    flagged: 0,
  };

  for (const m of recorded) {
    const care = m.care!;
    if (care.ate === "all") trend.ateWell++;
    if (care.ate === "none") trend.didNotEat++;
    if (care.meds === "given") trend.medsGiven++;
    if (care.meds === "refused") trend.medsRefused++;
    if (care.mood === "low" || care.mood === "unsettled") trend.lowMood++;
    if (careConcerns(care, categoryId).length > 0) trend.flagged++;
    if (care.bp) trend.lastBp = { date: m.date, ...care.bp };
    if (typeof care.sugar === "number") trend.lastSugar = { date: m.date, value: care.sugar };
  }

  return trend;
}

/**
 * A pattern across visits, in one sentence, or null when there is nothing to
 * say. Deliberately silent most of the time — a banner that appears every
 * week is a banner nobody reads on the week that matters.
 */
export function trendWarning(trend: CareTrend, ml = false): string | null {
  if (trend.visits < 3) return null;

  if (trend.medsRefused >= 2) {
    return ml
      ? `അവസാന ${trend.visits} സന്ദർശനങ്ങളിൽ ${trend.medsRefused} തവണ മരുന്ന് കഴിച്ചില്ല.`
      : `Medicines were refused ${trend.medsRefused} of the last ${trend.visits} visits.`;
  }
  if (trend.didNotEat >= 2) {
    return ml
      ? `അവസാന ${trend.visits} സന്ദർശനങ്ങളിൽ ${trend.didNotEat} തവണ ഭക്ഷണം കഴിച്ചില്ല.`
      : `They didn't eat on ${trend.didNotEat} of the last ${trend.visits} visits.`;
  }
  if (trend.lowMood >= 3) {
    return ml
      ? `അവസാന ${trend.visits}-ൽ ${trend.lowMood} ദിവസവും വിഷമത്തിലായിരുന്നു.`
      : `Low or unsettled on ${trend.lowMood} of the last ${trend.visits} visits.`;
  }
  return null;
}
