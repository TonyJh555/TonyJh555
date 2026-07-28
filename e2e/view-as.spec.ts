import { expect, test } from "@playwright/test";

/**
 * The demo "view as" picker. It used to be a native <select> holding every
 * worker on the platform — a full-screen list you thumbed through to reach a
 * nurse in Kannur. These check that typing gets you there instead.
 */

const box = "Name, trade or city";

test.describe("finding a worker by typing", () => {
  test("a name narrows the list and switches who you are viewing", async ({ page }) => {
    await page.goto("/worker");
    await expect(page.getByRole("button", { name: /View as: Rahul Sharma/ })).toBeVisible();

    await page.getByRole("button", { name: /View as:/ }).click();
    await page.getByPlaceholder(box).fill("aswathy");

    const first = page.getByRole("button", { name: /^Aswathy/ }).first();
    await expect(first).toBeVisible();
    await first.click();

    await expect(page.getByRole("button", { name: /View as: Aswathy/ })).toBeVisible();
    // The whole dashboard follows, not just the label: the queue below is now
    // her trade's, not the electrician's we started on.
    await expect(page.getByRole("heading", { name: /Home Nurse jobs near you/ })).toBeVisible();
  });

  test("every word has to land, so a trade and a place narrow together", async ({ page }) => {
    await page.goto("/worker");
    await page.getByRole("button", { name: /View as:/ }).click();
    await page.getByPlaceholder(box).fill("nurse kannur");

    // Every result row carries the trade and the town it matched on.
    const rows = page.getByRole("button", { name: /· 📍 / });
    await expect(rows.first()).toBeVisible();
    const shown = await rows.allTextContents();
    // Nobody from another trade or another district survives both words.
    for (const row of shown) {
      expect(row, row).toContain("Home Nurse");
      expect(row, row).toContain("Kannur");
    }
  });

  test("Enter takes the top result, so nothing has to be aimed at", async ({ page }) => {
    await page.goto("/worker");
    await page.getByRole("button", { name: /View as:/ }).click();
    await page.getByPlaceholder(box).fill("nurse");
    await page.keyboard.press("Enter");

    await expect(page.getByRole("button", { name: /View as:/ })).toBeVisible();
    await expect(page.getByPlaceholder(box)).toHaveCount(0);
  });

  test("a name nobody has says so rather than showing everyone", async ({ page }) => {
    await page.goto("/worker");
    await page.getByRole("button", { name: /View as:/ }).click();
    await page.getByPlaceholder(box).fill("zzzz");
    await expect(page.getByText(/Nobody matches/)).toBeVisible();
  });

  test("the profile link opens what a customer would see", async ({ page }) => {
    await page.goto("/worker");
    await page.getByRole("button", { name: /View as:/ }).click();
    await page.getByPlaceholder(box).fill("aswathy");
    await page.getByRole("link", { name: /profile/ }).first().click();
    await expect(page).toHaveURL(/\/app\/worker\//);
  });
});
