import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * New work has to be findable without hunting.
 *
 * A worker who cannot see that jobs arrived has no reason to open the app
 * again, and a customer who cannot see what is happening with their booking
 * phones instead. Both were true: the offers sat under a modest heading
 * halfway down, and an offline worker was shown nothing at all — not even a
 * count of what they were missing.
 */

const offer = booking({ id: "bk9", status: "requested", workerId: "w1" });
const running = booking({
  status: "in_progress",
  startedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
  payment: {
    timing: "base_then_settle",
    paidNow: 590,
    dueOnAccept: 590,
    balanceDue: 0,
    confirmedAt: new Date().toISOString(),
  },
});

test.describe("the worker can see there is work", () => {
  test("a waiting job is announced at the top and counted on the tab", async ({ page }) => {
    await seed(page, { bookings: [offer] });
    await page.goto("/worker");

    await expect(page.getByText("🔔 1 new job for you")).toBeVisible();
    await expect(page.getByRole("button", { name: "🧰 Jobs (1)" })).toBeVisible();

    // Above the fold, not halfway down a scroll.
    const box = await page.getByText("🔔 1 new job for you").boundingBox();
    expect(box?.y ?? 9999).toBeLessThan(700);
  });

  test("nothing is announced when nothing is waiting", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/worker");
    await expect(page.getByText(/new job for you/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "🧰 Jobs" })).toBeVisible();
  });

  test("an offline worker is told what they are missing, and can act on it", async ({ page }) => {
    await seed(page, { bookings: [offer] });
    await page.goto("/worker");
    await page.getByRole("button", { name: /Go offline/i }).click();

    const banner = page.getByRole("button", { name: /1 job is waiting/ });
    await expect(banner).toBeVisible();
    await banner.click();
    // Tapping it goes online, and the job appears.
    await expect(page.getByText("🔔 1 new job for you")).toBeVisible();
  });
});

test.describe("the customer can see what is happening", () => {
  test("a live job leads the home screen with one clear action", async ({ page }) => {
    await seed(page, { bookings: [running] });
    await page.goto("/app");

    await expect(page.getByText("🔧 Work in progress")).toBeVisible();
    const track = page.getByText("Track this job →");
    await expect(track).toBeVisible();
    const box = await track.boundingBox();
    expect(box?.y ?? 9999).toBeLessThan(700);
  });

  test("one screen does not greet you twice with different times of day", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/app");
    const greetings = await page
      .getByText(/Good (morning|afternoon|evening|night)/)
      .allTextContents();
    const distinct = new Set(greetings.map((g) => g.match(/Good \w+/)?.[0]));
    expect(distinct.size).toBeLessThanOrEqual(1);
  });
});
