import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * Nothing a customer or a worker has to read is smaller than 12px.
 *
 * KAAM is for a 65-year-old booking a nurse and a plumber who left school at
 * fourteen. It had 600 pieces of text at 10 and 11 pixels against 418 at a
 * readable size — over half the words in the app were below what that
 * customer can read without moving the phone closer.
 *
 * This is the guard rather than the fix: the scale lives in globals.css, and
 * this stops the next 10px caption from quietly arriving with the next
 * feature. If something truly cannot fit at 12px, change the something.
 */

const FLOOR = 13;

/** Every visible piece of text on the page that renders below the floor. */
async function tooSmall(page: import("@playwright/test").Page) {
  return page.evaluate((floor) => {
    const bad: { text: string; size: number }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      // Only elements holding their own words, and only if actually on screen.
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent?.trim() ?? "")
        .join(" ")
        .trim();
      if (!own) continue;
      if (!el.getClientRects().length) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < floor) bad.push({ text: own.slice(0, 40), size });
    }
    return bad;
  }, FLOOR);
}

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

const SCREENS = [
  { name: "home", url: "/app" },
  { name: "search", url: "/app/search" },
  { name: "booking flow", url: "/app/book/w8" },
  { name: "my bookings", url: "/app/bookings" },
  { name: "help", url: "/app/help" },
  { name: "worker dashboard", url: "/worker" },
];

for (const screen of SCREENS) {
  test(`${screen.name} is readable at arm's length`, async ({ page }) => {
    await seed(page, { bookings: [running] });
    await page.goto(screen.url);
    await page.waitForTimeout(300);
    const bad = await tooSmall(page);
    expect(bad, `below ${FLOOR}px: ${JSON.stringify(bad.slice(0, 8))}`).toEqual([]);
  });
}
