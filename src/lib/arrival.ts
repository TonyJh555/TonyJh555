import type { Booking, Worker } from "./types";

/**
 * "He said three o'clock and came at seven."
 *
 * The complaint that ends a customer relationship, and the one an app can
 * actually do something about. But an arrival SLA is the easiest thing in a
 * marketplace to get wrong, because the obvious version — late means a fine —
 * is a whip. Workers on gig platforms are penalised for traffic, for a
 * previous customer who wouldn't let them leave, for a flooded road in
 * Ernakulam in July. They stop taking distant jobs, then they stop taking
 * afternoon jobs, and the platform has optimised itself into a worse service.
 *
 * So the rule here is not about being late. It is about being **told**:
 *
 *   A worker who says they are running late, before the time they promised,
 *   has done their job as a professional. No strike, whatever the reason.
 *   A worker who simply doesn't turn up and says nothing has done the one
 *   thing that leaves a customer sitting at home guessing, and that counts.
 *
 * That distinction can be enforced from a timestamp, it cannot be gamed by
 * picking a better excuse from a list, and it rewards exactly the behaviour a
 * customer actually wants. "Stuck at Vytilla, another 40 minutes" at 2:50 is a
 * service. Silence until 4:15 is not.
 *
 * The customer's side is simple: they are never charged for waiting (the meter
 * starts at the start code, which only exists once the worker is standing
 * there), and past an hour they can walk away with everything back and an
 * apology KAAM pays for.
 */

/** Ordinary lateness. Kerala traffic is not a service failure. */
export const ARRIVAL_GRACE_MINUTES = 20;

/**
 * Past this the customer has lost their morning, and is offered the way out.
 * An hour, not thirty minutes: a repair worker crossing a district in monsoon
 * traffic can lose forty minutes to one flooded junction.
 */
export const ARRIVAL_BREACH_MINUTES = 60;

/** What KAAM pays a customer who was left waiting an hour. Never the worker. */
export const APOLOGY_CREDIT = 100;

/**
 * The apology is owed for being left in the dark, not merely for lateness —
 * and it is paid on exactly the same condition that puts a mark on the
 * worker's record. One rule, two consequences, pointing the same way: if the
 * worker warned the customer in time, nobody is at fault and nobody pays.
 *
 * That alignment is also what makes it hard to farm. Free money attached to a
 * button the customer alone controls is a tap somebody will eventually find,
 * so it is capped as well: one apology per customer per month. A second
 * genuine no-show inside a month is a pattern that deserves a person looking
 * at it, not another automatic ₹100.
 */
export const APOLOGY_WINDOW_DAYS = 30;
export const APOLOGY_MAX_IN_WINDOW = 1;

/** The two ways a breach cancellation is recorded, kept distinguishable. */
export const BREACH_REASON = "Worker did not arrive within an hour of the promised time";
export const BREACH_REASON_APOLOGISED = `${BREACH_REASON} — cancelled with KAAM's apology`;

/** How far back a worker's punctuality record is read. */
export const STRIKE_WINDOW_DAYS = 30;

export type DelayReasonId =
  | "traffic"
  | "previous_job"
  | "weather"
  | "vehicle"
  | "customer_absent";

export interface DelayReason {
  id: DelayReasonId;
  label: string;
  labelMl: string;
}

/**
 * Why they are late, in taps. The list is short and physical because it is
 * read on a motorbike at the side of a road.
 */
export const DELAY_REASONS: DelayReason[] = [
  { id: "traffic", label: "Stuck in traffic", labelMl: "ട്രാഫിക്കിൽ കുടുങ്ങി" },
  { id: "previous_job", label: "Previous job ran over", labelMl: "മുൻപത്തെ ജോലി നീണ്ടു" },
  { id: "weather", label: "Rain / flooded road", labelMl: "മഴ / വെള്ളക്കെട്ട്" },
  { id: "vehicle", label: "Vehicle trouble", labelMl: "വാഹനത്തിന് തകരാർ" },
  { id: "customer_absent", label: "I'm here — nobody's home", labelMl: "ഞാൻ എത്തി — ആരും വീട്ടിലില്ല" },
];

export interface ArrivalNotice {
  reason: DelayReasonId;
  /** When the worker sent it (ISO). This timestamp is the whole rule. */
  at: string;
  /** How many more minutes they expect to need. */
  minutes?: number;
}

