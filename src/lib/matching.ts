import type { Worker } from "./types";

/**
 * Smart-matching score used to rank workers for a job.
 *
 * Weights (out of 100):
 * - proximity 35 — closer workers score higher, linear falloff to 10 km
 * - rating 30 — normalised from the 3.0–5.0 band customers actually see
 * - accept rate 20 — reliability of responding to job offers
 * - experience/volume 15 — jobs completed, saturating at 1,000
 *
 * Offline workers rank below every online worker regardless of score.
 */

const MAX_DISTANCE_KM = 10;
const JOBS_SATURATION = 1000;

export function matchScore(worker: Worker): number {
  const proximity = Math.max(0, 1 - worker.distanceKm / MAX_DISTANCE_KM) * 35;
  const rating = (Math.min(Math.max(worker.rating, 3), 5) - 3) / 2 * 30;
  const accept = Math.min(Math.max(worker.acceptRate, 0), 1) * 20;
  const volume = Math.min(worker.jobsDone / JOBS_SATURATION, 1) * 15;
  return Math.round((proximity + rating + accept + volume) * 10) / 10;
}

/** Rank workers for display: online first, then by match score. */
export function rankWorkers(workers: Worker[]): Worker[] {
  return [...workers].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return matchScore(b) - matchScore(a);
  });
}
