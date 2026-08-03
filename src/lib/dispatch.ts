import type { Booking, DispatchOutcome, DispatchState, GroupId, Worker } from "./types";
import { geocode, type LatLng } from "./geo";
import { rankByProximity } from "./matching";
import { canServe } from "./eligibility";
import { CATEGORIES } from "@/data/categories";

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

/**
 * An hour, for work that cannot be answered alone.
 *
 * Three minutes is right for a plumber deciding whether to drive across Kochi.
 * It is nonsense for a 500-guest wedding: catering and event staffing are
 * quoted by a team, and answering means checking who is free on that date, what
 * the kitchen can take and whether the crew can be assembled. Nobody does that
 * between traffic lights. A window too short to answer honestly doesn't get
 * fast answers — it gets declines, or accepts made blind and regretted later,
 * and both land on the customer.
 */
export const EVENT_OFFER_WINDOW_SECONDS = 3600;

/** Sectors whose work is planned by a team rather than taken on the spot. */
const SLOW_GROUPS = new Set<GroupId>(["hospitality"]);

/**
 * How long this trade gets to answer.
 *
 * A crew booking gets the long window whatever the trade: once a job is being
 * staffed by several people it has the same problem to solve, whether the lead
 * is a caterer or a violinist.
 */
export function offerWindowSeconds(
  booking: Pick<Booking, "categoryId" | "crew">,
): number {
  // A plain lookup, not getCategory — that one throws on an id it doesn't
  // know, and a booking made against a since-renamed category would then take
  // the whole dispatch loop down rather than quietly getting the usual window.
  const group = CATEGORIES.find((c) => c.id === booking.categoryId)?.group;
  return (group && SLOW_GROUPS.has(group)) || booking.crew
    ? EVENT_OFFER_WINDOW_SECONDS
    : OFFER_WINDOW_SECONDS;
}

/** Safety valve: after this many holders, stop the timer and wait. */
export const MAX_ATTEMPTS = 12;

export interface DispatchOpts {
  /** Extra unavailability (e.g. away-mode) the roster doesn't know about. */
  isUnavailable?: (workerId: string) => boolean;
  /** Live presence override (the GO toggle); defaults to the seed flag. */
  isOnline?: (worker: Worker) => boolean;
  /**
   * Refuse to *offer* this worker the job, though the customer may still pick
   * them. Used to keep a worker nobody has hired yet from being handed a
   * wedding on the platform's own initiative — see src/lib/trust.ts.
   */
  isUntrustedFor?: (worker: Worker) => boolean;
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
      // canServe covers the category match AND the women-only promise, so a
      // job in those trades can never be offered to a man.
      canServe(w, categoryId) &&
      (opts.isOnline?.(w) ?? w.online) &&
      !banned.has(w.id) &&
      !(opts.isUnavailable?.(w.id) ?? false) &&
      !(opts.isUntrustedFor?.(w) ?? false),
  );
  return rankByProximity(eligible, at);
}

/**
 * Dispatch state for a brand-new booking: chosen worker, window running.
 *
 * `booking` is optional only so older call sites keep working; pass it, or an
 * event company gets three minutes to staff a wedding.
 */
export function initialDispatch(
  now: Date = new Date(),
  booking?: Pick<Booking, "categoryId" | "crew">,
): DispatchState {
  const window = booking ? offerWindowSeconds(booking) : OFFER_WINDOW_SECONDS;
  return {
    passedIds: [],
    attempt: 1,
    offerExpiresAt: new Date(now.getTime() + window * 1000).toISOString(),
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
          : new Date(now.getTime() + offerWindowSeconds(booking) * 1000).toISOString(),
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
  const now = opts.now ?? new Date();
  return {
    dispatch: {
      ...booking.dispatch!,
      offerExpiresAt: null,
      lastOutcome: {
        workerId: booking.workerId,
        workerName: booking.workerName,
        reason: "no_reply",
        at: now.toISOString(),
      },
    },
  };
}

/**
 * The patch a worker's "Pass" applies. Recording *why* the offer stopped is
 * the whole point: a decline and a worker who never opened the app are the
 * same shape otherwise, and the customer ends up being told to keep waiting
 * for someone who has already said no.
 *
 * The job deliberately stays with the decliner as `workerId` — KAAM never
 * moves a booking to a stranger. It moves only when the customer picks.
 */
export function declinePatch(booking: Booking, now: Date = new Date()): Partial<Booking> {
  const d = booking.dispatch ?? initialDispatch(now);
  return {
    dispatch: {
      ...d,
      passedIds: [...d.passedIds, booking.workerId],
      attempt: d.attempt + 1,
      offerExpiresAt: null,
      lastOutcome: {
        workerId: booking.workerId,
        workerName: booking.workerName,
        reason: "declined",
        at: now.toISOString(),
      },
    },
  };
}

/**
 * What the customer should be told about a request that hasn't been accepted.
 *
 * `offered` — the timer is running, they hold it.
 * `declined` — they said no. Say so; never "still waiting".
 * `no_reply` — the window lapsed with no answer either way.
 */
export type DispatchPhase =
  | { phase: "offered"; secondsLeft: number }
  | { phase: "declined"; outcome: DispatchOutcome }
  | { phase: "no_reply"; outcome?: DispatchOutcome };

export function dispatchPhase(booking: Booking, now: Date = new Date()): DispatchPhase | null {
  if (booking.status !== "requested" || !booking.dispatch) return null;
  const d = booking.dispatch;

  if (d.offerExpiresAt) {
    const left = new Date(d.offerExpiresAt).getTime() - now.getTime();
    if (left > 0) return { phase: "offered", secondsLeft: Math.round(left / 1000) };
  }

  // A decline only speaks for the person who declined. Once the customer moves
  // the job to someone new, the old outcome is history, not the current state.
  if (d.lastOutcome?.reason === "declined" && d.lastOutcome.workerId === booking.workerId) {
    return { phase: "declined", outcome: d.lastOutcome };
  }
  return { phase: "no_reply", outcome: d.lastOutcome };
}
