import type { Booking, Quote, Settlement, Worker } from "./types";
import { getState, GST_RATE, PLATFORM_FEE_RATE, SURGE_MULTIPLIER, TDS_RATE } from "./pricing";

/**
 * Metered hourly billing — fair to both sides, by design:
 *
 * - The base price covers the first hour (it's also the minimum charge, so
 *   a 40-minute fix still bills the base hour).
 * - A short grace window keeps things friendly: up to 5 minutes over, the
 *   job still bills as the base hour — no petty ₹10 disputes.
 * - Past the grace, the user pays for the minutes actually worked and the
 *   worker is paid for them: a 1h 08m job bills 68 minutes at rate/60 per
 *   minute. Nobody loses the 8 minutes; nobody pays for a phantom hour.
 *
 * The clock is tamper-proof: it starts when the worker enters the
 * customer's OTP start code and stops at "mark complete" — both existing,
 * two-sided actions. Applies to hourly-rate one-hour bookings; per-visit /
 * per-day / per-session services keep their flat agreed price.
 */

export const GRACE_MINUTES = 5;
export const BASE_MINUTES = 60;

/** Does the meter run for this booking? (hourly worker, 1-hour base job) */
export function isMetered(
  booking: Pick<Booking, "tenureId">,
  worker: Pick<Worker, "unit">,
): boolean {
  return worker.unit === "hr" && booking.tenureId === "hr";
}

/** Minutes actually billed: the base hour up to base+grace, else real minutes. */
export function billedMinutesFor(actualMinutes: number): number {
  if (actualMinutes <= BASE_MINUTES + GRACE_MINUTES) return BASE_MINUTES;
  return Math.ceil(actualMinutes);
}

/** The full quote for `minutes` of hourly work — same maths as computeQuote. */
export function meteredQuote(
  rate: number,
  minutes: number,
  surge: boolean,
  stateId: Booking["stateId"],
): Quote {
  const state = getState(stateId);
  const serviceAmount = Math.round((rate * minutes * (surge ? SURGE_MULTIPLIER : 1)) / 60);
  const gst = Math.round(serviceAmount * GST_RATE);
  const cess = Math.round((serviceAmount * state.cessPercent) / 100);
  const platformFee = Math.round(serviceAmount * PLATFORM_FEE_RATE);
  const tds = Math.round(serviceAmount * TDS_RATE);
  return {
    serviceAmount,
    surgeApplied: surge,
    gst,
    cess,
    totalUserPays: serviceAmount + gst + cess,
    platformFee,
    tds,
    workerPayout: serviceAmount - platformFee - tds,
  };
}

/** Elapsed whole minutes between the OTP start and `now`. */
export function elapsedMinutes(startedAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 60_000));
}

/**
 * Settle a finished metered job: the final quote for the minutes worked and
 * the settlement record for receipts. Returns null when the meter doesn't
 * apply (not hourly, or the start time was never stamped).
 */
export function settleBooking(
  booking: Booking,
  worker: Pick<Worker, "unit" | "rate">,
  now: Date = new Date(),
): { quote: Quote; settlement: Settlement } | null {
  if (!isMetered(booking, worker) || !booking.startedAt) return null;
  const actual = elapsedMinutes(booking.startedAt, now);
  const billed = billedMinutesFor(actual);
  const quote = meteredQuote(worker.rate, billed, booking.quote.surgeApplied, booking.stateId);
  return {
    quote,
    settlement: {
      actualMinutes: actual,
      billedMinutes: billed,
      extraMinutes: billed - BASE_MINUTES,
      extraUserPays: Math.max(0, quote.totalUserPays - booking.quote.totalUserPays),
      extraWorkerPayout: Math.max(0, quote.workerPayout - booking.quote.workerPayout),
    },
  };
}

/** Live meter readout for the running-job UI on both sides. */
export function meterNow(
  booking: Booking,
  worker: Pick<Worker, "unit" | "rate">,
  now: Date = new Date(),
): { elapsed: number; extraSoFar: number; inGrace: boolean } | null {
  if (!isMetered(booking, worker) || !booking.startedAt) return null;
  const elapsed = elapsedMinutes(booking.startedAt, now);
  const billed = billedMinutesFor(elapsed);
  const extraSoFar =
    billed > BASE_MINUTES
      ? Math.round((worker.rate * (billed - BASE_MINUTES) * (booking.quote.surgeApplied ? SURGE_MULTIPLIER : 1)) / 60)
      : 0;
  return {
    elapsed,
    extraSoFar,
    inGrace: elapsed > BASE_MINUTES && elapsed <= BASE_MINUTES + GRACE_MINUTES,
  };
}
