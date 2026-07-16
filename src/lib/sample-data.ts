"use client";

import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { computeQuote } from "./pricing";
import { addBooking, removeBooking } from "./bookings";
import { addApplication, removeApplication } from "./applications";
import type { WorkerApplication } from "./applications";
import type { Booking, BookingStatus } from "./types";

/**
 * Owner-only demo data so a fresh console can be seen fully populated —
 * revenue, commission, operations, onboarding, charts — without hand-creating
 * bookings. Every record's id is prefixed `demo-` so it can be cleared cleanly
 * without touching real data.
 */

export const DEMO_PREFIX = "demo-";
const DAY = 86_400_000;

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
    stateId: "KL",
    surge: worker.surge,
  });
  const createdAt = new Date(Date.now() - ageDays * DAY).toISOString();
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
    city: worker.city,
    categoryId: worker.categoryId,
    experienceYears: worker.experienceYears,
    bio: worker.bio,
    docs: {},
    media: [],
    status,
    submittedAt,
    reviewedAt: status === "pending" ? undefined : new Date(Date.now() - (ageDays - 0.5) * DAY).toISOString(),
    rejectReason: status === "rejected" ? rejectReason : undefined,
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

  const appSpecs: [number, WorkerApplication["status"], number, string?][] = [
    [1, "pending", 0], [2, "pending", 0],
    [3, "approved", 3], [4, "approved", 10],
    [5, "rejected", 4, "Aadhaar photo was blurred — please re-upload."],
  ];
  appSpecs.forEach(([n, status, age, reason], idx) => {
    addApplication(demoApplication(n, w[(idx + 5) % w.length], status, age, reason));
  });
}

/** Remove every demo record, leaving real bookings/applications untouched. */
export function clearSampleData(bookings: Booking[], applications: WorkerApplication[]) {
  bookings.filter((b) => b.id.startsWith(DEMO_PREFIX)).forEach((b) => removeBooking(b.id));
  applications.filter((a) => a.id.startsWith(DEMO_PREFIX)).forEach((a) => removeApplication(a.id));
}

export function hasSampleData(bookings: Booking[], applications: WorkerApplication[]): boolean {
  return (
    bookings.some((b) => b.id.startsWith(DEMO_PREFIX)) ||
    applications.some((a) => a.id.startsWith(DEMO_PREFIX))
  );
}
