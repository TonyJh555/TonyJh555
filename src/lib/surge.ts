import type { Booking, KeralaDistrict, Worker } from "./types";

/**
 * Live surge pricing — the Uber marketplace balancer, replacing the old
 * static per-worker surge flag with real supply & demand:
 *
 * - demand: live jobs (requested/accepted) in a district over the last
 *   two hours
 * - supply: workers currently online there
 * - pressure = demand / supply → when a district runs hot, surge ×1.2
 *   switches on for every booking made there, and workers see it as a
 *   reason to go online — which is exactly what cools the surge back off.
 *
 * Pure and framework-free; callers overlay the result onto the roster
 * with `applySurge` (same pattern as presence).
 */

export const DEMAND_WINDOW_HOURS = 2;
/** A district needs at least this many live jobs before it can surge. */
export const MIN_SURGE_DEMAND = 2;
/** …and at least one live job per two online workers (pressure ≥ 0.5). */
export const SURGE_PRESSURE = 0.5;

export interface DistrictSurge {
  district: KeralaDistrict;
  /** Live jobs in the window. */
  demand: number;
  /** Workers online in the district. */
  supply: number;
  /** demand / supply (supply floored at 1). */
  pressure: number;
  surging: boolean;
}

export type SurgeMap = Partial<Record<KeralaDistrict, DistrictSurge>>;

export interface SurgeOpts {
  /** Live presence override (the GO toggle); defaults to the seed flag. */
  isOnline?: (worker: Worker) => boolean;
  now?: Date;
}

/** Compute live surge state for every district that has workers. */
export function surgeMap(bookings: Booking[], workers: Worker[], opts: SurgeOpts = {}): SurgeMap {
  const now = opts.now ?? new Date();
  const windowStart = now.getTime() - DEMAND_WINDOW_HOURS * 3600_000;
  const districtOf = new Map(workers.map((w) => [w.id, w.district]));

  const demand = new Map<KeralaDistrict, number>();
  for (const b of bookings) {
    if (b.status !== "requested" && b.status !== "accepted") continue;
    const t = new Date(b.createdAt).getTime();
    if (t < windowStart || t > now.getTime()) continue;
    const district = districtOf.get(b.workerId);
    if (!district) continue;
    demand.set(district, (demand.get(district) ?? 0) + 1);
  }

  const supply = new Map<KeralaDistrict, number>();
  for (const w of workers) {
    if (!(opts.isOnline?.(w) ?? w.online)) continue;
    supply.set(w.district, (supply.get(w.district) ?? 0) + 1);
  }

  const map: SurgeMap = {};
  for (const district of new Set(workers.map((w) => w.district))) {
    const d = demand.get(district) ?? 0;
    const s = supply.get(district) ?? 0;
    const pressure = d / Math.max(1, s);
    map[district] = {
      district,
      demand: d,
      supply: s,
      pressure,
      surging: d >= MIN_SURGE_DEMAND && pressure >= SURGE_PRESSURE,
    };
  }
  return map;
}

/** Is this district running hot right now? */
export function isSurging(map: SurgeMap, district: KeralaDistrict): boolean {
  return map[district]?.surging ?? false;
}

/**
 * Roster with the live surge state applied — worker cards, profiles, and
 * quotes all read `worker.surge`, so overlaying here updates them all.
 */
export function applySurge(workers: Worker[], map: SurgeMap): Worker[] {
  return workers.map((w) => {
    const surging = isSurging(map, w.district);
    return surging === w.surge ? w : { ...w, surge: surging };
  });
}
