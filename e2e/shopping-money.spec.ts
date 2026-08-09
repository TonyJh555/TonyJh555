import { expect, test } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

/**
 * The money on a shopping job.
 *
 * This is the only trade on KAAM where the worker carries the customer's cash,
 * and the way it goes wrong is quiet: the money hadn't arrived, the shop was
 * closing, so the worker paid — a ₹4,000 loan from the poorest person in the
 * transaction, on a ₹300 trip. These tests are about the two things that
 * prevent it: the amount goes out before the shop, and each figure is written
 * by the side that actually knows it.
 */

const PAID = {
  timing: "advance_then_balance",
  paidNow: 106,
  dueOnAccept: 106,
  balanceDue: 248,
  confirmedAt: new Date().toISOString(),
};

/**
 * The worker dashboard opens as whoever is first in the roster — an
 * electrician. A shopping job belongs to a shopper, so these tests switch
 * identity the same way the demo picker does rather than pinning a grocery run
 * on Rahul Sharma and quietly making the fixture a lie.
 */
async function asShopper(page: import("@playwright/test").Page) {
  await page.goto("/worker");
  await page.getByRole("button", { name: /View as:/ }).click();
  await page.getByPlaceholder("Name, trade or city").fill("anoop krishnan");
  await page.getByRole("button", { name: /^Anoop Krishnan/ }).first().click();
  await expect(page.getByRole("button", { name: /View as: Anoop Krishnan/ })).toBeVisible();
}

const shop = (over: Record<string, unknown> = {}) =>
  booking({
    id: "bk-shop",
    status: "accepted",
    workerId: "w24",
    workerName: "Anoop Krishnan",
    categoryId: "shopper",
    subService: "Grocery & Supermarket",
    tenureId: "hr",
    payment: PAID,
    ...over,
  });

test("the customer is told to send the money before the shop, not after", async ({ page }) => {
  await seed(page, { bookings: [shop()] });
  await page.goto("/app/bookings");

  await expect(page.getByText("💰 Money for the shopping")).toBeVisible();
  await expect(page.getByText(/before they leave for the shop/)).toBeVisible();
  // And the promise that makes the trip worth booking at all.
  await expect(page.getByText(/Nothing is taken from your shopping bill/)).toBeVisible();
});

test("the worker is given permission to wait", async ({ page }) => {
  await seed(page, { bookings: [shop()] });
  await asShopper(page);

  // The part that actually needs saying out loud: refusing is normal.
  await expect(page.getByText(/Never buy with your own money/)).toBeVisible();
});

test("the customer records what they sent, and only that", async ({ page }) => {
  await seed(page, { bookings: [shop()] });
  await page.goto("/app/bookings");

  await page.getByPlaceholder("₹").fill("2000");
  await page.getByRole("button", { name: "I sent this much" }).click();

  const stored = await storedBooking(page, "bk-shop");
  expect(stored.shopping.sent).toBe(2000);
  expect(stored.shopping.sentAt).toBeTruthy();
  // The bill is not theirs to write.
  expect(stored.shopping.bill).toBeUndefined();
  await expect(page.getByRole("button", { name: "Record the bill" })).toHaveCount(0);
});

test("the worker cannot record a bill before any money has reached them", async ({ page }) => {
  await seed(page, { bookings: [shop()] });
  await asShopper(page);

  await expect(page.getByRole("button", { name: "Record the bill" })).toHaveCount(0);
  // Nor can they claim the customer sent something.
  await expect(page.getByRole("button", { name: "I sent this much" })).toHaveCount(0);
});

test("the worker records the bill once the money is with them", async ({ page }) => {
  await seed(page, { bookings: [shop({ shopping: { sent: 2000, sentAt: new Date().toISOString() } })] });
  await asShopper(page);

  await page.getByPlaceholder("₹").fill("1740");
  await page.getByRole("button", { name: "Record the bill" }).click();

  const stored = await storedBooking(page, "bk-shop");
  expect(stored.shopping.bill).toBe(1740);
  expect(stored.shopping.sent).toBe(2000);
});

test("the change is the number in the largest type", async ({ page }) => {
  await seed(page, {
    bookings: [shop({ shopping: { sent: 2000, sentAt: "2026-08-09T09:00:00.000Z", bill: 1740 } })],
  });
  await page.goto("/app/bookings");

  await expect(page.getByText("Change coming back to you")).toBeVisible();
  await expect(page.getByText("₹260", { exact: true })).toBeVisible();
});

test("a bill that came in over says the worker is owed money back", async ({ page }) => {
  // The case that gets forgotten, and the one that costs a worker real money.
  await seed(page, {
    bookings: [shop({ shopping: { sent: 1500, sentAt: "2026-08-09T09:00:00.000Z", bill: 1780 } })],
  });

  await asShopper(page);
  await expect(page.getByText(/You covered this yourself/)).toBeVisible();
  await expect(page.getByText("₹280", { exact: true })).toBeVisible();

  await page.goto("/app/bookings");
  await expect(page.getByText(/this is owed to them/)).toBeVisible();
});

test("a bill that landed exactly asks nobody to confirm a handover", async ({ page }) => {
  await seed(page, {
    bookings: [shop({ shopping: { sent: 2000, sentAt: "2026-08-09T09:00:00.000Z", bill: 2000 } })],
  });
  await page.goto("/app/bookings");

  await expect(page.getByText("Money settled")).toBeVisible();
  await expect(page.getByRole("button", { name: "Got the change" })).toHaveCount(0);
});

test("the ledger closes when the change actually changes hands", async ({ page }) => {
  await seed(page, {
    bookings: [shop({ shopping: { sent: 2000, sentAt: "2026-08-09T09:00:00.000Z", bill: 1740 } })],
  });
  await page.goto("/app/bookings");

  await page.getByRole("button", { name: "Got the change" }).click();

  const stored = await storedBooking(page, "bk-shop");
  expect(stored.shopping.settledAt).toBeTruthy();
  await expect(page.getByText("Money settled")).toBeVisible();
});

test("an electrician is never asked about shopping money", async ({ page }) => {
  await seed(page, { bookings: [booking({ id: "bk-shop", status: "accepted", payment: PAID })] });
  await page.goto("/app/bookings");

  await expect(page.getByText("💰 Money for the shopping")).toHaveCount(0);
});
