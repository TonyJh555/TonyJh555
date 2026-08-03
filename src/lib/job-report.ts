import type { CategoryId } from "./types";
import { billingNature } from "./price-model";

/**
 * What the worker leaves behind after a repair.
 *
 * One short record does four jobs at once:
 *
 *  - a replacement worker knows what was already done, so a job abandoned
 *    halfway can be picked up instead of started again;
 *  - it settles "he didn't fix it properly" three weeks later;
 *  - it is the customer's evidence in a complaint;
 *  - it is the *worker's* evidence when they are the one accused.
 *
 * It is built out of taps, not sentences. The person writing it may have left
 * school at fourteen and is standing on a ladder with one hand free — a text
 * box would be left empty, and an empty report is worse than none because
 * everyone assumes it says something.
 *
 * The same shape as the carer's handover in care-notes.ts, for the same
 * reason: record what happened, never interpret it.
 */

export type DidId = "diagnosed" | "replaced" | "cleaned" | "rewired" | "installed" | "tested";
export type LeftId = "nothing" | "needs_part" | "second_visit" | "customer_decides";

export interface ReportOption<T extends string> {
  id: T;
  label: string;
  labelMl: string;
}

/** What was done. At least one is required — that is the whole report. */
export const DID_OPTIONS: ReportOption<DidId>[] = [
  { id: "diagnosed", label: "Checked & diagnosed", labelMl: "പരിശോധിച്ചു" },
  { id: "replaced", label: "Replaced a part", labelMl: "പാർട്സ് മാറ്റി" },
  { id: "cleaned", label: "Cleaned / serviced", labelMl: "വൃത്തിയാക്കി" },
  { id: "rewired", label: "Wiring / fitting work", labelMl: "വയറിംഗ് / ഫിറ്റിംഗ്" },
  { id: "installed", label: "Installed something new", labelMl: "പുതിയത് ഘടിപ്പിച്ചു" },
  { id: "tested", label: "Tested — working now", labelMl: "പരീക്ഷിച്ചു — ഇപ്പോൾ ശരിയാണ്" },
];

/** What is still outstanding. Exactly one, and it decides what happens next. */
export const LEFT_OPTIONS: ReportOption<LeftId>[] = [
  { id: "nothing", label: "Nothing — the job is finished", labelMl: "ഒന്നുമില്ല — ജോലി തീർന്നു" },
  { id: "needs_part", label: "A part has to be bought", labelMl: "ഒരു പാർട്സ് വാങ്ങണം" },
  { id: "second_visit", label: "Needs another visit", labelMl: "ഒരിക്കൽ കൂടി വരണം" },
  { id: "customer_decides", label: "Waiting on the customer to decide", labelMl: "ഉപഭോക്താവ് തീരുമാനിക്കണം" },
];

export interface JobReport {
  /** What was done. Never empty in a saved report. */
  did: DidId[];
  /** What remains. */
  left: LeftId;
  /** The part used or needed — one short line, not a paragraph. */
  part?: string;
  /** Photographs of the work, as data URLs. */
  photos: string[];
  /** A spoken note, for a worker who would rather talk than type. */
  voice?: string;
  /** When it was written (ISO). */
  at: string;
}

/**
 * Does this trade owe a report?
 *
 * Only the metered repair trades. A violinist has nothing to hand over, and a
 * carer already writes the richer visit note in care-notes.ts.
 */
export function reportRequired(categoryId: CategoryId): boolean {
  return billingNature(categoryId) === "metered";
}

/** Enough to be worth saving: what was done, and what is left. */
export function reportComplete(report: Partial<JobReport> | undefined): boolean {
  return Boolean(report && (report.did?.length ?? 0) > 0 && report.left);
}

/**
 * Is there still work to do after this visit?
 *
 * The one question that decides whether a customer is offered another visit
 * and, if the worker never returns, whether the job can be handed to someone
 * else.
 */
export function workRemains(report: JobReport | undefined): boolean {
  return Boolean(report && report.left !== "nothing");
}

function labelFor<T extends string>(options: ReportOption<T>[], id: T, ml: boolean): string {
  const found = options.find((o) => o.id === id);
  return found ? (ml ? found.labelMl : found.label) : id;
}

/** One line for a booking card, a chat message or the next worker's brief. */
export function reportSummary(report: JobReport | undefined, ml = false): string {
  if (!reportComplete(report)) return "";
  const r = report!;
  const did = r.did.map((d) => labelFor(DID_OPTIONS, d, ml)).join(", ");
  const left = labelFor(LEFT_OPTIONS, r.left, ml);
  const parts = [did];
  if (r.part?.trim()) parts.push(`${ml ? "പാർട്സ്" : "Part"}: ${r.part.trim()}`);
  parts.push(`${ml ? "ബാക്കി" : "Left"}: ${left}`);
  return parts.join(" · ");
}

/**
 * The brief handed to whoever picks the job up next.
 *
 * Written in the second person because it is read by a stranger standing in
 * the same doorway, not by a filing system.
 */
export function handoverBrief(report: JobReport | undefined, ml = false): string | null {
  if (!workRemains(report)) return null;
  const r = report!;
  const did = r.did.map((d) => labelFor(DID_OPTIONS, d, ml)).join(", ");
  const left = labelFor(LEFT_OPTIONS, r.left, ml);
  const part = r.part?.trim();
  if (ml) {
    return (
      `മുൻപത്തെ ആൾ ചെയ്തത്: ${did}. ബാക്കിയുള്ളത്: ${left}` +
      (part ? ` (${part})` : "") +
      (r.photos.length > 0 ? ` · ${r.photos.length} ഫോട്ടോ ഉണ്ട്` : "")
    );
  }
  return (
    `Already done: ${did}. Still to do: ${left}` +
    (part ? ` (${part})` : "") +
    (r.photos.length > 0 ? ` · ${r.photos.length} photo${r.photos.length === 1 ? "" : "s"} attached` : "")
  );
}
