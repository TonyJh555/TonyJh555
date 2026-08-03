import { expect, test, type Page } from "@playwright/test";
import { booking, seed, storedBooking } from "./helpers";

/**
 * "He said three o'clock and came at seven."
 *
 * The rule under test is not "late is punished". It is that a worker who says
 * they're running late, before the time they promised, is covered whatever
 * happens next — and one who says nothing is not.
 */

/** An ISO stamp `minutes` from now. */
const iso = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** A scheduled slot `minutes` from now, in the form the app stores. */
function slot(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    when: "scheduled" as const,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** An accepted, paid job whose promised time was `lateBy` minutes ago. */
const overdue = (lateBy: number, over: Record<string, unknown> = {}) =>
  booking({
    id: "bk-waiting",
    status: "accepted",
    categoryId: "elec",
    subService: "Fan Repair",
    address: "Kakkanad, Kochi",
    schedule: slot(-lateBy),
    payment: {
      timing: "base_then_settle",
      paidNow: 590,
      dueOnAccept: 590,
      balanceDue: 0,
      confirmedAt: iso(-lateBy - 60),
    },
    ...over,
  });

async function wallet(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("kaam.wallet.v1") ?? "null") as { balance: number } | null,
  );
}

test("twenty minutes of Kerala traffic is not a service failure", async ({ page }) => {
  await seed(page, { bookings: [overdue(10)] });
  await page.goto("/app/bookings");
  await expect(page.getByText(/is \d+m late/)).toHaveCount(0);
});

test("past the grace the customer is told, and told they aren't paying for it", async ({ page }) => {
  await seed(page, { bookings: [overdue(30)] });
  await page.goto("/app/bookings");
  await expect(page.getByText(/is 30m late/)).toBeVisible();
  await expect(page.getByText(/not paying for this wait/)).toBeVisible();
  // Not yet the way out — that would end good jobs over traffic.
  await expect(page.getByRole("button", { name: /cancel and get everything back/i })).toHaveCount(0);
});

test("after an hour there is a way out, and it costs the customer nothing", async ({ page }) => {
  await seed(page, { bookings: [overdue(75)] });
  await page.goto("/app/bookings");

  const out = page.getByRole("button", { name: /cancel and get everything back/i });
  await out.scrollIntoViewIfNeeded();
  await out.click();

  await expect(page.getByText("Cancelled — everything refunded")).toBeVisible();

  const b = await storedBooking(page, "bk-waiting");
  expect(b.status).toBe("cancelled");
  expect(b.cancelReason).toContain("did not arrive");
  // A worker who never travelled is owed nothing — and is fined nothing.
  expect(b.calloutPay).toBe(0);

  // ₹590 back plus KAAM's own ₹100 apology.
  const w = await wallet(page);
  expect(w?.balance).toBe(690);
});

