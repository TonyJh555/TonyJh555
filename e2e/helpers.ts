import type { Page } from "@playwright/test";

/** A signed-in customer, with the onboarding tour already dismissed. */
export const CUSTOMER = {
  id: "c1",
  name: "Anu",
  identifier: { type: "phone", value: "9876543210" },
  createdAt: "2026-07-01T00:00:00.000Z",
};

const QUOTE = {
  serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0,
  totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420,
};

/** A booking in whatever state a test needs, with sensible defaults. */
export function booking(over: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "bk1", customerId: "c1", workerId: "w1", workerName: "Rahul Sharma",
    categoryId: "elec", subService: "Fan Repair", tenureId: "hr", stateId: "KL",
    quote: QUOTE, paymentMethod: "gpay", status: "requested",
    startCode: "7686", createdAt: now, schedule: { when: "asap" },
    ...over,
  };
}

/**
 * Put the app into a known state before a test. Seeding storage rather than
 * clicking through setup keeps each test about the one thing it checks.
 */
export async function seed(
  page: Page,
  { bookings = [], signedIn = true }: { bookings?: unknown[]; signedIn?: boolean } = {},
) {
  await page.goto("/app");
  await page.evaluate(
    ({ bookings, signedIn, customer }) => {
      localStorage.clear();
      localStorage.setItem("kaam.tour.done", "1");
      if (signedIn) localStorage.setItem("kaam.customer.v1", JSON.stringify(customer));
      localStorage.setItem("kaam.bookings.v1", JSON.stringify(bookings));
    },
    { bookings, signedIn, customer: CUSTOMER },
  );
}

/** What the app has actually stored — the truth, not what the screen claims. */
export async function storedBooking(page: Page, id = "bk1") {
  return page.evaluate((id) => {
    const list = JSON.parse(localStorage.getItem("kaam.bookings.v1") || "[]");
    return list.find((b: { id: string }) => b.id === id);
  }, id);
}
