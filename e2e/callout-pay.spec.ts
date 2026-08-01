import { expect, test } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

/**
 * A customer calls off a job the worker had already committed to.
 *
 * The rule was written down in four places and delivered in none: the booking
 * became `cancelled` and every worker-facing total counted `completed` alone.
 * These walk the whole way — customer cancels, then look at the worker's own
 * screen — because that gap sat between two modules that each looked right.
 */

const PAID = {
  timing: "base_then_settle",
  paidNow: 590,
  dueOnAccept: 590,
  balanceDue: 0,
  confirmedAt: new Date().toISOString(),
};

const committed = booking({ status: "accepted", payment: PAID });

/** The tile in the Today card whose caption is `label`. */
function tile(page: import("@playwright/test").Page, label: string) {
  return page.getByText(label, { exact: true }).locator("xpath=..");
}

test("cancelling a committed job records what the worker is owed", async ({ page }) => {
  await seed(page, { bookings: [committed] });
  await page.goto("/app/bookings");
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("button", { name: /Yes, cancel/i }).click();

  const stored = await storedBooking(page);
  expect(stored.status).toBe("cancelled");
  // His hour, written onto the booking at the moment it ended.
  expect(stored.calloutPay).toBe(420);
  expect(stored.completedAt).toBeTruthy();
});

test("and the worker sees it on their own screen", async ({ page }) => {
  const cancelled = booking({
    status: "cancelled",
    payment: PAID,
    calloutPay: 420,
    completedAt: new Date().toISOString(),
    cancelReason: "Changed my plans",
  });
  await seed(page, { bookings: [cancelled] });
  await page.goto("/worker");

  await expect(tile(page, "Earned")).toContainText("₹420");
  // But it is not a job done — that number ranks him for customers.
  await expect(tile(page, "Jobs done")).toContainText("0");
});

test("the statement says why the money is there", async ({ page }) => {
  const cancelled = booking({
    status: "cancelled",
    payment: PAID,
    calloutPay: 420,
    completedAt: new Date().toISOString(),
  });
  await seed(page, { bookings: [cancelled] });
  await page.goto("/worker");
  await page.getByRole("button", { name: /Earnings/ }).click();
  await expect(page.getByText("Cancelled — paid for your trip")).toBeVisible();
});

test("a worker who never turned up is owed nothing", async ({ page }) => {
  const noShow = booking({
    status: "cancelled",
    payment: PAID,
    calloutPay: 0,
    completedAt: new Date().toISOString(),
    cancelReason: "Worker did not return for the rescheduled visit",
  });
  await seed(page, { bookings: [noShow] });
  await page.goto("/worker");
  await expect(tile(page, "Earned")).toContainText("₹0");
});
