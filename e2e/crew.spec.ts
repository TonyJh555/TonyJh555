import { expect, test } from "@playwright/test";
import { CUSTOMER } from "./helpers";

/**
 * Booking a crew for a function.
 *
 * Sunita Rao (w8) is a home cook at ₹900 a DAY — deliberately the fixture,
 * because a per-day lead is where mixing units would show up as a wrong price
 * on screen rather than only in a unit test.
 */

async function openBooking(page: import("@playwright/test").Page) {
  await page.goto("/app");
  await page.evaluate((customer) => {
    localStorage.clear();
    localStorage.setItem("kaam.tour.done", "1");
    localStorage.setItem("kaam.customer.v1", JSON.stringify(customer));
    localStorage.setItem("kaam.bookings.v1", "[]");
  }, CUSTOMER);
  await page.goto("/app/book/w8");
}

const toggle = /Is this for a function/i;

test.describe("a function is a crew, not one cook booked six times", () => {
  test("is off until you say it's a function", async ({ page }) => {
    await openBooking(page);
    await expect(page.getByText("It's a function — book a crew")).toHaveCount(0);
    // The ordinary booking still quotes the one person you opened.
    await expect(page.getByText(/Rate ₹900\/day/)).toBeVisible();
  });

  test("suggests a crew for the guest count and prices it per person", async ({ page }) => {
    await openBooking(page);
    await page.getByRole("button", { name: toggle }).click();

    // 100 guests → 2 cooks, 4 serving. Sunita is one of the two cooks.
    await expect(page.getByText("👥 6 people · 2 cooks · 4 serving & setup staff")).toBeVisible();
    await expect(page.getByText(/incl\. Sunita/)).toBeVisible();
    await expect(page.getByText(/per person, tax included/)).toBeVisible();
  });

  test("the price on the button is the crew's, not the one worker's", async ({ page }) => {
    await openBooking(page);
    await page.getByRole("button", { name: toggle }).click();
    // The bug this guards: ₹900/day printed under a ₹5,800 crew booking.
    await expect(page.getByText(/A crew of 6 — ₹/)).toBeVisible();
    await expect(page.getByText(/Rate ₹900\/day/)).toHaveCount(0);
  });

  test("a per-day lead is never priced against a per-hour list", async ({ page }) => {
    await openBooking(page);
    await page.getByRole("button", { name: toggle }).click();
    // Six people around a ₹900/day cook is thousands, not tens of thousands.
    // Reading the trades' hourly list prices here gave ₹40,000+ for a day.
    const daily = page.getByRole("button", { name: /Daily/ });
    await expect(daily).toContainText("₹4,952");
  });

  test("more people costs more, and the total follows immediately", async ({ page }) => {
    await openBooking(page);
    await page.getByRole("button", { name: toggle }).click();
    await page.getByRole("button", { name: "more Cooks" }).click();
    await expect(page.getByText(/👥 7 people · 3 cooks/)).toBeVisible();
    await expect(page.getByText(/A crew of 7 — ₹/)).toBeVisible();
  });

  test("one person is not a crew, and cannot be booked as one", async ({ page }) => {
    await openBooking(page);
    await page.getByRole("button", { name: toggle }).click();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "fewer Serving & setup staff" }).click();
    await page.getByRole("button", { name: "fewer Cooks" }).click();

    await expect(page.getByText(/A crew needs at least 2 people/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Set the crew to continue/ })).toBeDisabled();
  });

  test("a wedding-sized job is handed to the event companies", async ({ page }) => {
    await openBooking(page);
    await page.getByRole("button", { name: toggle }).click();
    for (let i = 0; i < 15; i++) await page.getByRole("button", { name: "more Cooks" }).click();

    await expect(page.getByText(/is an event, not a crew/)).toBeVisible();
    const handoff = page.getByRole("link", { name: /ask event companies for a price/i });
    await expect(handoff).toBeVisible();
    await expect(page.getByRole("button", { name: /Set the crew to continue/ })).toBeDisabled();
    await handoff.click();
    await expect(page).toHaveURL(/\/events/);
  });

  test("the booking records the crew, and the lead sees the split", async ({ page }) => {
    await openBooking(page);
    await page.getByRole("button", { name: toggle }).click();
    await page.getByRole("button", { name: /Request Sunita's availability/ }).click();

    // Stored as a crew job, not as a single booking with a bigger price.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const list = JSON.parse(localStorage.getItem("kaam.bookings.v1") || "[]");
          return list[0]?.crew ?? null;
        }),
      )
      .toMatchObject({ heads: 6, guests: 100 });

    // Sunita's own screen: what the crew costs her to pay, before she accepts.
    await page.goto("/worker");
    await page.getByRole("button", { name: /View as:/ }).click();
    await page.getByPlaceholder("Name, trade or city").fill("sunita");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Crew job · 6 people · 100 guests/)).toBeVisible();
    await expect(page.getByText(/You're the lead — you bring 5 more people/)).toBeVisible();
    await expect(page.getByText(/lead allowance/)).toBeVisible();
    await expect(page.getByText(/Paying your crew is on you/)).toBeVisible();
  });
});
