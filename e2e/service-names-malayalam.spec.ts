import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * The service name, in the language being read.
 *
 * Unit tests prove the Malayalam names exist. These prove the screens use
 * them — which is the half that was actually broken: the worker queue already
 * had a Malayalam heading and interpolated the English trade into it, so a
 * worker who had chosen Malayalam read "Electrician ജോലികൾ".
 */

async function inMalayalam(page: import("@playwright/test").Page, path: string) {
  // Set the preference rather than hunting for the toggle: it lives on the
  // customer home, and three of these screens are not it.
  await page.evaluate(() => localStorage.setItem("kaam.lang", "ml"));
  await page.goto(path);
}

test("the home sector grid is in Malayalam", async ({ page }) => {
  await seed(page, { bookings: [] });
  await inMalayalam(page, "/app");

  await page.getByRole("button", { name: /എല്ലാ .* സേവനങ്ങളും കാണൂ/ }).click();

  await expect(page.getByText("പരിചരണവും ആരോഗ്യവും")).toBeVisible();
  await expect(page.getByText("ആശുപത്രി കൂട്ടിരിപ്പ്").first()).toBeVisible();
  await expect(page.getByText("സാധനം വാങ്ങിത്തരാം").first()).toBeVisible();
});

test("search names the trades in Malayalam", async ({ page }) => {
  await seed(page, { bookings: [] });
  await inMalayalam(page, "/app/search");

  await expect(page.getByText("ഇലക്ട്രീഷ്യൻ").first()).toBeVisible();
});

test("a worker who chose Malayalam sees their own trade in Malayalam", async ({ page }) => {
  // The one that was actually wrong: a Malayalam heading with an English
  // trade dropped into the middle of it.
  await seed(page, { bookings: [] });
  await inMalayalam(page, "/worker");

  await expect(page.getByRole("heading", { name: /ഇലക്ട്രീഷ്യൻ ജോലികൾ/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Electrician ജോലികൾ/ })).toHaveCount(0);
});

test("the booking screen names the service in Malayalam", async ({ page }) => {
  await seed(page, { bookings: [booking({ status: "accepted" })] });
  await inMalayalam(page, "/app/worker/w1");

  await expect(page.getByText(/ഇലക്ട്രീഷ്യൻ/).first()).toBeVisible();
});

test("English is untouched for whoever wants it", async ({ page }) => {
  await seed(page, { bookings: [] });
  await page.goto("/app/search");

  await expect(page.getByText("Electrician").first()).toBeVisible();
});
