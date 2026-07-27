import type { Worker } from "./types";

/**
 * Worker badges — and the rule that keeps them honest.
 *
 * A badge may only claim something KAAM can actually check. Every badge here
 * is derived from a field the platform holds and could defend if a customer
 * asked "how do you know?": the KYC desk approved this person's ID, this many
 * jobs were completed on KAAM, these ratings were left by paying customers.
 *
 * What used to be here was a fixed pool — "Police Verified 🔵", "Insured 🛡️",
 * "Background Checked ✅" — dealt out at random to the roster. KAAM runs no
 * police check, carries no insurance and buys no background reports, so those
 * were claims the company could not stand behind. In a marketplace that sends
 * strangers into people's homes, and especially to look after their children
 * and their elderly, an unearned safety badge is not marketing — it is the
 * single most expensive sentence in the product.
 *
 * If KAAM later buys real insurance or commissions real police verification,
 * add the field, verify it per worker, and derive the badge here. Never the
 * other way round.
 */

export interface Badge {
  label: string;
  labelMl: string;
  /** What backs this claim, shown on the worker's profile. */
  basis: string;
  basisMl: string;
}

/** Rating high enough, and rated often enough for it to mean something. */
const TOP_RATED_MIN = 4.8;
const TOP_RATED_MIN_REVIEWS = 25;
const EXPERIENCED_YEARS = 8;
const ESTABLISHED_JOBS = 500;

/**
 * The badges a worker has actually earned, strongest first. Pure, so the
 * badge shown is testable against the data that produced it.
 */
export function earnedBadges(
  worker: Pick<Worker, "verified" | "rating" | "reviewCount" | "experienceYears" | "jobsDone">,
): Badge[] {
  const out: Badge[] = [];

  if (worker.verified) {
    out.push({
      label: "ID verified ✅",
      labelMl: "ഐഡി പരിശോധിച്ചു ✅",
      basis: "Aadhaar checked by the KAAM verification desk before this worker could take jobs.",
      basisMl: "ജോലി എടുക്കുന്നതിന് മുൻപ് കാം വെരിഫിക്കേഷൻ ഡെസ്ക് ആധാർ പരിശോധിച്ചു.",
    });
  }

  if (worker.rating >= TOP_RATED_MIN && worker.reviewCount >= TOP_RATED_MIN_REVIEWS) {
    out.push({
      label: "Top rated ⭐",
      labelMl: "ടോപ് റേറ്റഡ് ⭐",
      basis: `${worker.rating.toFixed(1)}★ from ${worker.reviewCount} customers who paid for the job.`,
      basisMl: `പണം നൽകിയ ${worker.reviewCount} ഉപഭോക്താക്കളിൽ നിന്ന് ${worker.rating.toFixed(1)}★.`,
    });
  }

  if (worker.jobsDone >= ESTABLISHED_JOBS) {
    out.push({
      label: `${Math.floor(worker.jobsDone / 100) * 100}+ jobs done`,
      labelMl: `${Math.floor(worker.jobsDone / 100) * 100}+ ജോലികൾ`,
      basis: "Jobs completed and paid for, counted by KAAM.",
      basisMl: "കാം എണ്ണിയ, പൂർത്തിയാക്കി പണം നൽകിയ ജോലികൾ.",
    });
  }

  if (worker.experienceYears >= EXPERIENCED_YEARS) {
    out.push({
      label: `${worker.experienceYears} yrs experience`,
      labelMl: `${worker.experienceYears} വർഷ പരിചയം`,
      basis: "Years in the trade, declared at sign-up.",
      basisMl: "സൈൻ അപ്പ് ചെയ്യുമ്പോൾ സ്വയം രേഖപ്പെടുത്തിയ പരിചയം.",
    });
  }

  return out;
}
