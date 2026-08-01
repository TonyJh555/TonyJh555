import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * Money a worker earned today shows up today.
 *
 * Reported from a real phone: a worker finished a job, the money was real, and
 * the Today meter still read ₹0. The booking had been created days earlier —
 * every earnings figure filed the payout under the day the customer tapped
 * Book, a day already closed.
 *
 * These check the screen rather than the function, because the function was
 * only ever half the problem: the worker's own Today card did its own filtering
 * and had the same bug independently of the analytics module.
 */

/** The tile in the Today card whose caption is `label`. */
function tile(page: import("@playwright/test").Page, label: string) {
  return page.getByText(label, { exact: true }).locator("xpath=..");
}
const earnedTile = (page: import("@playwright/test").Page) => tile(page, "Earned");

const FIVE_DAYS_AGO = new Date(Date.now() - 5 * 86_400_000).toISOString();
const PAID = {
  timing: "base_then_settle",
  paidNow: 590,
  dueOnAccept: 590,
  balanceDue: 0,
  confirmedAt: new Date().toISOString(),
};

/** Ordered last week, finished a moment ago — the reported case. */
const finishedToday = booking({
  id: "bk-old-order",
  status: "completed",
  createdAt: FIVE_DAYS_AGO,
  completedAt: new Date().toISOString(),
  startedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  payment: PAID,
});

test("a job ordered last week and finished today counts today", async ({ page }) => {
  await seed(page, { bookings: [finishedToday] });
  await page.goto("/worker");

  await expect(earnedTile(page)).toContainText("₹420");
  // And the job counter alongside it, which read 0 for the same reason.
  await expect(tile(page, "Jobs done")).toContainText("1");
});

test("the weekly goal ring counts it too", async ({ page }) => {
  await seed(page, { bookings: [finishedToday] });
  await page.goto("/worker");
  // "This week ₹420 / ₹5,000" — before the fix this read ₹0 because the
  // booking date fell in the previous Monday-to-Sunday week.
  await expect(page.getByText(/This week ₹420/)).toBeVisible();
});

test("the Earnings tab agrees with the Today card", async ({ page }) => {
  // Two screens showing the same money must not disagree — that was the
  // failure that made this hard to believe rather than merely wrong.
  await seed(page, { bookings: [finishedToday] });
  await page.goto("/worker");
  await page.getByRole("button", { name: /Earnings/ }).click();
  const today = page.getByText("Today", { exact: true }).first().locator("xpath=..");
  await expect(today).toContainText("₹420");
});

test("work that is paid for but not finished is not counted as earned", async ({ page }) => {
  // The customer has paid the base hour and the job has not started. That
  // money is committed but it is not takings, and the meter is a record of
  // work done — so ₹0 here is correct, not the bug.
  const paidNotDone = booking({
    id: "bk-paid",
    status: "accepted",
    createdAt: new Date().toISOString(),
    payment: PAID,
  });
  await seed(page, { bookings: [paidNotDone] });
  await page.goto("/worker");
  await expect(earnedTile(page)).toContainText("₹0");
});

test("a job finished on an earlier day stays on that day", async ({ page }) => {
  // The fix must not sweep old work into today.
  const finishedLastWeek = booking({
    id: "bk-last-week",
    status: "completed",
    createdAt: FIVE_DAYS_AGO,
    completedAt: FIVE_DAYS_AGO,
    payment: PAID,
  });
  await seed(page, { bookings: [finishedLastWeek] });
  await page.goto("/worker");
  await expect(earnedTile(page)).toContainText("₹0");
});
