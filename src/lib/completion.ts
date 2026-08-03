import type { Booking, CompletionRequest } from "./types";

/**
 * Two-sided job completion — the mirror of the start code.
 *
 * Starting a job is already provable (the customer holds a 4-digit code, the
 * worker enters it). Ending one decides the bill, so it deserves the same
 * proof. Either side can declare the work done; the **billing clock stops at
 * that instant** so a slow confirmation never costs anyone money, and the
 * other side enters a 4-digit completion code to agree.
 *
 * This closes both fraud directions:
 *  - a worker who leaves the meter running (phone silent, off, or just slow)
 *    can be stopped by the customer, timestamped at the customer's moment;
 *  - a customer who ends a job early can't finalise it alone — the worker
 *    must enter the code, and sees exactly when it was requested.
 */
export const COMPLETION_CODE_LENGTH = 4;

/**
 * If the WORKER declared the job done and the customer never answers, it
 * finalises itself after this long. The clock already stopped when completion
 * was raised, so the amount is frozen and waiting longer cannot change what
 * anyone pays — this just stops a finished job sitting open forever.
 */
export const AUTO_FINALIZE_MINUTES = 10;

/**
 * How long a CUSTOMER's declaration waits before KAAM steps in. It never
 * finalises on its own — see `completionExpired`.
 */
export const DISPUTE_HELP_MINUTES = 30;

/**
 * Has an unconfirmed completion sat long enough to finalise on its own?
 *
 * Only a worker's declaration ever does. The timeout is not symmetric because
 * silence does not mean the same thing on both sides:
 *
 *  - a customer who says nothing has agreed; they are sitting in their own
 *    house watching the job end, and the clock stopped when the worker said
 *    so, meaning silence costs them nothing;
 *  - a worker who says nothing usually has their hands full — up a ladder, in
 *    a fuse box, phone in a pocket. Finalising against them would let a
 *    customer stop the meter twenty minutes into a two-hour job, stay quiet,
 *    and close it — with the worker still working, unpaid, and unaware.
 *
 * So the side that loses money by staying silent is never timed out. A
 * customer's declaration waits for the worker, and after
 * `DISPUTE_HELP_MINUTES` it becomes something for KAAM to settle.
 */
export function completionExpired(
  booking: Pick<Booking, "status" | "completion">,
  now: Date = new Date(),
): boolean {
  const req = booking.completion;
  if (!req || booking.status !== "in_progress") return false;
  if (req.by !== "worker") return false;
  const mins = (now.getTime() - new Date(req.at).getTime()) / 60_000;
  return mins >= AUTO_FINALIZE_MINUTES;
}

/**
 * A customer said the job was done and the worker has neither agreed nor
 * disagreed for long enough that somebody should look at it. The clock is
 * still stopped, so nothing is growing while it waits.
 */
export function completionNeedsHelp(
  booking: Pick<Booking, "status" | "completion">,
  now: Date = new Date(),
): boolean {
  const req = booking.completion;
  if (!req || booking.status !== "in_progress") return false;
  if (req.by !== "customer") return false;
  return (now.getTime() - new Date(req.at).getTime()) / 60_000 >= DISPUTE_HELP_MINUTES;
}

/** A fresh 4-digit completion code (never leading zero, so it stays 4 digits). */
export function makeCompletionCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Can this job be declared finished right now? */
export function canRequestCompletion(
  booking: Pick<Booking, "status" | "completion">,
): boolean {
  return booking.status === "in_progress" && !booking.completion;
}

/** Does the entered code match the pending completion request? */
export function completionCodeMatches(
  req: CompletionRequest | undefined,
  entered: string,
): boolean {
  return Boolean(req) && req!.code === entered.trim();
}

/** Is `viewer` the side that must now confirm (i.e. didn't raise it)? */
export function awaitingCompletionFrom(
  req: CompletionRequest | undefined,
  viewer: "customer" | "worker",
): boolean {
  return Boolean(req) && req!.by !== viewer;
}

/** Clock time, formatted the way both sides see it in the record: "12:37 PM". */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Does what the worker typed match the customer's start code?
 *
 * The code exists to prove the worker is standing at the customer's door: the
 * customer reads it out, the worker types it in. That only works if the worker
 * can't see it themselves, so the code must never be rendered on their screen —
 * this comparison is the only place their side may touch it.
 */
export function startCodeMatches(startCode: string, entered: string): boolean {
  const typed = entered.trim();
  if (typed.length !== COMPLETION_CODE_LENGTH) return false;
  return typed === startCode.trim();
}
