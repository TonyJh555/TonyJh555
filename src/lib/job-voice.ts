import type { Lang } from "./i18n";

/**
 * Spoken job announcements for the worker queue — accessibility for skilled
 * workers who read little. A worker taps 🔊 and hears the job's essentials
 * (trade, pay, how far, where) read aloud instead of straining to read a card.
 *
 * Pure and framework-free so it's unit-tested; the worker page feeds it
 * resolved values and speaks the result with the Web Speech API (use-voice.ts).
 * The trade name and place are inserted verbatim, so the caller is the one that
 * decides which language they arrive in — and for a Malayalam sentence it must
 * pass the Malayalam name. A Malayalam voice handed Latin script does not read
 * "Electrician", it mangles it, and the whole point of this feature is the
 * worker who was never going to read the card.
 */
export interface JobAnnouncement {
  /** Trade/service label, e.g. "Plumbing" (kept as-is inside the sentence). */
  trade: string;
  /** Worker's take-home for the job, in ₹. */
  pay: number;
  /** Distance from the worker, in km. */
  km: number;
  /** Locality / address, e.g. "Kochi". */
  place: string;
}

/** Round a distance the way it's spoken: 1 decimal, but whole when it's whole. */
function sayKm(km: number): string {
  const r = Math.round(km * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Build the sentence read aloud for one job offer, in the given language.
 * Malayalam by default in the worker app (the target user), English available.
 */
export function announceJob(a: JobAnnouncement, lang: Lang): string {
  const pay = Math.round(a.pay);
  const km = sayKm(a.km);
  if (lang === "ml") {
    return `പുതിയ ${a.trade} ജോലി. കൂലി ${pay} രൂപ. നിങ്ങളിൽ നിന്ന് ഏകദേശം ${km} കിലോമീറ്റർ അകലെ. സ്ഥലം ${a.place}.`;
  }
  return `New ${a.trade} job. Pay ${pay} rupees. About ${km} kilometres from you. Location ${a.place}.`;
}
