import { expect, test, type Page } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

/**
 * "Get someone else to finish it."
 *
 * A worker opened the wall, agreed to come back tomorrow, and didn't. Ending
 * the job returns the money and leaves the customer exactly where they were:
 * a hole in the wall and nobody coming. This is the other way out — the job
 * carries on with somebody else, and what the first worker did travels with it.
 */

/** A scheduled slot `hours` in the past, in the form the app stores. */
function slotHoursAgo(hours: number) {
  const d = new Date(Date.now() - hours * 60 * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    when: "scheduled" as const,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const REPORT = {
  did: ["diagnosed", "replaced"],
  left: "needs_part",
  part: "Capacitor",
  photos: ["data:image/gif;base64,R0lGODlhAQABAAAAACw="],
  at: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
};

/** A repair paused for a return visit the worker never made. */
const stoodUp = (over: Record<string, unknown> = {}) =>
  booking({
    id: "bk-abandoned",
    status: "in_progress",
    categoryId: "elec",
    subService: "Fan Repair",
    address: "Kakkanad, Kochi",
    startedAt: new Date(Date.now() - 27 * 60 * 60_000).toISOString(),
    bankedMs: 45 * 60_000,
    pausedAt: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    // Agreed to return three hours ago — well past the 45-minute grace.
    schedule: slotHoursAgo(3),
    report: REPORT,
    payment: { timing: "base_then_settle", paidNow: 590, balanceDue: 0 },
    ...over,
  });

async function allBookings(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("kaam.bookings.v1") ?? "[]") as Record<string, unknown>[],
  );
}

async function handOver(page: Page) {
  const btn = page.getByRole("button", { name: /Get someone else to finish it/ });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
}

test("a customer left waiting is offered someone else, not just a refund", async ({ page }) => {
  await seed(page, { bookings: [stoodUp()] });
  await page.goto("/app/bookings");
  await expect(page.getByRole("button", { name: /Get someone else to finish it/ })).toBeVisible();
  // And the promise that makes it worth tapping.
  await expect(page.getByText(/don't pay the base hour twice/)).toBeVisible();
});

test("being twenty minutes late is not abandonment", async ({ page }) => {
  await seed(page, { bookings: [stoodUp({ schedule: slotHoursAgo(0.33) })] });
  await page.goto("/app/bookings");
  await expect(page.getByText(/late/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Get someone else/ })).toHaveCount(0);
});

test("one tap starts a new job with a different worker", async ({ page }) => {
  await seed(page, { bookings: [stoodUp()] });
  await page.goto("/app/bookings");
  await handOver(page);

  await expect(page.getByText("Someone else is coming to finish it")).toBeVisible();

  const all = await allBookings(page);
  expect(all).toHaveLength(2);
  const next = all.find((b) => b.id !== "bk-abandoned")!;
  expect(next.handoverOf).toBe("bk-abandoned");
  expect(next.status).toBe("requested");
  // Never back to the worker who didn't come.
  expect(next.workerId).not.toBe("w1");
});

test("what the first worker did travels to the next one", async ({ page }) => {
  await seed(page, { bookings: [stoodUp()] });
  await page.goto("/app/bookings");
  await handOver(page);

  const next = (await allBookings(page)).find((b) => b.id !== "bk-abandoned")!;
  expect(next.report).toEqual(REPORT);

  // And it is in the chat, where the new worker will actually read it.
  const chat = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kaam.chat.v1") ?? "[]") as Record<string, string>[],
  );
  const brief = chat.find((m) => m.bookingId === next.id);
  expect(brief?.text).toContain("Already done");
  expect(brief?.text).toContain("Capacitor");
});

test("the abandoned job is closed honestly and points at its successor", async ({ page }) => {
  await seed(page, { bookings: [stoodUp()] });
  await page.goto("/app/bookings");
  await handOver(page);

  const old = await storedBooking(page, "bk-abandoned");
  expect(old.status).toBe("cancelled");
  expect(old.cancelReason).toContain("handed to another worker");
  const next = (await allBookings(page)).find((b) => b.id !== "bk-abandoned")!;
  expect(old.handedTo).toBe(next.id);
  // The clock is cleared, so nothing can resume behind the handover.
  expect(old.pausedAt ?? null).toBeNull();
});

test("the customer is not asked to buy the base hour a second time", async ({ page }) => {
  await seed(page, { bookings: [stoodUp()] });
  await page.goto("/app/bookings");
  await handOver(page);

  const next = (await allBookings(page)).find((b) => b.id !== "bk-abandoned")!;
  const quote = next.quote as Record<string, number>;
  const payment = next.payment as Record<string, number>;
  expect(quote.totalUserPays).toBe(0);
  expect(payment.paidNow).toBe(0);
  expect(payment.dueOnAccept).toBe(0);
  // But the worker who comes out still sees the trip guaranteed.
  expect(quote.workerPayout).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByText(/You bought the base hour once/)).toBeVisible();
});

test("the worker sees what they are walking into before they accept", async ({ page }) => {
  // Half-done work is a different job to a fresh one. Putting the brief behind
  // the Accept button would ask someone to agree to work they cannot see.
  await seed(page, {
    bookings: [
      booking({
        id: "bk-next",
        status: "requested",
        categoryId: "elec",
        subService: "Fan Repair",
        address: "Kakkanad, Kochi",
        handoverOf: "bk-abandoned",
        report: REPORT,
        quote: {
          serviceAmount: 0, surgeApplied: false, gst: 0, cess: 0,
          totalUserPays: 0, platformFee: 0, tds: 0, workerPayout: 420,
        },
        payment: { timing: "base_then_settle", paidNow: 0, dueOnAccept: 0, balanceDue: 0 },
      }),
    ],
  });
  await page.goto("/worker");
  await expect(page.getByText("Taking over an unfinished job")).toBeVisible();
  await expect(page.getByText(/Already done/)).toBeVisible();
  await expect(page.getByText(/Capacitor/)).toBeVisible();
  // The trip guarantee is the reason a short finish is still worth taking.
  await expect(page.getByText(/guaranteed for the trip/)).toBeVisible();
});

test("a trade with no clock to stop is never handed over this way", async ({ page }) => {
  // A singer's booking has no half-finished state — see handover.ts.
  await seed(page, { bookings: [stoodUp({ categoryId: "singer", subService: "Wedding Sangeet" })] });
  await page.goto("/app/bookings");
  await expect(page.getByRole("button", { name: /Get someone else/ })).toHaveCount(0);
});
