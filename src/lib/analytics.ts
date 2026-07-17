/**
 * Owner analytics — pure functions that turn the raw booking + application
 * records into the numbers a founder needs: revenue (commission) over time,
 * per-worker earnings, onboarding funnel, and daily activity. No framework or
 * store deps so it stays trivially testable.
 */

import type { Booking, CategoryId, Subscription } from "./types";
import type { WorkerApplication } from "./applications";
import { GST_RATE, PLATFORM_FEE_RATE } from "./pricing";

export type Period = "today" | "month" | "year" | "all";

export const PERIOD_LABEL: Record<Period, string> = {
  today: "Today",
  month: "This month",
  year: "This year",
  all: "All time",
};

/** True when an ISO timestamp falls inside the selected period (local time). */
export function inPeriod(iso: string, period: Period, now = new Date()): boolean {
  if (period === "all") return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (period === "year") return d.getFullYear() === now.getFullYear();
  if (period === "month")
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  // today
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export interface RevenueMetrics {
  /** KAAM's commission (15% platform fee) from completed jobs. */
  commission: number;
  /** Gross booking value (service amount) from completed jobs. */
  gmv: number;
  /** GST collected (to be remitted). */
  gst: number;
  /** TDS deposited (Sec 194-O). */
  tds: number;
  /** Total paid out to workers. */
  workerPayout: number;
  /** Number of completed jobs contributing to the above. */
  completedJobs: number;
}

/** Money earned — counts COMPLETED bookings only (revenue is realised on completion). */
export function revenueMetrics(bookings: Booking[], period: Period, now = new Date()): RevenueMetrics {
  const done = bookings.filter((b) => b.status === "completed" && inPeriod(b.createdAt, period, now));
  return {
    commission: sum(done, (b) => b.quote.platformFee),
    gmv: sum(done, (b) => b.quote.serviceAmount),
    gst: sum(done, (b) => b.quote.gst),
    tds: sum(done, (b) => b.quote.tds),
    workerPayout: sum(done, (b) => b.quote.workerPayout),
    completedJobs: done.length,
  };
}

export interface JobBreakdown {
  total: number;
  requested: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  reschedule: number;
  /** Bookings with a future scheduled slot still awaiting/accepted. */
  scheduled: number;
  /** Distinct workers who worked (accepted/in-progress/completed) in the period. */
  activeWorkers: number;
}

export function jobBreakdown(bookings: Booking[], period: Period, now = new Date()): JobBreakdown {
  const inp = bookings.filter((b) => inPeriod(b.createdAt, period, now));
  const workers = new Set<string>();
  for (const b of inp) {
    if (b.status === "accepted" || b.status === "in_progress" || b.status === "completed") {
      workers.add(b.workerId);
    }
  }
  return {
    total: inp.length,
    requested: inp.filter((b) => b.status === "requested").length,
    accepted: inp.filter((b) => b.status === "accepted").length,
    inProgress: inp.filter((b) => b.status === "in_progress").length,
    completed: inp.filter((b) => b.status === "completed").length,
    cancelled: inp.filter((b) => b.status === "cancelled").length,
    reschedule: inp.filter((b) => b.status === "reschedule").length,
    scheduled: inp.filter(
      (b) =>
        b.schedule?.when === "scheduled" &&
        (b.status === "requested" || b.status === "accepted"),
    ).length,
    activeWorkers: workers.size,
  };
}

export interface OnboardingFunnel {
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
}

/** Worker-onboarding funnel for the period (by application submission date). */
export function onboardingFunnel(
  applications: WorkerApplication[],
  period: Period,
  now = new Date(),
): OnboardingFunnel {
  const inp = applications.filter((a) => inPeriod(a.submittedAt, period, now));
  return {
    submitted: inp.length,
    approved: inp.filter((a) => a.status === "approved").length,
    rejected: inp.filter((a) => a.status === "rejected").length,
    pending: inp.filter((a) => a.status === "pending").length,
  };
}

export interface WorkerEarning {
  workerId: string;
  workerName: string;
  jobs: number;
  commission: number;
  gmv: number;
  payout: number;
}

/** Per-worker commission + payout, highest commission first. */
export function workerEarnings(
  bookings: Booking[],
  period: Period,
  now = new Date(),
): WorkerEarning[] {
  const map = new Map<string, WorkerEarning>();
  for (const b of bookings) {
    if (b.status !== "completed" || !inPeriod(b.createdAt, period, now)) continue;
    const cur =
      map.get(b.workerId) ??
      { workerId: b.workerId, workerName: b.workerName, jobs: 0, commission: 0, gmv: 0, payout: 0 };
    cur.jobs += 1;
    cur.commission += b.quote.platformFee;
    cur.gmv += b.quote.serviceAmount;
    cur.payout += b.quote.workerPayout;
    map.set(b.workerId, cur);
  }
  return [...map.values()].sort((a, b) => b.commission - a.commission);
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "12 Jul"
  commission: number;
  jobs: number;
}

/** Commission + completed-job count per day for the last `days` days. */
export function dailyRevenue(bookings: Booking[], days = 14, now = new Date()): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = ymd(d);
    const dayJobs = bookings.filter(
      (b) => b.status === "completed" && ymd(new Date(b.createdAt)) === key,
    );
    points.push({
      date: key,
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      commission: sum(dayJobs, (b) => b.quote.platformFee),
      jobs: dayJobs.length,
    });
  }
  return points;
}

export interface CategoryCommission {
  categoryId: CategoryId;
  commission: number;
  jobs: number;
}

