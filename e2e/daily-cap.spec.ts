import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * The bill stops growing after the daily cap.
 *
 * A fan repair once ran to 11h 27m because nobody closed it. Either side could
 * always stop the clock, but nothing bounded it — so an argument about the
 * hours was an argument about a number still going up.
 */

const PAID = {
  timing: "base_then_settle",
  paidNow: 590,
  dueOnAccept: 590,
  balanceDue: 0,
  confirmedAt: new Date().toISOString(),
};

/** A metered job running for `hours`. */
const running = (hours: number, id = "bk-cap") =>
  booking({
    id,
    status: "in_progress",
    workerId: "w1",
    subService: "Fan Repair",
    startedAt: new Date(Date.now() - hours * 60 * 60_000).toISOString(),
    payment: PAID,
  });

test("an ordinary job says nothing about a cap", async ({ page }) => {
  await seed(page, { bookings: [running(1.5)] });
  await page.goto("/app/bookings");
  await expect(page.getByText(/Billing stopped for today/)).toHaveCount(0);
  await expect(page.getByText(/more minutes are billed today/)).toHaveCount(0);
});

test("an hour before the cap, both sides are warned", async ({ page }) => {
  // 7h 20m in — 40 minutes of billing left.
  await seed(page, { bookings: [running(7 + 20 / 60)] });
  await page.goto("/app/bookings");
  await expect(page.getByText(/more minutes are billed today/)).toBeVisible();
});

test("past the cap the customer is told the amount has stopped", async ({ page }) => {
  await seed(page, { bookings: [running(9)] });
  await page.goto("/app/bookings");
  const note = page.getByText(/Billing stopped for today/);
  await expect(note).toBeVisible();
  await expect(page.getByText(/the amount will not grow/)).toBeVisible();
});

test("the worker is told the same thing, in their own words", async ({ page }) => {
  await seed(page, { bookings: [running(9)] });
  await page.goto("/worker");
  await expect(page.getByText(/Billing stopped for today/)).toBeVisible();
  await expect(page.getByText(/nothing more is earned today/)).toBeVisible();
});

test("the 11h 27m case is billed as eight hours, not eleven and a half", async ({ page }) => {
  await seed(page, { bookings: [running(11 + 27 / 60)] });
  await page.goto("/app/bookings");
  // The clock still tells the truth about how long it has been…
  await expect(page.getByText(/Job clock: 11h/)).toHaveCount(0);
  // …and the bill has stopped.
  await expect(page.getByText(/Billing stopped for today \(8h limit\)/)).toBeVisible();
});