export function delayReason(id: DelayReasonId, ml = false): string {
  const found = DELAY_REASONS.find((r) => r.id === id);
  return found ? (ml ? found.labelMl : found.label) : id;
}

/**
 * When the worker said they would be there.
 *
 * A scheduled job promises its slot. An ASAP job promises the worker's own
 * stated ETA, counted from the moment the customer paid — which is the moment
 * the app tells the worker to set off, so it is the moment the promise starts.
 * Before payment nobody has agreed to travel anywhere, and there is nothing to
 * be late for.
 */
export function promisedArrival(
  booking: Pick<Booking, "schedule" | "payment">,
  worker: Pick<Worker, "etaMinutes"> | undefined,
): Date | null {
  const s = booking.schedule;
  if (s?.when === "scheduled") {
    const at = new Date(`${s.date}T${s.time}`);
    return Number.isNaN(at.getTime()) ? null : at;
  }
  const from = booking.payment?.confirmedAt;
  if (!from || !worker) return null;
  const at = new Date(from);
  if (Number.isNaN(at.getTime())) return null;
  at.setMinutes(at.getMinutes() + worker.etaMinutes);
  return at;
}

/**
 * When they actually got there.
 *
 * The start code is the only honest answer: it is read out by the customer, so
 * it cannot be entered from the road. "Arrived" self-reported by the person
 * whose punctuality is being measured is not evidence.
 */
export function arrivedAt(booking: Pick<Booking, "startedAt">): Date | null {
  if (!booking.startedAt) return null;
  const at = new Date(booking.startedAt);
  return Number.isNaN(at.getTime()) ? null : at;
}

/**
 * Minutes late — so far, for a job still waiting; finally, for one that
 * started. Zero when they were early, or when there was no promise to keep.
 */
export function minutesLate(
  booking: Pick<Booking, "schedule" | "payment" | "startedAt">,
  worker: Pick<Worker, "etaMinutes"> | undefined,
  now: Date = new Date(),
): number {
  const promised = promisedArrival(booking, worker);
  if (!promised) return 0;
  const reference = arrivedAt(booking) ?? now;
  return Math.max(0, Math.floor((reference.getTime() - promised.getTime()) / 60_000));
}

export type ArrivalState = "unknown" | "on_time" | "late" | "breached";

/**
 * Where this arrival stands.
 *
 * Only meaningful while the customer is still waiting — once the job is
 * running, finished or cancelled the question has been answered. A job whose
 * worker reported the customer was out is never "late": they were there.
 */
export function arrivalState(
  booking: Pick<Booking, "status" | "schedule" | "payment" | "startedAt" | "arrivalNotice">,
  worker: Pick<Worker, "etaMinutes"> | undefined,
  now: Date = new Date(),
): ArrivalState {
  if (booking.status !== "accepted") return "unknown";
  if (booking.arrivalNotice?.reason === "customer_absent") return "on_time";
  if (!promisedArrival(booking, worker)) return "unknown";
  const late = minutesLate(booking, worker, now);
  if (late >= ARRIVAL_BREACH_MINUTES) return "breached";
  if (late >= ARRIVAL_GRACE_MINUTES) return "late";
  return "on_time";
}

/**
 * Did they warn the customer in time?
 *
 * Before the promised moment. Not "before they were an hour late" — a message
 * sent once the customer has already given up is an explanation, not a
 * warning, and it is the waiting-without-knowing that does the damage.
 */
export function noticeGivenInTime(
  booking: Pick<Booking, "schedule" | "payment" | "arrivalNotice">,
  worker: Pick<Worker, "etaMinutes"> | undefined,
): boolean {
  const notice = booking.arrivalNotice;
  if (!notice) return false;
  const promised = promisedArrival(booking, worker);
  if (!promised) return false;
  const sent = new Date(notice.at);
  if (Number.isNaN(sent.getTime())) return false;
  return sent.getTime() <= promised.getTime();
}

/**
 * Does this job go on the worker's record?
 *
 * An hour late having said nothing. Every other combination — late but warned,
 * warned and then very late, there on time, there at all with nobody home —
 * is not a mark against anyone.
 */
