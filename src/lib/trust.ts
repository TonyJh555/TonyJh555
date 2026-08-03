import type { Booking, Worker } from "./types";

/**
 * How much a worker nobody has hired yet can be trusted with.
 *
 * The obvious worry — "he takes the advance and disappears" — turns out not to
 * be the real one. KAAM holds the money: `workerCredit` only pays out on a
 * *completed* booking, so an advance on an unfinished job is never in the
 * worker's hands to run away with. That exposure is already closed by the
 * shape of the system rather than by any rule.
 *
 * What is not closed is the thing money cannot fix. A refund makes a customer
 * whole for a leaking tap. It does not make them whole for two hundred guests
 * sitting down to no food, because a wedding cannot be run again on Monday.
 * The loss there is not the fee; it is the occasion, and no amount of KAAM
 * Cash buys it back.
 *
 * So the rule is about irreplaceability, not fraud: a worker with no record on
 * KAAM should not be the single point of failure for an event. Not because
 * they are dishonest — most are not, and everyone starts at zero — but because
 * nobody yet knows whether they turn up, and a wedding is the wrong place to
 * find out.
 *
 * Two different answers follow, depending on who is choosing:
 *
 *  - **When KAAM chooses** (dispatch, and the handover's replacement worker),
 *    an unproven worker is simply not offered a high-value or crew job. The
 *    platform picked; the platform carries the judgement.
 *  - **When the customer chooses**, they are told plainly and may go ahead.
 *    Overriding a customer's own choice of worker is not KAAM's to make — it
 *    is the one thing this marketplace promises it will never do.
 */

/** Completed jobs before a worker counts as proven on the platform. */
export const PROVEN_JOBS = 5;

/**
 * ₹ of customer money an unproven worker can be trusted to hold alone.
 * Comfortably above an ordinary repair or a day's care, well below a function.
 */
export const UNPROVEN_MAX_VALUE = 6000;

/**
 * Jobs this worker has actually finished.
 *
 * `jobsDone` carries the history a worker brought with them; the bookings
 * carry what they have done here. Both count — a carpenter with fifteen years
 * of work is not a stranger — but only real completions, never an accepted
 * job that is yet to happen.
 */
export function completedJobs(
  worker: Pick<Worker, "id" | "jobsDone">,
  bookings: Pick<Booking, "workerId" | "status">[],
): number {
  const here = bookings.filter((b) => b.workerId === worker.id && b.status === "completed").length;
  return (worker.jobsDone ?? 0) + here;
}

/** Has this worker done enough for anyone to know whether they turn up? */
export function isProven(
  worker: Pick<Worker, "id" | "jobsDone">,
  bookings: Pick<Booking, "workerId" | "status">[],
): boolean {
  return completedJobs(worker, bookings) >= PROVEN_JOBS;
}

/**
 * Is this a job that cannot simply be redone next week?
 *
 * A crew booking is one by definition — several people staffing an occasion.
 * Otherwise it is a question of size: the bigger the booking, the more it
 * tends to be the kind of day that only happens once.
 */
export function highStakes(
  totalUserPays: number,
  hasCrew: boolean,
  maxValue: number = UNPROVEN_MAX_VALUE,
): boolean {
  return hasCrew || totalUserPays > maxValue;
}

/** The same question, asked of a booking that already exists. */
export function isHighStakes(
  booking: Pick<Booking, "crew" | "quote">,
  maxValue: number = UNPROVEN_MAX_VALUE,
): boolean {
  return highStakes(booking.quote.totalUserPays, Boolean(booking.crew), maxValue);
}

/**
 * May KAAM hand this job to this worker on its own initiative?
 *
 * Only used where the platform is doing the choosing. A customer who picks an
 * unproven worker themselves is warned, not blocked.
 */
export function canBeDispatched(
  worker: Pick<Worker, "id" | "jobsDone">,
  booking: Pick<Booking, "crew" | "quote">,
  bookings: Pick<Booking, "workerId" | "status">[],
): boolean {
  return !isHighStakes(booking) || isProven(worker, bookings);
}

/** How many more jobs before this worker can be sent to an event. */
export function jobsUntilProven(
  worker: Pick<Worker, "id" | "jobsDone">,
  bookings: Pick<Booking, "workerId" | "status">[],
): number {
  return Math.max(0, PROVEN_JOBS - completedJobs(worker, bookings));
}
