import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * If the same fault comes back, someone comes back — free.
 *
 * The promise a customer actually tells a friend about. It only works if it is
 * offered where they look when it recurs (the finished job), costs them
 * nothing, and still pays the worker.
 */

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60_000).toISOString();

const finished = (over: Record<string, unknown> = {}) =>
  booking({
    id: "bk-done",
    status: "completed",
    workerId: "w1",
    categoryId: "elec",
    subService: "Fan Repair",
    createdAt: hoursAgo(30),
    completedAt: hoursAgo(28),
    // A completed job demands a rating before anything else on the screen is
    // reachable — that is deliberate, so the fixture has to have rated it.
    rating: 5,
    report: { did: ["replaced"], left: "nothing", part: "Capacitor", photos: [], at: hoursAgo(28) },
    ...over,
  });

/**
 * The offer sits well down a long booking card. Scrolling to it first keeps
 * Playwright's auto-scroll from racing the card's fade-in, which reads as an
 * unstable element rather than the real (stable) button it is.
 */
async function tapRevisit(page: import("@playwright/test").Page) {
  const btn = page.getByRole("button", { name: /Same problem came back/ });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
}

async function stored(page: import("@playwright/test").Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("kaam.bookings.v1") ?? "[]"));
}

test("a finished repair offers a free revisit, with the days left", async ({ page }) => {
  await seed(page, { bookings: [finished()] });
  await page.goto("/app/bookings");
  await expect(page.getByText("Same problem came back?")).toBeVisible();
  await expect(page.getByText(/day.* of cover left/)).toBeVisible();
});

test("one tap books it, free, to the same worker", async ({ page }) => {
  await seed(page, { bookings: [finished()] });
  await page.goto("/app/bookings");
  await tapRevisit(page);
  await page.getByPlaceholder(/same noise again/).fill("Fan noisy again");
  await page.getByRole("button", { name: "Book the free revisit" }).click();

  await expect(page.getByText("Free revisit booked")).toBeVisible();

  const all = await stored(page);
  const revisit = all.find((b: { revisitOf?: string }) => b.revisitOf === "bk-done");
  expect(revisit).toBeTruthy();
  // Costs the customer nothing…
  expect(revisit.quote.totalUserPays).toBe(0);
  // …and still pays the worker.
  expect(revisit.quote.workerPayout).toBeGreaterThan(0);
  // …and goes to the person who did it.
  expect(revisit.workerId).toBe("w1");
  expect(revisit.status).toBe("requested");
});

test("the cover is used once", async ({ page }) => {
  await seed(page, { bookings: [finished()] });
  await page.goto("/app/bookings");
  await tapRevisit(page);
  await page.getByRole("button", { name: "Book the free revisit" }).click();
  await expect(page.getByText("Free revisit booked")).toBeVisible();

  // Reload: the original no longer offers it.
  await page.reload();
  await expect(page.getByText("Same problem came back?")).toHaveCount(0);
});

test("an old job is out of cover", async ({ page }) => {
  await seed(page, { bookings: [finished({ completedAt: hoursAgo(24 * 20), createdAt: hoursAgo(24 * 20) })] });
  await page.goto("/app/bookings");
  await expect(page.getByText("Same problem came back?")).toHaveCount(0);
});

test("a violinist's finished gig is never offered a repair warranty", async ({ page }) => {
  await seed(page, {
    bookings: [finished({ id: "bk-gig", categoryId: "violin", subService: "Wedding / Event", report: undefined })],
  });
  await page.goto("/app/bookings");
  await expect(page.getByText("Same problem came back?")).toHaveCount(0);
});

test("the revisit carries last visit's handover to whoever attends", async ({ page }) => {
  await seed(page, {
    bookings: [finished({ report: { did: ["diagnosed"], left: "needs_part", part: "Capacitor", photos: [], at: hoursAgo(28) } })],
  });
  await page.goto("/app/bookings");
  await tapRevisit(page);
  await page.getByRole("button", { name: "Book the free revisit" }).click();
  await expect(page.getByText("Free revisit booked")).toBeVisible();

  const msgs = await page.evaluate(() => JSON.parse(localStorage.getItem("kaam.chat.v1") ?? "[]"));
  const brief = msgs.find((m: { text: string }) => m.text.includes("Last visit"));
  expect(brief.text).toContain("Checked & diagnosed");
  expect(brief.text).toContain("Capacitor");
});
