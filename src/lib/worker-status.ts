import type { AwayMap } from "./availability";
import { isAway } from "./availability";
import type { PresenceMap } from "./presence";
import { presenceOnline } from "./presence";
import type { Booking, Worker } from "./types";
import { canServe } from "./eligibility";

/**
 * Worker availability, at a glance — the Teams/Slack presence dot.
 *
 * The customer picks their own worker on KAAM, so the one thing they must be
 * able to see before choosing is whether that person can actually come. A
 * green dot means available now; amber means they're on another job and you'd
 * be waiting; grey means offline. Without it a customer picks the top-rated
 * name, waits, and learns nothing was ever going to happen.
 *
 * Pure and unit-tested — the UI just renders what this returns.
 */

export type WorkerStatusId = "available" | "busy" | "away" | "offline";

export interface WorkerStatus {
  id: WorkerStatusId;
  /** Tailwind dot colour class. */
  dot: string;
  label: string;
  labelMl: string;
  /** One line explaining what it means for the customer. */
  hint: string;
  hintMl: string;
  /** Can this worker take a job right now? */
  bookable: boolean;
}

const STATUS: Record<WorkerStatusId, Omit<WorkerStatus, "id">> = {
  available: {
    dot: "bg-good",
    label: "Available now",
    labelMl: "ഇപ്പോൾ ലഭ്യമാണ്",
    hint: "Free right now — can start straight away.",
    hintMl: "ഇപ്പോൾ സ്വതന്ത്രം — ഉടൻ തുടങ്ങാം.",
    bookable: true,
  },
  busy: {
    dot: "bg-warn",
    label: "On a job",
    labelMl: "ജോലിയിലാണ്",
    hint: "Working with another customer — you'd have to wait.",
    hintMl: "മറ്റൊരു ഉപഭോക്താവിനൊപ്പം — കാത്തിരിക്കേണ്ടി വരും.",
    bookable: true,
  },
  away: {
    dot: "bg-dim",
    label: "On leave",
    labelMl: "അവധിയിലാണ്",
    hint: "Away for now — pick someone else or book for later.",
    hintMl: "ഇപ്പോൾ അവധിയിൽ — മറ്റൊരാളെ തിരഞ്ഞെടുക്കൂ.",
    bookable: false,
  },
  offline: {
    dot: "bg-line",
    label: "Offline",
    labelMl: "ഓഫ്‌ലൈൻ",
    hint: "Not taking jobs right now — they may not reply.",
    hintMl: "ഇപ്പോൾ ജോലി എടുക്കുന്നില്ല — മറുപടി വൈകിയേക്കാം.",
    bookable: false,
  },
};

/** Jobs that mean a worker is physically occupied right now. */
export function isOnJob(bookings: Booking[], workerId: string): boolean {
  return bookings.some(
    (b) =>
      b.workerId === workerId &&
      (b.status === "in_progress" || b.status === "accepted") &&
      !b.pausedAt,
  );
}

/**
 * A worker's live status. Order matters: leave beats everything (they told us
 * they're gone), then offline, then whether they're already on a job.
 */
export function workerStatus(
  worker: Pick<Worker, "id" | "online">,
  ctx: { presence: PresenceMap; away: AwayMap; bookings: Booking[]; now?: Date },
): WorkerStatus {
  const now = ctx.now ?? new Date();
  let id: WorkerStatusId;
  if (isAway(ctx.away, worker.id, now)) id = "away";
  else if (!presenceOnline(ctx.presence, worker)) id = "offline";
  else if (isOnJob(ctx.bookings, worker.id)) id = "busy";
  else id = "available";
  return { id, ...STATUS[id] };
}

/**
 * Who to suggest when a customer wants somebody else — same trade, nearest
 * first, with whoever is free right now at the top. Busy and offline workers
 * are still listed (with their status showing) because the customer may well
 * prefer to wait for a particular person; they are simply never at the top,
 * and never chosen automatically.
 */
export function suggestWorkers(
  workers: Worker[],
  categoryId: Worker["categoryId"],
  ctx: { presence: PresenceMap; away: AwayMap; bookings: Booking[]; now?: Date },
  exclude: string[] = [],
  limit = 6,
): { worker: Worker; status: WorkerStatus }[] {
  const banned = new Set(exclude);
  return workers
    // Same promise as dispatch: a women-only trade never suggests a man.
    .filter((w) => canServe(w, categoryId) && !banned.has(w.id))
    .map((worker) => ({ worker, status: workerStatus(worker, ctx) }))
    .sort((a, b) => {
      const byAvail = availabilityRank(a.status.id) - availabilityRank(b.status.id);
      if (byAvail !== 0) return byAvail;
      if (a.worker.distanceKm !== b.worker.distanceKm) {
        return a.worker.distanceKm - b.worker.distanceKm;
      }
      return b.worker.rating - a.worker.rating;
    })
    .slice(0, limit);
}

/**
 * Rank for search: free workers first, then busy, then offline/away. Ties are
 * left to the caller's existing ordering (distance, rating), so this only
 * decides which band a worker sits in.
 */
export function availabilityRank(status: WorkerStatusId): number {
  switch (status) {
    case "available":
      return 0;
    case "busy":
      return 1;
    case "offline":
      return 2;
    default:
      return 3;
  }
}
