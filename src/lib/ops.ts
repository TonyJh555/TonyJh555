import type { Booking, CategoryId, KeralaDistrict, Worker } from "./types";
import { surgeMap } from "./surge";

/**
 * Live operations snapshot — the marketplace "mission control" an ops team
 * watches in real time: how many jobs are hunting for a worker right now,
 * how many are en route or in progress, who's online, and which districts
 * are surging. Pure and framework-free, computed from the same live data
 * the rest of the app runs on.
 */

export interface ActiveJob {
  id: string;
  workerName: string;
  categoryId: CategoryId;
  district?: KeralaDistrict;
  status: "requested" | "accepted" | "in_progress";
  ageMinutes: number;
  /** Dispatch attempt (how many workers the offer has passed through). */
  attempt: number;
  address?: string;
}

export interface OpsSnapshot {
  /** Requested jobs still hunting for a worker. */
  hunting: number;
  /** Accepted — a worker is on the way. */
  enRoute: number;
  /** In progress right now. */
  working: number;
  completedToday: number;
  cancelledToday: number;
  onlineWorkers: number;
  awayWorkers: number;
  surgingDistricts: KeralaDistrict[];
  /** Active jobs, most urgent first (hunting → oldest first). */
  activeJobs: ActiveJob[];
  /** Average minutes the currently-hunting jobs have waited. */
  avgWaitMinutes: number;
}

export interface OpsOpts {
  isOnline?: (worker: Worker) => boolean;
  isAway?: (workerId: string) => boolean;
  now?: Date;
}

const STATUS_RANK: Record<ActiveJob["status"], number> = {
  requested: 0,
  accepted: 1,
  in_progress: 2,
};

export function opsSnapshot(bookings: Booking[], workers: Worker[], opts: OpsOpts = {}): OpsSnapshot {
  const now = opts.now ?? new Date();
  const districtOf = new Map(workers.map((w) => [w.id, w.district]));
  const today = now.toDateString();
  const ageMin = (iso: string) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));

  const activeJobs: ActiveJob[] = bookings
    .filter((b) => b.status === "requested" || b.status === "accepted" || b.status === "in_progress")
    .map((b) => ({
      id: b.id,
      workerName: b.workerName,
      categoryId: b.categoryId,
      district: districtOf.get(b.workerId),
      status: b.status as ActiveJob["status"],
      ageMinutes: ageMin(b.createdAt),
      attempt: b.dispatch?.attempt ?? 1,
      address: b.address,
    }))
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.ageMinutes - a.ageMinutes);

  const hunting = activeJobs.filter((j) => j.status === "requested");
  const surging = surgeMap(bookings, workers, { isOnline: opts.isOnline, now });

  return {
    hunting: hunting.length,
    enRoute: activeJobs.filter((j) => j.status === "accepted").length,
    working: activeJobs.filter((j) => j.status === "in_progress").length,
    completedToday: bookings.filter(
      (b) => b.status === "completed" && new Date(b.createdAt).toDateString() === today,
    ).length,
    cancelledToday: bookings.filter(
      (b) => b.status === "cancelled" && new Date(b.createdAt).toDateString() === today,
    ).length,
    onlineWorkers: workers.filter((w) => opts.isOnline?.(w) ?? w.online).length,
    awayWorkers: workers.filter((w) => opts.isAway?.(w.id) ?? false).length,
    surgingDistricts: Object.values(surging)
      .filter((d) => d?.surging)
      .map((d) => d!.district),
    activeJobs,
    avgWaitMinutes: hunting.length
      ? Math.round(hunting.reduce((s, j) => s + j.ageMinutes, 0) / hunting.length)
      : 0,
  };
}
