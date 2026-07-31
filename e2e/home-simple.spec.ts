import { expect, test } from "@playwright/test";
import { seed } from "./helpers";

/**
 * The home screen shows what the customer came for.
 *
 * It was 10,700 pixels tall with eleven promotional blocks — stories, a
 * seasonal offer, fair-pricing, KAAM Plus, refer-a-friend, care plans — sitting
 * between the search box and the services. Someone opening KAAM for the first
 * time scrolled through three screens of marketing before finding out what the
 * app is for.
 */

test.describe("services before selling", () => {
  test("the eight everyday trades are on screen, not forty", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/app");

    for (const trade of ["Electrician", "Plumber", "Cleaner", "Home Nurse"]) {
      await expect(page.getByRole("link", { name: new RegExp(trade) }).first()).toBeVisible();
    }
    // The full catalogue is one tap away, and says how much there is.
    await expect(page.getByRole("button", { name: /See all \d+ services/ })).toBeVisible();
    // A trade that is not in the popular eight is not on screen yet.
    await expect(page.getByRole("link", { name: /Mehendi/ })).toHaveCount(0);
  });

  test("the whole catalogue opens on one tap", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/app");
    await page.getByRole("button", { name: /See all \d+ services/ }).click();
    await expect(page.getByRole("link", { name: /Mehendi/ }).first()).toBeVisible();
    await expect(page.getByText("Art & Music")).toBeVisible();
  });

  test("the sell is folded away, and nothing was thrown out", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/app");

    await expect(page.getByText(/KAAM Plus — 10% off/)).toHaveCount(0);
    await expect(page.getByText(/Care Plans — subscribe/)).toHaveCount(0);
    await expect(page.getByText(/Refer friends/)).toHaveCount(0);

    await page.getByRole("button", { name: /Offers, plans & more/ }).click();
    await expect(page.getByText(/KAAM Plus — 10% off/)).toBeVisible();
    await expect(page.getByText(/Care Plans — subscribe/)).toBeVisible();
    await expect(page.getByText(/Refer friends/)).toBeVisible();
  });

  test("services sit above the sell, not below it", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/app");
    const services = await page.getByRole("link", { name: /Electrician/ }).first().boundingBox();
    const offers = await page.getByRole("button", { name: /Offers, plans & more/ }).boundingBox();
    expect(services?.y ?? 9999).toBeLessThan(offers?.y ?? 0);
  });
});
