import { expect, test } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

/**
 * The worker agreed to come back and didn't.
 *
 * The billing side was always safe — nothing auto-resumes, so a late or absent
 * worker costs the customer nothing. What was missing was an ending: a paused
 * job had no deadline and no way out except cancelling, which read as the
 * customer's fault and could forfeit the base hour to the worker who stood
 * them up.
 */

/** A job paused mid-way, with the worker due back `minutesAgo` minutes ago. */
function overdue(minutesAgo: number) {
  const due = new Date(Date.now() - minutesAgo * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return booking({
    status: "in_progress",
    startedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    bankedMs: 30 * 60_000, // 30 min worked before the pause
    pausedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    schedule: {
      when: "scheduled",
      date: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
      time: `${pad(due.getHours())}:${pad(due.getMinutes())}`,
    },
    payment: { timing: "base_then_settle", paidNow: 590, dueOnAccept: 590, balanceDue: 0,
               confirmedAt: new Date().toISOString() },
  });
}

test.describe("late is not the same as never coming", () => {
  test("a merely late worker gets no accusation, and no charge", async ({ page }) => {
    await seed(page, { bookings: [overdue(20)] });
    await page.goto("/app/bookings");

    await expect(page.getByText(/Rahul is 20 min late/i)).toBeVisible();
    await expect(page.getByText(/not paying for this waiting time/i)).toBeVisible();
    // Nothing is offered yet — 20 minutes of traffic is not abandonment.
    await expect(page.getByRole("button", { name: /never came/i })).toHaveCount(0);
  });

  test("nothing resumes on its own while the customer waits", async ({ page }) => {
    await seed(page, { bookings: [overdue(20)] });
    await page.goto("/app/bookings");
    await page.waitForTimeout(1500);
    // The meter must stay frozen: an auto-resume would bill an empty room.
    expect((await storedBooking(page))?.pausedAt).toBeTruthy();
  });
});

test.describe("a job the worker abandoned has an ending", () => {
  test("past the grace, the customer gets a way out and the sums behind it", async ({ page }) => {
    await seed(page, { bookings: [overdue(90)] });
    await page.goto("/app/bookings");

    await expect(page.getByText(/Rahul is 1h 30m overdue/i)).toBeVisible();
    await page.getByRole("button", { name: /never came — end this job/i }).click();

    // 30 min at ₹500/hr = ₹250 + 18% GST = ₹295, of ₹590 collected.
    await expect(page.getByText(/Work done \(30 min\)/i)).toBeVisible();
    await expect(page.getByText("₹295").first()).toBeVisible();
    await expect(page.getByText(/base hour is not kept/i)).toBeVisible();

    // Still not done — ending a job takes a second, deliberate tap.
    expect((await storedBooking(page))?.status).toBe("in_progress");

    await page.getByRole("button", { name: /Yes, end it/i }).click();
    await expect.poll(async () => (await storedBooking(page))?.status).toBe("cancelled");

    const b = await storedBooking(page);
    // Never called "completed" — the work was never finished.
    expect(b?.cancelReason).toMatch(/did not return/i);
    expect(b?.pausedAt).toBeUndefined();
  });

  test("the customer can still change their mind and keep waiting", async ({ page }) => {
    await seed(page, { bookings: [overdue(90)] });
    await page.goto("/app/bookings");

    await page.getByRole("button", { name: /never came — end this job/i }).click();
    await page.getByRole("button", { name: /Keep waiting/i }).click();
    expect((await storedBooking(page))?.status).toBe("in_progress");
  });

  test("no code is ever demanded to report an absence", async ({ page }) => {
    // A code proves presence; it cannot prove that nobody turned up. Asking
    // for one here would make the button unusable by the people who need it.
    await seed(page, { bookings: [overdue(90)] });
    await page.goto("/app/bookings");
    await page.getByRole("button", { name: /never came — end this job/i }).click();

    await expect(page.getByPlaceholder(/code/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Yes, end it/i })).toBeEnabled();
  });
});

test.describe("the worker is warned before they lose the job", () => {
  test("an overdue worker is told plainly what happens next", async ({ page }) => {
    await seed(page, { bookings: [overdue(90)] });
    await page.goto("/worker");

    await expect(page.getByText(/You are 90 min late/i)).toBeVisible();
    await expect(page.getByText(/customer can now end this job/i)).toBeVisible();
    await expect(page.getByText(/only for the minutes you actually worked/i)).toBeVisible();
  });
});

test.describe("the card does not repeat itself, or contradict itself", () => {
  test("an overdue job is not still promising a reminder an hour before", async ({ page }) => {
    await seed(page, { bookings: [overdue(90)] });
    await page.goto("/app/bookings");

    await expect(page.getByText(/reminder 1 hour before/i)).toHaveCount(0);
    await expect(page.getByText(/Paused · resumes/i)).toHaveCount(0);
    // The start code is still reachable — it just lives in one place now.
    await expect(page.getByText("7686").first()).toBeVisible();
  });
});
