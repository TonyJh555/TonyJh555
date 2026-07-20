import type { Worker } from "./types";

/**
 * "Top rated" ranking — the honest version. A naive sort by star rating lets
 * a lucky 5.0★ from 2 reviews leapfrog a proven 4.9★ from 300, which is
 * exactly what makes "top rated" lists feel fake. We use a Bayesian (IMDb-
 * style) weighted rating that shrinks thin-evidence scores toward the roster
 * mean until enough genuine (mandatory) ratings back them up.
 *
 *   score = (v / (v + m)) · R  +  (m / (v + m)) · C
 *     R = the worker's star rating
 *     v = number of ratings behind it
 *     m = ratings needed before we fully trust R
 *     C = the roster's mean rating (the prior we shrink toward)
 *
 * Pure and framework-free, so the home row and its test share one truth.
 */

/** Ratings a worker needs before their score is trusted at face value. */
export const RATING_CONFIDENCE = 20;
/** The prior every worker is shrunk toward until they earn their rating. */
export const RATING_PRIOR = 4.5;

export function topRatedScore(
  worker: Pick<Worker, "rating" | "reviewCount">,
  confidence = RATING_CONFIDENCE,
  prior = RATING_PRIOR,
): number {
  const v = Math.max(0, worker.reviewCount);
  const R = worker.rating;
  return (v / (v + confidence)) * R + (confidence / (v + confidence)) * prior;
}

/** Workers ranked best-rated first (ties broken by who has more reviews). */
export function rankByRating<T extends Pick<Worker, "rating" | "reviewCount">>(workers: T[]): T[] {
  return [...workers].sort(
    (a, b) => topRatedScore(b) - topRatedScore(a) || b.reviewCount - a.reviewCount,
  );
}