test("what the worker told them is shown, so a warning doesn't look like silence", async ({ page }) => {
  await seed(page, {
    bookings: [overdue(40, { arrivalNotice: { reason: "weather", minutes: 30, at: iso(-50) } })],
  });
  await page.goto("/app/bookings");
  await expect(page.getByText(/Rain \/ flooded road/)).toBeVisible();
  await expect(page.getByText(/about 30 more minutes/)).toBeVisible();
  await expect(page.getByText(/hasn't sent word yet/)).toHaveCount(0);
});

test("a worker with nothing said is described honestly", async ({ page }) => {
  await seed(page, { bookings: [overdue(40)] });
  await page.goto("/app/bookings");
  await expect(page.getByText(/hasn't sent word yet/)).toBeVisible();
});

test("the worker is warned before they are late, not after", async ({ page }) => {
  // Due in 20 minutes — the prompt is already there, while it can still help.
  await seed(page, { bookings: [overdue(-20)] });
  await page.goto("/worker");
  await expect(page.getByText(/Due there in \d+ min/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Tell them I'm running late/ })).toBeVisible();
});

test("sending word in time covers the worker, whatever the reason", async ({ page }) => {
  await seed(page, { bookings: [overdue(-15)] });
  await page.goto("/worker");

  await page.getByRole("button", { name: /Tell them I'm running late/ }).click();
  await page.getByRole("button", { name: "Rain / flooded road" }).click();
  await page.getByRole("button", { name: "45", exact: true }).click();
  await page.getByRole("button", { name: "Tell the customer" }).click();

  await expect(page.getByText("The customer has been told")).toBeVisible();
  await expect(page.getByText(/won't count against your record/)).toBeVisible();

  const b = await storedBooking(page, "bk-waiting");
  expect(b.arrivalNotice.reason).toBe("weather");
  expect(b.arrivalNotice.minutes).toBe(45);
});

test("'I'm here, nobody's home' is not a late arrival", async ({ page }) => {
  await seed(page, { bookings: [overdue(-10)] });
  await page.goto("/worker");
  await page.getByRole("button", { name: /Tell them I'm running late/ }).click();
  await page.getByRole("button", { name: /nobody's home/ }).click();
  await page.getByRole("button", { name: "Tell the customer" }).click();

  const b = await storedBooking(page, "bk-waiting");
  expect(b.arrivalNotice.reason).toBe("customer_absent");
  // No minutes are asked for — they have arrived.
  expect(b.arrivalNotice.minutes ?? null).toBeNull();
});

test("a worker sees their own punctuality record before anyone acts on it", async ({ page }) => {
  await seed(page, {
    bookings: [
      booking({
        id: "bk-old",
        status: "completed",
        categoryId: "elec",
        schedule: slot(-180),
        startedAt: iso(-100),
        rating: 5,
        payment: { timing: "base_then_settle", paidNow: 590, balanceDue: 0, confirmedAt: iso(-240) },
      }),
    ],
  });
  await page.goto("/worker");
  await expect(page.getByText(/late arrival.* with no warning sent/)).toBeVisible();
  await expect(page.getByText(/Being late isn't the problem/)).toBeVisible();
});

test("a clean record is said out loud too", async ({ page }) => {
  await seed(page, { bookings: [] });
  await page.goto("/worker");
  await expect(page.getByText("Punctuality: clean")).toBeVisible();
});

test("the apology cannot be farmed", async ({ page }) => {
  // The hole: ₹100 of free money behind a button the customer alone controls.
  // A second no-show in the same month still cancels free, but does not pay.
  const alreadyApologised = booking({
    id: "bk-earlier",
    status: "cancelled",
    cancelReason: "Worker did not arrive within an hour of the promised time — cancelled with KAAM's apology",
    completedAt: iso(-60 * 24 * 3),
    createdAt: iso(-60 * 24 * 3),
  });
  await seed(page, { bookings: [overdue(75), alreadyApologised] });
  await page.goto("/app/bookings");

  const out = page.getByRole("button", { name: /cancel and get everything back/i });
  await out.scrollIntoViewIfNeeded();
  await expect(page.getByText(/Full refund \+ ₹100/)).toHaveCount(0);
  await out.click();

  await expect(page.getByText("Every rupee you paid has been returned")).toBeVisible();
  // ₹590 back, and not a rupee of goodwill on top.
  const w = await wallet(page);
  expect(w?.balance).toBe(590);
});

test("a worker who warned in time costs KAAM nothing", async ({ page }) => {
  await seed(page, {
    bookings: [overdue(75, { arrivalNotice: { reason: "weather", minutes: 30, at: iso(-80) } })],
  });
  await page.goto("/app/bookings");
  const out = page.getByRole("button", { name: /cancel and get everything back/i });
  await out.scrollIntoViewIfNeeded();
  await out.click();

  const w = await wallet(page);
  expect(w?.balance).toBe(590); // refund only — nobody was left guessing
});
