import { expect, test } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

/**
 * Every test here corresponds to a defect that actually shipped and had to be
 * reported. They exist so the same mistake can't be made twice quietly.
 */

const PAID = (now: string) => ({
  timing: "base_then_settle", paidNow: 590, dueOnAccept: 590,
  balanceDue: 0, confirmedAt: now,
});

test.describe("no payment happens on a single tap", () => {
  test("accepting a job asks for payment and hides the start code", async ({ page }) => {
    await seed(page, {
      bookings: [booking({
        status: "accepted",
        payment: { timing: "base_then_settle", paidNow: 0, dueOnAccept: 590, balanceDue: 0 },
      })],
    });
    await page.goto("/app/bookings");

    await expect(page.getByText(/accepted your job/i)).toBeVisible();
    // The code is what lets a worker start; it must not be readable yet.
    await expect(page.getByText("7686")).toHaveCount(0);

    await page.getByRole("button", { name: /Pay ₹590 →/ }).click();
    await expect(page.getByText(/Confirm payment/i)).toBeVisible();

    // Still unpaid after the first tap.
    expect((await storedBooking(page))?.payment.confirmedAt).toBeUndefined();

    await page.getByRole("button", { name: /Pay ₹590 with/i }).click();
    await expect(page.getByText(/Payment done/i)).toBeVisible();
    expect((await storedBooking(page))?.payment.confirmedAt).toBeTruthy();
    // Only now — and prominently, because the customer has to read it aloud.
    await expect(page.getByText("7686").first()).toBeVisible();
  });

  test("the final payment takes two taps and carries the tip with it", async ({ page }) => {
    const now = new Date().toISOString();
    await seed(page, {
      bookings: [booking({
        status: "completed", rating: 5, startedAt: now, completedAt: now,
        quote: { serviceAmount: 1792, surgeApplied: false, gst: 323, cess: 0,
                 totalUserPays: 2115, platformFee: 269, tds: 18, workerPayout: 1505 },
        settlement: { actualMinutes: 215, billedMinutes: 215, extraMinutes: 155,
                      extraUserPays: 1525, extraWorkerPayout: 1085 },
        payment: { ...PAID(now), balanceDue: 1525 },
      })],
    });
    await page.goto("/app/bookings");

    // The tip belongs on this screen, not on a card afterwards.
    await page.getByRole("button", { name: /^₹100$/ }).click();
    // Not just offered — folded into the amount being charged, as a line item.
    await expect(page.getByRole("cell", { name: /Tip for Rahul/i })).toBeVisible();

    await page.getByRole("button", { name: /Pay ₹1,625 →/ }).click();
    expect((await storedBooking(page))?.payment.balancePaidAt).toBeUndefined();

    await page.getByRole("button", { name: /Pay ₹1,625 with/i }).click();
    await expect.poll(async () => (await storedBooking(page))?.payment.balancePaidAt).toBeTruthy();
    const b = await storedBooking(page);
    expect(b?.tip).toBe(100);
    expect(b?.tipPaidAt).toBeTruthy();
  });

  test("a simulated payment says so, rather than looking real", async ({ page }) => {
    await seed(page, {
      bookings: [booking({
        status: "accepted",
        payment: { timing: "base_then_settle", paidNow: 0, dueOnAccept: 590, balanceDue: 0 },
      })],
    });
    await page.goto("/app/bookings");
    await page.getByRole("button", { name: /Pay ₹590 →/ }).click();
    await expect(page.getByText(/Demo payment — no real money will move/i)).toBeVisible();
  });
});

test.describe("the customer's money is never taken by surprise", () => {
  test("nothing is charged, priced or coded when a request is placed", async ({ page }) => {
    await seed(page);
    await page.goto("/app/book/w1");
    await expect(page.getByRole("button", { name: /Request .*availability/i })).toBeVisible();
    await expect(page.getByText(/Review Price/i)).toHaveCount(0);
    await expect(page.getByText(/Nothing is charged now/i)).toBeVisible();
  });

  test("an older booking with nothing owed is left alone", async ({ page }) => {
    // This exact case produced a full-screen "Pay ₹0" demand.
    await seed(page, { bookings: [booking({ status: "accepted" })] }); // no payment record
    await page.goto("/app/bookings");
    await expect(page.getByText(/Pay ₹0/)).toHaveCount(0);
    await expect(page.getByText(/accepted your job/i)).toHaveCount(0);
  });

  test("opening the app shows the app, not a payment wall", async ({ page }) => {
    await seed(page, {
      bookings: [booking({
        status: "accepted",
        payment: { timing: "base_then_settle", paidNow: 0, dueOnAccept: 590, balanceDue: 0 },
      })],
    });
    await page.goto("/app");
    // A banner to act on, not the full sheet.
    await expect(page.getByText(/Pay ₹590 to confirm/i)).toBeVisible();
    await expect(page.getByText(/HOW WOULD YOU LIKE TO PAY/i)).toHaveCount(0);
  });
});

test.describe("both sides can check the sum", () => {
  test("the overtime calculation is shown step by step", async ({ page }) => {
    const now = new Date().toISOString();
    await seed(page, {
      bookings: [booking({
        status: "completed", rating: 5, startedAt: now, completedAt: now,
        quote: { serviceAmount: 1792, surgeApplied: false, gst: 323, cess: 0,
                 totalUserPays: 2115, platformFee: 269, tds: 18, workerPayout: 1505 },
        settlement: { actualMinutes: 215, billedMinutes: 215, extraMinutes: 155,
                      extraUserPays: 1525, extraWorkerPayout: 1085 },
        payment: { ...PAID(now), balanceDue: 1525 },
      })],
    });
    await page.goto("/app/bookings");
    await expect(page.getByText(/How the extra time was worked out/i)).toBeVisible();
    await expect(page.getByText(/215 min/).first()).toBeVisible();
    await expect(page.getByText(/÷ 60 = ₹/)).toBeVisible();
    await expect(page.getByText(/Extra you pay/i)).toBeVisible();
  });
});
