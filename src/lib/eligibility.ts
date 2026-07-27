import { getCategory } from "@/data/categories";
import type { CategoryId, Worker } from "./types";

/**
 * Who is allowed to serve a category at all — the rule that must hold
 * everywhere, not just where somebody remembered it.
 *
 * Home nursing, baby sitting, beauty and massage are women-only on KAAM. That
 * is not a preference the customer toggles; it is a promise the platform makes
 * about who can be sent into a house. It was previously declared on the
 * category (`femaleWorkersOnly`) and honoured in exactly one place — the seed
 * generator — so search, dispatch and the "choose another worker" list would
 * all have happily offered a man the moment a real signup or an admin edit
 * broke the pattern the seed happened to follow.
 *
 * A promise enforced only by the shape of test data is not enforced. Every
 * path that can put a worker in front of a customer now goes through here.
 */

/** Categories only women workers may serve. */
export function womenOnly(categoryId: CategoryId): boolean {
  return getCategory(categoryId).femaleWorkersOnly === true;
}

/**
 * May this worker be shown, offered or assigned for this category?
 *
 * Note the direction of the default: a worker whose `female` flag is missing
 * is NOT eligible for a women-only category. An unknown must never resolve to
 * "send them anyway" — the whole point is that the customer is trusting the
 * platform on this.
 */
export function canServe(worker: Pick<Worker, "categoryId" | "female">, categoryId: CategoryId): boolean {
  if (worker.categoryId !== categoryId) return false;
  return !womenOnly(categoryId) || worker.female === true;
}

/** Everyone eligible to serve this category, in the order given. */
export function eligibleWorkers(workers: Worker[], categoryId: CategoryId): Worker[] {
  return workers.filter((w) => canServe(w, categoryId));
}

/** The promise, in both languages, for the categories that carry it. */
export function womenOnlyNote(categoryId: CategoryId): { en: string; ml: string } | null {
  if (!womenOnly(categoryId)) return null;
  return {
    en: "Only women workers — always, for every booking in this service.",
    ml: "സ്ത്രീ തൊഴിലാളികൾ മാത്രം — ഈ സേവനത്തിലെ എല്ലാ ബുക്കിംഗിനും.",
  };
}
