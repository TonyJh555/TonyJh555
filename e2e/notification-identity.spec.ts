import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * A job alert says which job it is about.
 *
 * With one booking "Fan Repair: nearly an hour worked" is fine. With six it is
 * the same sentence six times, and the reader has to open each one to find out
 * which job is nearly out of its base hour.
 */

const PAID = {
  timing: "base_then_settle",
  paidNow: 590,
  dueOnAccept: 590,
  balanceDue: 0,
  confirmedAt: new Date().toISOString(),
};

/** Running, 56 minutes in — inside the base-hour alarm window. */
const nearlyAnHour = booking({
  id: "bk-fan-1a2b3c4d",
  status: "in_progress",
  workerId: "w1",
  workerName: "Rahul Sharma",
  subService: "Fan Repair",
  startedAt: new Date(Date.now() - 56 * 60_000).toISOString(),
  payment: PAID,
});

/**
 * The alarm fires once and remembers itself in localStorage. Seeding navigates
 * once before the page under test mounts, which is enough for it to fire and
 * mark itself sent — so the flag is cleared here, after seeding.
 */
async function arrive(page: import("@playwright/test").Page, bookings: unknown[]) {
  await seed(page, { bookings });
  await page.evaluate(() => localStorage.removeItem("kaam.jobAlarmsSent.v1"));
  await page.goto("/app/bookings");
}

const banner = (page: import("@playwright/test").Page) =>
  page.locator("text=Base hour almost up").locator("xpath=ancestor::div[2]");

test("the base-hour alarm names the job, the worker and a reference", async ({ page }) => {
  await arrive(page, [nearlyAnHour]);

  await expect(banner(page)).toBeVisible();
  // The service is in the title now, not buried in the sentence.
  await expect(banner(page)).toContainText("Fan Repair");
  await expect(banner(page)).toContainText("Rahul Sharma");
  // The same reference the tax invoice prints.
  await expect(banner(page)).toContainText("KAAM-1A2B3C4D");
});

test("it says when the job started, so yesterday's alert is distinguishable", async ({ page }) => {
  await arrive(page, [nearlyAnHour]);
  // A clock time and a date, e.g. "7:15 pm, 2 Aug".
  await expect(banner(page)).toContainText(/\d{1,2}:\d{2}\s*(am|pm)/i);
});

test("two running jobs produce two alerts that can be told apart", async ({ page }) => {
  const second = booking({
    id: "bk-tap-99887766",
    status: "in_progress",
    workerId: "w2",
    workerName: "Deepa Antony",
    categoryId: "plumb",
    subService: "Leak Fix",
    startedAt: new Date(Date.now() - 57 * 60_000).toISOString(),
    payment: PAID,
  });
  await arrive(page, [nearlyAnHour, second]);

  // Only one banner shows at a time, but whichever it is must identify itself
  // rather than describing a generic "job".
  await expect(banner(page)).toBeVisible();
  const text = (await banner(page).textContent()) ?? "";
  expect(text).toMatch(/KAAM-(1A2B3C4D|99887766)/);
  expect(text).toMatch(/Fan Repair|Leak Fix/);
});
