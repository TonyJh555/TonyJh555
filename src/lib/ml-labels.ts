/**
 * Malayalam for the handful of labels that come out of date formatting rather
 * than out of a translated string.
 *
 * A chart axis reading "Mon Tue Wed" in the middle of an otherwise Malayalam
 * screen is the one place a worker has to fall back on English to know which
 * bar is today. These are the short forms Malayalam calendars actually print,
 * not transliterations.
 *
 * Everything here is a pure lookup with an English fallthrough, so a label the
 * formatter produces in some other locale is passed through untouched rather
 * than blanked.
 */

/** Mon…Sun → തി…ഞാ, in the same order `toLocaleDateString("en-IN")` emits. */
const WEEKDAYS: Record<string, string> = {
  Mon: "തി",
  Tue: "ചൊ",
  Wed: "ബു",
  Thu: "വ്യാ",
  Fri: "വെ",
  Sat: "ശ",
  Sun: "ഞാ",
};

/** Jan…Dec → ജനു…ഡിസം. */
const MONTHS: Record<string, string> = {
  Jan: "ജനു",
  Feb: "ഫെബ്",
  Mar: "മാർ",
  Apr: "ഏപ്രി",
  May: "മെയ്",
  Jun: "ജൂൺ",
  Jul: "ജൂലൈ",
  Aug: "ഓഗ",
  Sep: "സെപ്",
  Oct: "ഒക്ടോ",
  Nov: "നവം",
  Dec: "ഡിസം",
};

/**
 * "Mon" → "തി" when `ml`. Substitutes inside a longer label too, so the
 * heatmap's peak reading ("Sat 6–9 pm") is translated by the same call that
 * handles a bare axis tick.
 */
export function mlWeekday(label: string, ml: boolean): string {
  if (!ml) return label;
  return label.replace(/\b([A-Z][a-z]{2})\b/g, (m) => WEEKDAYS[m] ?? m);
}

/**
 * Translates any English month abbreviation inside a label, leaving the rest
 * alone — so "12 Jul" becomes "12 ജൂലൈ" and "Jul 2026" becomes "ജൂലൈ 2026"
 * without either call site having to know which shape it holds.
 */
export function mlMonth(label: string, ml: boolean): string {
  if (!ml) return label;
  return label.replace(/\b([A-Z][a-z]{2})\b/g, (m) => MONTHS[m] ?? m);
}
