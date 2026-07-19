import type { Booking, DispatchState, Worker } from "./types";
import { geocode, type LatLng } from "./geo";
import { rankByProximity } from "./matching";

/**
 * KAAM Dispatch — how a job request finds a worker, the way Uber/Swiggy/
 * Careem do it:
 *
 * 1. The customer's chosen worker gets the offer first, with a countdown.
 * 2. No response (or a decline) → the job automatically cascades to the
 *    next nearest eligible worker: same service, online, not on leave —
 *    ranked nearest-to-the-job first (KAAM Pro tier breaks distance ties).
 * 3. If every nearby worker passes, a fresh round re-offers the job; in a
 *    one-worker area the offer stays open with no timer instead of dying.
 *
 * Pure and framework-free: the UI applies the returned patches, so the
 * whole cascade is unit-testable.
 */

/** Seconds a worker holds an offer before it moves on (Uber uses ~30s for
 * rides; home services get longer since jobs aren't real-time). */
export const OFFER_WINDOW_SECONDS = 180;

/** Safety valve: after this many holders, stop the timer and wait. */
export const MAX_ATTEMPTS = 12;

export interface DispatchOpts {
  /** Extra unavailability (e.g. away-mode) the roster doesn't know about. */
  isUnavailable?: (workerId: string) => boolean;
  /** Live presence override (the GO toggle); defaults to the seed flag. */
  isOnline?: (worker: Worker) => boolean;
  now?: Date;
}

/** Where the job actually is: the map pin, else the typed address. */
export function jobCoords(booking: Pick<Booking, "coords" | "address">): LatLng {
  return booking.coords ?? geocode(booking.address);
}

/**
 * Eligible workers for a job, best candidate first: same category, online,
 * available — ranked nearest to the job (Pro tier + match score tie-break).
 */
export function dispatchQueue(
  workers: Worker[],
  categoryId: Booking["categoryId"],
  at: LatLng,
  exclude: string[] = [],
  opts: DispatchOpts = {},
): Worker[] {
  const banned = new Set(exclude);
  const eligible = workers.filter(
    (w) =>
      w.categoryId === categoryId &&
      (opts.isOnline?.(w) ?? w.online) &&
      !banned.has(w.id) &&
      !(opts.isUnavailable?.(w.id) ?? false),
  );
  return rankByProximity(eligible, at);
}

/** Dispatch state for a brand-new booking: chosen worker, window running. */
export function initialDispatch(now: Date = new Date()): DispatchState {
  return {
    passedIds: [],
    attempt: 1,
    offerExpiresAt: new Date(now.getTime() + OFFER_WINDOW_SECONDS * 1000).toISOString(),
  };
}

/** True when the current holder's window has run out on a live request. */
export function offerExpired(booking: Booking, now: Date = new Date()): boolean {
  return (
    booking.status === "requested" &&
    !!booking.dispatch?.offerExpiresAt &&
    now.getTime() > new Date(booking.dispatch.offerExpiresAt).getTime()
  );
}

export type DispatchPatch = Pick<Booking, "workerId" | "workerName" | "dispatch">;

/**
 * Move the offer to the next nearest available worker. Returns the booking
 * patch to apply, or null when there is nobody else to offer to (the offer
 * simply stays open with the current worker, timer off).
 */
export function reassign(
  booking: Booking,
  workers: Worker[],
  opts: DispatchOpts = {},
): DispatchPatch | null {
  const d = booking.dispatch ?? initialDispatch(opts.now);
  const passedIds = [...d.passedIds, booking.workerId];
  const at = jobCoords(booking);

  let queue = dispatchQueue(workers, booking.categoryId, at, passedIds, opts);
  let nextPassed = passedIds;
  if (queue.length === 0) {
    // Everyone nearby has passed once — start a fresh round (real dispatch
    // systems re-ping; workers free up all the time). Current holder stays
    // excluded so the job always moves.
    queue = dispatchQueue(workers, booking.categoryId, at, [booking.workerId], opts);
    nextPassed = [booking.workerId];
  }
  const next = queue[0];
  if (!next) return null; // one-worker area — leave the offer open

  const attempt = d.attempt + 1;
  const now = opts.now ?? new Date();
  return {
    workerId: next.id,
    workerName: next.name,
    dispatch: {
      passedIds: nextPassed,
      attempt,
      offerExpiresAt:
        attempt >= MAX_ATTEMPTS
          ? null // stop bouncing; wait for a human
          : new Date(now.getTime() + OFFER_WINDOW_SECONDS * 1000).toISOString(),
    },
  };
}

/**
 * Advance an expired offer to the next worker; null when nothing to do
 * (not expired, not a live request, or nobody else available — in that
 * last case the timer is switched off so the offer stays open).
 */
export function advanceDispatch(
  booking: Booking,
  workers: Worker[],
  opts: DispatchOpts = {},
): Partial<Booking> | null {
  if (!offerExpired(booking, opts.now)) return null;
  const patch = reassign(booking, workers, opts);
  if (patch) return patch;
  // Nobody else — keep the current worker, stop the countdown.
  return { dispatch: { ...booking.dispatch!, offerExpiresAt: null } };
}
