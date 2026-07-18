"use client";

import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { computeQuote } from "./pricing";
import { planQuote, getCarePlan, perMonth, type PlanId } from "./plans";
import { addBooking, removeBooking } from "./bookings";
import {
  addSubscription,
  removeSubscription,
  listSubscriptions,
  nextRenewal,
} from "./subscriptions";
import { addApplication, removeApplication } from "./applications";
import type { WorkerApplication } from "./applications";
import type { Booking, BookingStatus, Subscription, SubscriptionStatus } from "./types";

/**
 * Owner-only demo data so a fresh console can be seen fully populated —
 * revenue, commission, operations, onboarding, charts — without hand-creating
 * bookings. Every record's id is prefixed `demo-` so it can be cleared cleanly
 * without touching real data.
 */

export const DEMO_PREFIX = "demo-";
const DAY = 86_400_000;

/** A lightweight inline SVG "document" so previews are visible without uploads. */
function docImage(title: string, subtitle: string, bg: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='214'>` +
    `<rect width='340' height='214' rx='14' fill='${bg}'/>` +
    `<rect x='16' y='16' width='308' height='182' rx='10' fill='#ffffff' opacity='0.12'/>` +
    `<text x='28' y='54' font-family='sans-serif' font-size='19' font-weight='bold' fill='#ffffff'>${title}</text>` +
    `<text x='28' y='104' font-family='monospace' font-size='24' fill='#ffffff'>XXXX XXXX 1234</text>` +
    `<text x='28' y='140' font-family='sans-serif' font-size='14' fill='#ffffff' opacity='0.85'>${subtitle}</text>` +
    `<text x='28' y='182' font-family='sans-serif' font-size='12' fill='#ffffff' opacity='0.7'>KAAM · demo document (sample data)</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const DEMO_DOCS = {
  aadhaarFront: docImage("AADHAAR — Front", "Govt. of India", "#c2410c"),
  aadhaarBack: docImage("AADHAAR — Back", "Address proof", "#0369a1"),
  certificate: docImage("Trade Certificate", "ITI · 2019", "#15803d"),
};

const DEMO_MEDIA = [
  { kind: "image" as const, dataUrl: docImage("Work sample 1", "On-site job photo", "#7c3aed") },
  { kind: "image" as const, dataUrl: docImage("Work sample 2", "Completed work", "#be123c") },
];

const DEMO_SOCIAL = {
  instagram: "@kaam.pro.demo",
  youtube: "@kaamproworker",
  website: "kaamworker.example.in",
};

function demoBooking(
  n: number,
  worker: (typeof WORKERS)[number],
  status: BookingStatus,
  ageDays: number,
  scheduled = false,
): Booking {
  const cat = getCategory(worker.categoryId);
  const quote = computeQuote({
    rate: worker.rate,
    tenureId: "hr",
    unit: worker.unit,
    stateId: "KL",
    surge: worker.surge,
  });
  // Spread bookings across realistic hours (morning + evening peaks) so the
  // demand heatmap has shape rather than a single-hour stripe.
  const HOURS = [8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 14, 9, 18, 10, 19];
  const created = new Date(Date.now() - ageDays * DAY);
  created.setHours(HOURS[n % HOURS.length], (n * 7) % 60, 0, 0);
  const createdAt = created.toISOString();
  const futureDate = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10);
  return {
    id: `${DEMO_PREFIX}bk-${n}`,
    customerId: `${DEMO_PREFIX}cust`,
    workerId: worker.id,
    workerName: worker.name,
    categoryId: worker.categoryId,
    subService: cat.subServices[0] ?? cat.label,
    tenureId: "hr",
    stateId: "KL",
    address: worker.city,
    schedule: scheduled ? { when: "scheduled", date: futureDate, time: "10:00" } : { when: "asap" },
    quote,
    paymentMethod: "gpay",
    status,
    startCode: "1234",
    createdAt,
    // Give completed jobs a realistic, mostly-happy rating so CSAT charts fill.
    rating: status === "completed" ? [5, 5, 4, 5, 4, 3][n % 6] : undefined,
    // Worker→customer rating (two-way trust) on completed jobs.
    customerRating: status === "completed" ? [5, 4, 5, 5, 4][n % 5] : undefined,
    cancelReason:
      status === "cancelled"
        ? ["Changed my plans", "Found another option", "Booked by mistake"][n % 3]
        : undefined,
  };
}

function demoApplication(
  n: number,
  worker: (typeof WORKERS)[number],
  status: WorkerApplication["status"],
  ageDays: number,
  rejectReason?: string,
): WorkerApplication {
  const submittedAt = new Date(Date.now() - ageDays * DAY).toISOString();
  return {
    id: `${DEMO_PREFIX}app-${n}`,
    name: worker.name,
    phone: "98470 00000",
    email: `${worker.name.split(" ")[0].toLowerCase()}.demo@example.com`,
    city: worker.city,
    categoryId: worker.categoryId,
    experienceYears: worker.experienceYears,
    bio: worker.bio,
    social: DEMO_SOCIAL,
    docs: DEMO_DOCS,
    media: DEMO_MEDIA,
    status,
    submittedAt,
    reviewedAt: status === "pending" ? undefined : new Date(Date.now() - (ageDays - 0.5) * DAY).toISOString(),
    rejectReason: status === "rejected" ? rejectReason : undefined,
  };
}

