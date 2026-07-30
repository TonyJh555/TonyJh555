import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * The worker's screen shows the work, and then everything else.
 *
 * A worker with a job running had to scroll past eleven blocks — a guide, a
 * motivational quote, an away-mode date picker, three stat tiles, five "ways
 * to earn more" cards — before reaching the job a customer was waiting on.
 */

const running = (over: Record<string, unknown> = {}) =>
  booking({
    status: "in_progress",
    startedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    payment: {
      timing: "base_then_settle",
      paidNow: 590,
      dueOnAccept: 590,
      balanceDue: 0,
      confirmedAt: new Date().toISOString(),
    },
    ...over,
  });

async function topOf(page: import("@playwright/test").Page, name: RegExp | string) {
  const box = await page.getByText(name).first().boundingBox();
  return box?.y ?? Number.MAX_SAFE_INTEGER;
}

test.describe("the work comes first", () => {
  test("a live job sits above the tips, not below them", async ({ page }) => {
    await seed(page, { bookings: [running()] });
    await page.goto("/worker");

    const job = await topOf(page, /Active Jobs/);
    const help = await topOf(page, /Help, settings & tips/);
    expect(job).toBeLessThan(help);
  });

  test("the guide, the quote and the tips are one tap away, not in the way", async ({ page }) => {
    await seed(page, { bookings: [running()] });
    await page.goto("/worker");

    // None of it is on screen…
    await expect(page.getByText(/Ways to earn more/i)).toHaveCount(0);
    await expect(page.getByText(/How KAAM works/i)).toHaveCount(0);
    await expect(page.getByText(/Away mode/i)).toHaveCount(0);

    // …and none of it was deleted.
    await page.getByRole("button", { name: /Help, settings & tips/i }).click();
    await expect(page.getByText(/Ways to earn more/i)).toBeVisible();
    await expect(page.getByText(/How KAAM works/i)).toBeVisible();
    await expect(page.getByText(/Away mode/i)).toBeVisible();
  });

  test("an idle worker sees the queue, not a wall", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/worker");
    await expect(page.getByText(/jobs near you/i)).toBeVisible();
    await expect(page.getByText(/Ways to earn more/i)).toHaveCount(0);
  });

  test("today's earnings are actually readable", async ({ page }) => {
    // They were white text on a white card — invisible on every worker's phone.
    await seed(page, { bookings: [] });
    await page.goto("/worker");
    await expect(page.getByText("Earned")).toBeVisible();
    await expect(page.getByText("Time online")).toBeVisible();

    // "Visible" is not the test — white-on-white passes that. The card asks
    // for a dark background and white text; check it actually got one.
    const colours = await page.getByText("Earned").evaluate((el) => {
      const card = el.closest("div.shadow-card") as HTMLElement;
      const s = getComputedStyle(card);
      return { bg: s.backgroundColor, text: getComputedStyle(el).color };
    });
    expect(colours.bg).not.toBe("rgb(255, 255, 255)");
    expect(colours.bg).not.toBe(colours.text);
  });

  test("a worker who reads Malayalam can navigate the tabs", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.evaluate(() => localStorage.setItem("kaam.lang", "ml"));
    await page.goto("/worker");
    await expect(page.getByRole("button", { name: "🧰 ജോലി" })).toBeVisible();
    await expect(page.getByRole("button", { name: "💰 വരുമാനം" })).toBeVisible();
    await expect(page.getByRole("button", { name: /സഹായം/ })).toBeVisible();
  });
});
