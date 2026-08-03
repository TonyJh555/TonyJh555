import { expect, test, type Page } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * A job booked for a date is not a job in progress.
 *
 * A catering booking for a wedding six days out was confirmed with "Renjith is
 * on the way!" — which reads as the app not having understood what it just
 * stored. Everything downstream of "confirmed" has to ask *when*.
 */

/** A date `days` from now, in the form the app stores. */
function slotInDays(days: number, time = "09:00") {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    when: "scheduled" as const,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time,
  };
}

const catering = (over: Record<string, unknown> = {}) =>
  booking({
    id: "bk-event",
    categoryId: "catering",
    subService: "Party Catering",
    address: "Kakkanad, Kochi",
    status: "accepted",
    schedule: slotInDays(6),
    payment: {
      timing: "advance_then_balance",
      paidNow: 2076,
      dueOnAccept: 2307,
      balanceDue: 231,
      confirmedAt: new Date().toISOString(),
    },
    ...over,
  });

async function pageText(page: Page) {
  return (await page.textContent("body")) ?? "";
}

test("a job six days out is never described as on the way", async ({ page }) => {
  await seed(page, { bookings: [catering()] });
  await page.goto("/app/bookings");
  await expect(page.getByText("Worker confirmed")).toBeVisible();
  expect(await pageText(page)).not.toContain("on the way");
});

test("it says the date instead", async ({ page }) => {
  await seed(page, { bookings: [catering()] });
  await page.goto("/app/bookings");
  await expect(page.getByText(/booked for/).first()).toBeVisible();
});

test("an ASAP job still says on the way — the fix must not flatten both", async ({ page }) => {
  await seed(page, {
    bookings: [catering({ id: "bk-now", schedule: { when: "asap" }, categoryId: "elec" })],
  });
  await page.goto("/app/bookings");
  expect(await pageText(page)).toContain("on the way");
});

test("the worker is offered the calendar for a dated job", async ({ page }) => {
  await seed(page, { bookings: [catering({ workerId: "w1" })] });
  await page.goto("/worker");

  await expect(page.getByText("This job is for a date, not for now")).toBeVisible();
  const cal = page.getByRole("link", { name: /Add to my calendar/ });
  await expect(cal).toBeVisible();

  // The link has to be a real event at the right moment, not a dead button.
  const href = await cal.getAttribute("href");
  expect(href).toContain("calendar.google.com");
  expect(href).toContain("KAAM+job");
  expect(href).toContain("bk-event");
});

test("the worker is not nagged about a calendar for an ASAP job", async ({ page }) => {
  await seed(page, {
    bookings: [catering({ workerId: "w1", schedule: { when: "asap" }, categoryId: "elec" })],
  });
  await page.goto("/worker");
  await expect(page.getByText("This job is for a date, not for now")).toHaveCount(0);
});

test("the worker is never told to set off six days early", async ({ page }) => {
  // Three separate places said "start now" / "set off now" on the same screen
  // for a job a week away. A green box that is wrong is a green box workers
  // learn to ignore, including the ones that matter.
  await seed(page, { bookings: [catering({ workerId: "w1" })] });
  await page.goto("/worker");
  const text = await pageText(page);
  expect(text).not.toContain("Set off to");
  expect(text).not.toContain("start now");
  expect(text).not.toContain("good to go");
  await expect(page.getByText("Payment done — your slot is locked in")).toBeVisible();
});

test("an ASAP worker is still told to go", async ({ page }) => {
  await seed(page, {
    bookings: [catering({ workerId: "w1", schedule: { when: "asap" }, categoryId: "elec" })],
  });
  await page.goto("/worker");
  await expect(page.getByText("Payment done — start now")).toBeVisible();
});