/** Commission grouped by service category (completed jobs), highest first. */
export function commissionByCategory(
  bookings: Booking[],
  period: Period,
  now = new Date(),
): CategoryCommission[] {
  const map = new Map<CategoryId, CategoryCommission>();
  for (const b of bookings) {
    if (b.status !== "completed" || !inPeriod(b.createdAt, period, now)) continue;
    const cur = map.get(b.categoryId) ?? { categoryId: b.categoryId, commission: 0, jobs: 0 };
    cur.commission += b.quote.platformFee;
    cur.jobs += 1;
    map.set(b.categoryId, cur);
  }
  return [...map.values()].sort((a, b) => b.commission - a.commission);
}

/* ── Worker-facing earnings (payout, not commission) ─────────────────────── */

export interface WorkerEarningsSummary {
  today: number;
  week: number; // rolling last 7 days
  month: number;
  year: number;
  all: number;
  jobs: number; // completed jobs (all time)
  jobsToday: number;
  jobsWeek: number;
}

export function workerEarningsSummary(
  bookings: Booking[],
  workerId: string,
  now = new Date(),
): WorkerEarningsSummary {
  const done = bookings.filter((b) => b.workerId === workerId && b.status === "completed");
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const inWeek = (b: Booking) => new Date(b.createdAt).getTime() >= weekAgo;
  const payout = (pred: (b: Booking) => boolean) =>
    done.filter(pred).reduce((s, b) => s + b.quote.workerPayout, 0);
  return {
    today: payout((b) => inPeriod(b.createdAt, "today", now)),
    week: payout(inWeek),
    month: payout((b) => inPeriod(b.createdAt, "month", now)),
    year: payout((b) => inPeriod(b.createdAt, "year", now)),
    all: payout(() => true),
    jobs: done.length,
    jobsToday: done.filter((b) => inPeriod(b.createdAt, "today", now)).length,
    jobsWeek: done.filter(inWeek).length,
  };
}

export interface BarPoint {
  label: string;
  value: number;
  jobs: number;
}

/** Payout summed by weekday (Mon→Sun) across all completed jobs. */
export function payoutByWeekday(bookings: Booking[], workerId: string): BarPoint[] {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets = names.map((label) => ({ label, value: 0, jobs: 0 }));
  for (const b of bookings) {
    if (b.workerId !== workerId || b.status !== "completed") continue;
    const wd = new Date(b.createdAt).getDay();
    buckets[wd].value += b.quote.workerPayout;
    buckets[wd].jobs += 1;
  }
  // Present Monday-first, the way a work-week reads.
  return [...buckets.slice(1), buckets[0]];
}

/** Payout summed by month (Jan→Dec) for a given year. */
export function payoutByMonth(
  bookings: Booking[],
  workerId: string,
  year = new Date().getFullYear(),
): BarPoint[] {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const buckets = names.map((label) => ({ label, value: 0, jobs: 0 }));
  for (const b of bookings) {
    if (b.workerId !== workerId || b.status !== "completed") continue;
    const d = new Date(b.createdAt);
    if (d.getFullYear() !== year) continue;
    buckets[d.getMonth()].value += b.quote.workerPayout;
    buckets[d.getMonth()].jobs += 1;
  }
  return buckets;
}

/* ── Subscription (recurring Care Plan) analytics ────────────────────────── */

export interface SubscriptionMetrics {
  /** Subscriptions currently active. */
  activePlans: number;
  /** Every subscription ever created (active + cancelled + expired). */
  totalPlans: number;
  /** Monthly recurring revenue to KAAM — commission across active plans. */
  mrr: number;
  /** Monthly gross service value (pre-tax) across active plans. */
  monthlyGmv: number;
  /** Monthly amount customers are billed (incl. GST) across active plans. */
  monthlyBilled: number;
  /** Monthly payout owed to workers across active plans. */
  monthlyWorkerPayout: number;
  /** Total value contracted for the current terms of active plans. */
  contractedValue: number;
}

/** KAAM's commission for one month of a plan, derived from the billed amount. */
function monthlyCommission(s: Subscription): number {
  const serviceMonth = s.monthlyAmount / (1 + GST_RATE); // strip GST
  return serviceMonth * PLATFORM_FEE_RATE;
}

/** Recurring-revenue snapshot from the current subscription book. */
export function subscriptionMetrics(subs: Subscription[]): SubscriptionMetrics {
  const active = subs.filter((s) => s.status === "active");
  return {
    activePlans: active.length,
    totalPlans: subs.length,
    mrr: Math.round(sum(active, monthlyCommission)),
    monthlyGmv: Math.round(sum(active, (s) => s.monthlyAmount / (1 + GST_RATE))),
    monthlyBilled: sum(active, (s) => s.monthlyAmount),
    monthlyWorkerPayout: sum(active, (s) => s.monthlyPayout),
    contractedValue: sum(active, (s) => s.termAmount),
  };
}

export interface CategoryCount {
  categoryId: CategoryId;
  count: number;
  mrr: number;
}

/** Active plans grouped by service category, highest MRR first. */
export function subscriptionsByCategory(subs: Subscription[]): CategoryCount[] {
  const map = new Map<CategoryId, CategoryCount>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    const cur = map.get(s.categoryId) ?? { categoryId: s.categoryId, count: 0, mrr: 0 };
    cur.count += 1;
    cur.mrr += monthlyCommission(s);
    map.set(s.categoryId, cur);
  }
  return [...map.values()]
    .map((c) => ({ ...c, mrr: Math.round(c.mrr) }))
    .sort((a, b) => b.mrr - a.mrr);
}

function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((s, x) => s + f(x), 0);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
