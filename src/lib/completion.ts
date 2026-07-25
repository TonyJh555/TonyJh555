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