export function countsAsLateStrike(
  booking: Pick<
    Booking,
    "status" | "schedule" | "payment" | "startedAt" | "arrivalNotice" | "workerId"
  >,
  worker: Pick<Worker, "etaMinutes"> | undefined,
  now: Date = new Date(),
): boolean {
  // A cancelled job is judged by why it was cancelled, elsewhere. A finished
  // one is judged by when it started.
  if (booking.status !== "accepted" && booking.status !== "in_progress" && booking.status !== "completed") {
    return false;
  }
  if (booking.arrivalNotice?.reason === "customer_absent") return false;
  if (noticeGivenInTime(booking, worker)) return false;
  return minutesLate(booking, worker, now) >= ARRIVAL_BREACH_MINUTES;
}

/**
 * A worker's punctuality record over the last 30 days, derived from the
 * bookings themselves — there is no separate ledger of strikes to drift out of
 * step with what actually happened.
 */
export function lateStrikes(
  bookings: Booking[],
  workerId: string,
  worker: Pick<Worker, "etaMinutes"> | undefined,
  now: Date = new Date(),
  days: number = STRIKE_WINDOW_DAYS,
): Booking[] {
  const since = now.getTime() - days * 86_400_000;
  return bookings.filter(
    (b) =>
      b.workerId === workerId &&
      new Date(b.createdAt).getTime() >= since &&
      countsAsLateStrike(b, worker, now),
  );
}

/** The patch a worker's "I'm running late" applies. */
export function noticePatch(
  reason: DelayReasonId,
  minutes: number | undefined,
  now: Date = new Date(),
): Partial<Booking> {
  return { arrivalNotice: { reason, minutes, at: now.toISOString() } };
}

/**
 * What a customer gets when they give up on a worker who never came.
 *
 * Everything back — the base hour is not forfeited to somebody who did not
 * travel, which is the same principle the no-show settlement already applies —
 * plus an apology KAAM funds. The worker is paid nothing, and is not fined:
 * they lose the job, which is the consequence, and money taken *off* a worker
 * for being late is how a platform ends up with no workers in the monsoon.
 */
export function breachRefund(booking: Pick<Booking, "payment">): number {
  return booking.payment?.paidNow ?? 0;
}

/**
 * How many apologies this customer has already been paid this month.
 *
 * Counted from the bookings themselves rather than the wallet, so it is the
 * same number on every device and cannot be reset by clearing a browser.
 */
export function apologiesPaid(
  bookings: Pick<Booking, "customerId" | "cancelReason" | "completedAt" | "createdAt">[],
  customerId: string | undefined,
  now: Date = new Date(),
  days: number = APOLOGY_WINDOW_DAYS,
): number {
  const since = now.getTime() - days * 86_400_000;
  return bookings.filter(
    (b) =>
      b.customerId === customerId &&
      b.cancelReason === BREACH_REASON_APOLOGISED &&
      new Date(b.completedAt ?? b.createdAt).getTime() >= since,
  ).length;
}

/**
 * Should KAAM pay this customer for the wait?
 *
 * Only when the worker earned a strike for it — no warning, an hour gone —
 * and only if this customer hasn't already been apologised to this month.
 * A free cancellation is offered either way; that costs KAAM nothing it
 * wasn't already holding, and a customer who has been stood up should never
 * have to argue about getting their own money back.
 */
export function apologyOwed(
  booking: Pick<
    Booking,
    "status" | "schedule" | "payment" | "startedAt" | "arrivalNotice" | "workerId" | "customerId"
  >,
  worker: Pick<Worker, "etaMinutes"> | undefined,
  bookings: Pick<Booking, "customerId" | "cancelReason" | "completedAt" | "createdAt">[],
  now: Date = new Date(),
): boolean {
  if (!countsAsLateStrike(booking, worker, now)) return false;
  return apologiesPaid(bookings, booking.customerId, now) < APOLOGY_MAX_IN_WINDOW;
}

/**
 * Close a booking the worker never arrived for.
 *
 * The reason records whether an apology was paid, because that is what the
 * monthly cap is counted from — and because "we cancelled this and paid you
 * for it" and "we cancelled this" are different events to read back later.
 */
export function breachCancelPatch(
  now: Date = new Date(),
  apologised = false,
): Partial<Booking> {
  return {
    status: "cancelled",
    cancelReason: apologised ? BREACH_REASON_APOLOGISED : BREACH_REASON,
    // Nothing is owed to a worker who never travelled.
    calloutPay: 0,
    completedAt: now.toISOString(),
  };
}
