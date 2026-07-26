import { getState, GST_RATE, PLATFORM_FEE_RATE, SURGE_MULTIPLIER, TDS_RATE } from "./pricing";
import { BASE_MINUTES } from "./metered";
import type { Booking, Worker } from "./types";

/**
 * The arithmetic behind an overtime charge, spelled out line by line.
 *
 * "The job ran 215 min, base hour + 155 min" told nobody where ₹1,525 came
 * from. Both sides are entitled to check the sum themselves: the customer
 * because it's their money, and the worker because it's their pay. So this
 * returns every step — the per-minute rate, the minutes, the tax — and both
 * apps render the same numbers from it.
 *
 * Pure, so the figures shown can be unit-tested against the figures charged.
 */

export interface OvertimeLine {
  /** Real minutes from OTP start to completion. */
  actualMinutes: number;
  /** Minutes billed — never more than the minutes worked. */
  billedMinutes: number;
  baseMinutes: number;
  /** Minutes charged beyond the base hour. */
  extraMinutes: number;
  /** ₹ per hour, as the customer saw it when booking. */
  ratePerHour: number;
  /** Effective ₹ per minute, rounded to 2dp for display. */
  ratePerMinute: number;
  surgeApplied: boolean;
  /** ₹ for the extra minutes, before tax. */
  extraService: number;
  extraGst: number;
  extraCess: number;
  /** What the customer pays for the overtime, all in. */
  extraTotal: number;
  /** Of the extra service amount, what reaches the worker. */
  workerExtra: number;
  platformFee: number;
  tds: number;
}

/**
 * Explain the overtime on a settled hourly job, or null when there wasn't any
 * (a job inside the base hour, or one the meter never applied to).
 */
export function explainOvertime(
  booking: Pick<Booking, "settlement" | "quote" | "stateId">,
  worker: Pick<Worker, "rate"> | undefined,
): OvertimeLine | null {
  const s = booking.settlement;
  if (!s || s.extraMinutes <= 0 || !worker) return null;

  const surge = booking.quote.surgeApplied;
  const ratePerHour = worker.rate;
  const effectiveHourly = ratePerHour * (surge ? SURGE_MULTIPLIER : 1);

  // Derived exactly like meteredQuote, so the explanation can never drift
  // from the charge: rate × minutes ÷ 60, then tax on that.
  const extraService = Math.round((effectiveHourly * s.extraMinutes) / 60);
  const extraGst = Math.round(extraService * GST_RATE);
  const extraCess = Math.round((extraService * getState(booking.stateId).cessPercent) / 100);
  const platformFee = Math.round(extraService * PLATFORM_FEE_RATE);
  const tds = Math.round(extraService * TDS_RATE);

  return {
    actualMinutes: s.actualMinutes,
    billedMinutes: s.billedMinutes,
    baseMinutes: BASE_MINUTES,
    extraMinutes: s.extraMinutes,
    ratePerHour,
    ratePerMinute: Math.round((effectiveHourly / 60) * 100) / 100,
    surgeApplied: surge,
    extraService,
    extraGst,
    extraCess,
    extraTotal: extraService + extraGst + extraCess,
    workerExtra: extraService - platformFee - tds,
    platformFee,
    tds,
  };
}
