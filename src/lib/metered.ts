import { hasMenu } from "@/data/service-details";
import { billingNature } from "./price-model";
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
/** Alarm 5 minutes before the base hour is up, so nobody forgets to finish. */
export const FINISH_ALARM_MINUTES = BASE_MINUTES - 5;

/**
 * Does the meter run for this booking?
 *
 * Three things all have to be true, and the trade is the first of them. The
 * meter used to be decided by the worker's rate unit alone, which meant any
 * worker who happened to be priced by the hour got a running clock and a bill
 * for extra minutes — including an AC technician whose customer had just been
 * quoted a fixed ₹1,200 for a service with a stated duration, and a babysitter
 * on a plan the app promises has "nothing more to pay after the job".
 *
 * So: only work that is genuinely sold by the clock. Repairs qualify — you
 * cannot know what is behind the wall until you open it. Trades with a service
 * menu do not, even inside maintenance: the customer bought a job at a price,
 * and a meter on top of a fixed price is a second bill they never agreed to.
 */
export function isMetered(
  booking: Pick<Booking, "tenureId" | "categoryId">,
  worker: Pick<Worker, "unit">,
): boolean {
  return (
    billingNature(booking.categoryId) === "metered" &&
    !hasMenu(booking.categoryId) &&
    worker.unit === "hr" &&
    booking.tenureId === "hr"
  );
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
 * Total worked milliseconds — the sum of every run segment, pause-aware. Time
 * spent paused for a reschedule doesn't count, so a customer never pays for the
 * days a worker was away buying parts, and the worker keeps every minute worked.
 */
export function workedMs(
  booking: Pick<Booking, "startedAt" | "bankedMs" | "pausedAt">,
  now: Date = new Date(),
): number {
  const banked = booking.bankedMs ?? 0;
  // Paused or never started → only the banked total counts.
  if (booking.pausedAt || !booking.startedAt) return banked;
  return banked + Math.max(0, now.getTime() - new Date(booking.startedAt).getTime());
}

/** Total whole minutes worked so far (pause-aware). */
export function workedMinutes(
  booking: Pick<Booking, "startedAt" | "bankedMs" | "pausedAt">,
  now: Date = new Date(),
): number {
  return Math.floor(workedMs(booking, now) / 60_000);
}

/** Patch that pauses the meter now: bank the running segment, then freeze. */
export function pausePatch(
  booking: Pick<Booking, "startedAt" | "bankedMs" | "pausedAt">,
  now: Date = new Date(),
): { bankedMs: number; pausedAt: string } {
  return { bankedMs: workedMs(booking, now), pausedAt: now.toISOString() };
}

/** Patch that resumes the meter now: start a fresh segment, clear the pause. */
export function resumePatch(now: Date = new Date()): { startedAt: string; pausedAt: undefined } {
  return { startedAt: now.toISOString(), pausedAt: undefined };
}

/**
 * The "you're about to hit the base hour" alarm — fires once when a running
 * metered job passes 55 minutes, on both apps, so a job that's actually done
 * gets closed instead of drifting into per-minute billing by mistake.
 */
export function finishAlarmDue(
  booking: Pick<Booking, "tenureId" | "categoryId" | "status" | "startedAt" | "bankedMs" | "pausedAt">,
  worker: Pick<Worker, "unit">,
  now: Date = new Date(),
): boolean {
  if (!isMetered(booking, worker) || booking.status !== "in_progress") return false;
  if (booking.pausedAt || !booking.startedAt) return false;
  return workedMinutes(booking, now) >= FINISH_ALARM_MINUTES;
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
  const actual = workedMinutes(booking, now);
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
  const elapsed = workedMinutes(booking, now);
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
