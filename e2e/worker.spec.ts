import { expect, test } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

test.describe("the start code proves the worker turned up", () => {
  test("the code is never shown on the worker's own screen", async ({ page }) => {
    const now = new Date().toISOString();
    await seed(page, {
      bookings: [booking({
        status: "accepted",
        payment: { timing: "base_then_settle", paidNow: 590, dueOnAccept: 590,
                   balanceDue: 0, confirmedAt: now },
      })],
    });
    await page.goto("/worker");
    // It used to be printed right on the button: "code 7686".
    await expect(page.getByText("7686")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Paid — Start job/i })).toBeVisible();
  });

  test("a wrong code starts nothing", async ({ page }) => {
    const now = new Date().toISOString();
    await seed(page, {
      bookings: [booking({
        status: "accepted",
        payment: { timing: "base_then_settle", paidNow: 590, dueOnAccept: 590,
                   balanceDue: 0, confirmedAt: now },
      })],
    });
    await page.goto("/worker");
    await page.getByRole("button", { name: /Paid — Start job/i }).click();
    await page.locator('input[inputmode="numeric"]').first().fill("1234");
    await page.getByRole("button", { name: /^Start/ }).click();
    await expect(page.getByText(/doesn't match/i)).toBeVisible();
    expect((await storedBooking(page))?.status).toBe("accepted");
  });

  test("the customer's code starts the job and stamps the time", async ({ page }) => {
    const now = new Date().toISOString();
    await seed(page, {
      bookings: [booking({
        status: "accepted",
        payment: { timing: "base_then_settle", paidNow: 590, dueOnAccept: 590,
                   balanceDue: 0, confirmedAt: now },
      })],
    });
    await page.goto("/worker");
    await page.getByRole("button", { name: /Paid — Start job/i }).click();
    await page.locator('input[inputmode="numeric"]').first().fill("7686");
    await page.getByRole("button", { name: /^Start/ }).click();
    await expect.poll(async () => (await storedBooking(page))?.status).toBe("in_progress");
    expect((await storedBooking(page))?.startedAt).toBeTruthy();
  });

  test("an unpaid job cannot be started at all", async ({ page }) => {
    await seed(page, {
      bookings: [booking({
        status: "accepted",
        payment: { timing: "base_then_settle", paidNow: 0, dueOnAccept: 590, balanceDue: 0 },
      })],
    });
    await page.goto("/worker");
    await expect(page.getByText(/Waiting for customer payment/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Start job/i })).toHaveCount(0);
  });
});

test.describe("cash needs both sides", () => {
  test("the customer's word alone does not settle it", async ({ page }) => {
    const now = new Date().toISOString();
    await seed(page, {
      bookings: [booking({
        status: "completed", rating: 5, paymentMethod: "cash", completedAt: now,
        payment: { timing: "base_then_settle", paidNow: 0, dueOnAccept: 0,
                   balanceDue: 826, confirmedAt: now },
      })],
    });
    await page.goto("/app/bookings");
    await page.getByRole("button", { name: /I paid Rahul/i }).click();
    await page.getByRole("button", { name: /I paid Rahul .* in cash/i }).click();
    await expect.poll(async () => (await storedBooking(page))?.payment.cashClaimedAt).toBeTruthy();
    // A claim, not a settlement.
    expect((await storedBooking(page))?.payment.balancePaidAt).toBeUndefined();

    await page.goto("/worker");
    await expect(page.getByText(/Customer says they paid you/i)).toBeVisible();
    await page.getByRole("button", { name: /Yes, I got it/i }).click();
    await expect.poll(async () => (await storedBooking(page))?.payment.balancePaidAt).toBeTruthy();
  });
});
