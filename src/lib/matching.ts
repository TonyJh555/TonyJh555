import type { Worker } from "./types";
import { etaMinutes, haversineKm, type LatLng } from "./geo";
import { tierRank, workerTier } from "./pro-tiers";

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

/**
 * Rank workers by real distance from the customer — nearest first, like Uber
 * and Swiggy. Each worker's `distanceKm`/`etaMinutes` are recomputed from the
 * customer's location so cards and the match score reflect where they actually
 * are. Online workers are surfaced above offline ones at the same distance.
 */
export function rankByProximity(workers: Worker[], from: LatLng): Worker[] {
  return workers
    .map((w) => {
      const distanceKm = Math.round(haversineKm(from, w.coords) * 10) / 10;
      return { ...w, distanceKm, etaMinutes: etaMinutes(distanceKm) };
    })
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      // Same distance → KAAM Pro tier first (the earned ranking perk), then
      // the finer-grained match score.
      const byTier = tierRank(workerTier(b).id) - tierRank(workerTier(a).id);
      if (byTier !== 0) return byTier;
      return matchScore(b) - matchScore(a);
    });
}