function demoSubscription(
  n: number,
  worker: (typeof WORKERS)[number],
  planId: PlanId,
  startAgeDays: number,
  status: SubscriptionStatus = "active",
  online = false,
): Subscription {
  const cat = getCategory(worker.categoryId);
  const plan = getCarePlan(planId);
  const quote = planQuote({ rate: worker.rate, unit: worker.unit, stateId: "KL", surge: false, plan, online });
  const startDate = new Date(Date.now() - startAgeDays * DAY).toISOString();
  const renewsOn = nextRenewal(startDate, plan.months);
  const ref = `${DEMO_PREFIX}sub-ref-${n}`;
  return {
    id: `${DEMO_PREFIX}sub-${n}`,
    customerId: `${DEMO_PREFIX}cust`,
    workerId: worker.id,
    workerName: worker.name,
    categoryId: worker.categoryId,
    service: `${cat.subServices[0] ?? cat.label} · ${plan.label} plan${online ? " · Online" : ""}`,
    planId: plan.id,
    months: plan.months,
    monthlyAmount: perMonth(quote, plan),
    termAmount: quote.totalUserPays,
    monthlyPayout: Math.round(quote.workerPayout / plan.months),
    termPayout: quote.workerPayout,
    online,
    startDate,
    renewsOn,
    autoRenew: status === "active",
    status,
    paymentRef: ref,
    history: [{ date: startDate, amount: quote.totalUserPays, ref }],
    createdAt: startDate,
  };
}

/** Populate the console with a realistic spread of activity across time. */
export function loadSampleData() {
  const w = WORKERS;
  // [id, status, ageDays, scheduled?]
  const bookingSpecs: [number, BookingStatus, number, boolean?][] = [
    [1, "completed", 0], [2, "completed", 0], [3, "completed", 1],
    [4, "completed", 6], [5, "completed", 14], [6, "completed", 22],
    [7, "completed", 55], [8, "completed", 190],
    [9, "cancelled", 0], [10, "in_progress", 0],
    [11, "requested", 0], [12, "accepted", 1, true],
  ];
  bookingSpecs.forEach(([n, status, age, scheduled], idx) => {
    addBooking(demoBooking(n, w[idx % w.length], status, age, Boolean(scheduled)));
  });

  // Extra completed jobs for the default view-as worker (WORKERS[0]) spread
  // across weekdays and months, so their Earnings charts look populated.
  [2, 3, 5, 9, 16, 24, 38, 70, 110, 160, 240, 300].forEach((age, i) => {
    addBooking(demoBooking(100 + i, w[0], "completed", age));
  });

  const appSpecs: [number, WorkerApplication["status"], number, string?][] = [
    [1, "pending", 0], [2, "pending", 0],
    [3, "approved", 3], [4, "approved", 10],
    [5, "rejected", 4, "Aadhaar photo was blurred — please re-upload."],
  ];
  appSpecs.forEach(([n, status, age, reason], idx) => {
    addApplication(demoApplication(n, w[(idx + 5) % w.length], status, age, reason));
  });

  // Recurring Care Plans → drive the "guaranteed income" worker view and the
  // subscription revenue on the admin console. Seeded on plan-eligible /
  // teachable workers. [workerId, planId, startAgeDays, status?, online?]
  const findW = (id: string) => WORKERS.find((x) => x.id === id) ?? WORKERS[0];
  const subSpecs: [string, PlanId, number, SubscriptionStatus?, boolean?][] = [
    ["w2", "m3", 20], // Home nurse — 3-month plan
    ["w19", "m6", 45], // Elder care — 6-month plan
    ["w18", "m3", 12], // House maid — 3-month
    ["w8", "m1", 8], // Cook — monthly
    ["w17", "m3", 30], // Baby sitter — 3-month
    ["w3", "m3", 15, "active", true], // Tutor — online lessons
    ["w13", "m6", 60, "active", true], // Violin — online lessons
    ["w2", "m1", 95, "expired"], // an old, ended nurse plan
  ];
  subSpecs.forEach(([wid, planId, age, status, online], i) => {
    addSubscription(demoSubscription(200 + i, findW(wid), planId, age, status ?? "active", Boolean(online)));
  });
}

/** Remove every demo record, leaving real bookings/applications untouched. */
export function clearSampleData(bookings: Booking[], applications: WorkerApplication[]) {
  bookings.filter((b) => b.id.startsWith(DEMO_PREFIX)).forEach((b) => removeBooking(b.id));
  applications.filter((a) => a.id.startsWith(DEMO_PREFIX)).forEach((a) => removeApplication(a.id));
  listSubscriptions()
    .filter((s) => s.id.startsWith(DEMO_PREFIX))
    .forEach((s) => removeSubscription(s.id));
}

export function hasSampleData(bookings: Booking[], applications: WorkerApplication[]): boolean {
  return (
    bookings.some((b) => b.id.startsWith(DEMO_PREFIX)) ||
    applications.some((a) => a.id.startsWith(DEMO_PREFIX)) ||
    listSubscriptions().some((s) => s.id.startsWith(DEMO_PREFIX))
  );
}
