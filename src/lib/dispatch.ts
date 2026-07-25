import type { Booking, DispatchState, Worker } from "./types";
import { geocode, type LatLng } from "./geo";
import { rankByProximity } from "./matching";

/**
 * KAAM Dispatch — how a job request reaches a worker.
 *
 * KAAM is **not** a ride-hailing app, and this is the difference that matters:
 * the customer chooses their worker. They read the reviews, they looked at the
 * rating, they picked *that* person — for a nurse, a music teacher or an elder
 * carer that choice is the entire product, and it is no less true of an
 * electrician. So a request is never silently handed to somebody else.
 *
 * 1. The chosen worker gets the offer, with a countdown so the customer isn't
 *    left guessing.
 * 2. If it runs out, the offer simply stays open and the customer is told —
 *    they can wait, or pick another worker themselves. KAAM suggests who is
 *    online and free; the decision stays with the customer.
 *
 * `reassign` is kept for the one case where choice isn't taken away: a worker
 * who explicitly declines, and the customer asking us to find someone else.
 *
 * Pure and framework-free: the UI applies the returned patches, so this is
 * all unit-testable.
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
 * What to do when the chosen worker's window runs out: stop the countdown and
 * leave the job with them. The customer is shown that the worker hasn't
 * replied yet and can choose someone else — the app never chooses for them.
 *
 * Returns null when there's nothing to do (not expired, or not a live
 * request).
 */
export function advanceDispatch(
  booking: Booking,
  _workers: Worker[],
  opts: DispatchOpts = {},
): Partial<Booking> | null {
  if (!offerExpired(booking, opts.now)) return null;
  return { dispatch: { ...booking.dispatch!, offerExpiresAt: null } };
}
