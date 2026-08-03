import { expect, test } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

/**
 * A repair closes with a report.
 *
 * It is the handover a replacement worker reads, the customer's evidence in a
 * complaint, and the worker's evidence when they are the one accused. Asked at
 * the moment the job closes, because that is the only moment the worker is
 * definitely still standing in front of the work.
 */

const PAID = {
  timing: "base_then_settle",
  paidNow: 590,
  dueOnAccept: 590,
  balanceDue: 0,
  confirmedAt: new Date().toISOString(),
};

const repair = booking({
  id: "bk-report",
  status: "in_progress",
  workerId: "w1",
  categoryId: "elec",
  subService: "Fan Repair",
  startedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
  payment: PAID,
});

test("the worker is asked what they did before the job can close", async ({ page }) => {
  await seed(page, { bookings: [repair] });
  await page.goto("/worker");
  await page.getByRole("button", { name: /Work is done/ }).first().click();

  await expect(page.getByText("What did you do?")).toBeVisible();
  // And it cannot be skipped: nothing chosen, nothing to submit.
  await expect(page.getByRole("button", { name: /Work is done →/ })).toBeDisabled();
});

test("two taps are enough to finish", async ({ page }) => {
  await seed(page, { bookings: [repair] });
  await page.goto("/worker");
  await page.getByRole("button", { name: /Work is done/ }).first().click();

  await page.getByRole("button", { name: "Replaced a part" }).click();
  await page.getByRole("button", { name: "Nothing — the job is finished" }).click();
  await page.getByRole("button", { name: /Work is done →/ }).click();

  const stored = await storedBooking(page, "bk-report");
  expect(stored.report.did).toEqual(["replaced"]);
  expect(stored.report.left).toBe("nothing");
  // The clock stopped at the same moment.
  expect(stored.completion).toBeTruthy();
});

test("a job with work left asks which part", async ({ page }) => {
  await seed(page, { bookings: [repair] });
  await page.goto("/worker");
  await page.getByRole("button", { name: /Work is done/ }).first().click();
  await page.getByRole("button", { name: "Checked & diagnosed" }).click();

  // Nothing outstanding → no point asking.
  await page.getByRole("button", { name: "Nothing — the job is finished" }).click();
  await expect(page.getByPlaceholder("Which part? (optional)")).toHaveCount(0);

  await page.getByRole("button", { name: "A part has to be bought" }).click();
  await expect(page.getByPlaceholder("Which part? (optional)")).toBeVisible();
});

test("the customer reads the report before agreeing", async ({ page }) => {
  const declared = booking({
    id: "bk-report-2",
    status: "in_progress",
    workerId: "w1",
    categoryId: "elec",
    subService: "Fan Repair",
    startedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    payment: PAID,
    completion: { by: "worker", at: new Date().toISOString(), code: "4321" },
    report: { did: ["replaced", "tested"], left: "nothing", part: "Capacitor", photos: [], at: new Date().toISOString() },
  });
  await seed(page, { bookings: [declared] });
  await page.goto("/app/bookings");

  await expect(page.getByText("Work done")).toBeVisible();
  await expect(page.getByText(/Replaced a part/)).toBeVisible();
  await expect(page.getByText(/Tested — working now/)).toBeVisible();
});

test("a violinist is never asked for a report", async ({ page }) => {
  const gig = booking({
    id: "bk-gig",
    status: "in_progress",
    workerId: "w20",
    categoryId: "violin",
    subService: "Wedding / Event",
    startedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    payment: PAID,
  });
  await seed(page, { bookings: [gig] });
  await page.goto("/app/bookings");
  await expect(page.getByText("What did you do?")).toHaveCount(0);
});
