import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * A worker who reads little English can still work.
 *
 * The customer app was bilingual throughout; the worker dashboard — built for
 * the people most likely to need Malayalam — was English from top to bottom
 * apart from a handful of hand-placed subtitles. Navigation was translated
 * first; this covers what a worker reads while doing the job.
 */

const offer = booking({ id: "bk9", status: "requested", workerId: "w1" });
const paid = booking({
  status: "accepted",
  payment: {
    timing: "base_then_settle",
    paidNow: 590,
    dueOnAccept: 590,
    balanceDue: 0,
    confirmedAt: new Date().toISOString(),
  },
});

async function malayalamWorker(page: import("@playwright/test").Page, bookings: unknown[]) {
  await seed(page, { bookings });
  await page.evaluate(() => localStorage.setItem("kaam.lang", "ml"));
  await page.goto("/worker");
}

test.describe("the worker's own screen, in Malayalam", () => {
  test("the day's numbers are labelled in Malayalam", async ({ page }) => {
    await malayalamWorker(page, []);
    await expect(page.getByText("ഇന്ന്", { exact: true })).toBeVisible();
    await expect(page.getByText("കിട്ടിയത്")).toBeVisible();
    await expect(page.getByText("ഓൺലൈൻ സമയം")).toBeVisible();
    // The English labels are gone, not merely joined.
    await expect(page.getByText("Time online")).toHaveCount(0);
  });

  test("an offer explains itself in Malayalam", async ({ page }) => {
    await malayalamWorker(page, [offer]);
    await expect(page.getByText(/നിങ്ങൾക്കായി അയച്ചത്/)).toBeVisible();
    await expect(page.getByText(/ഉപഭോക്താവ് ചോദിച്ച സമയം/)).toBeVisible();
    await expect(page.getByText(/Dispatched to you/)).toHaveCount(0);
  });

  test("the money strip — the one that decides whether they set off", async ({ page }) => {
    await malayalamWorker(page, [paid]);
    await expect(page.getByText(/പണം ലഭിച്ചു — തുടങ്ങാം/)).toBeVisible();
  });

  test("an empty queue says so in Malayalam", async ({ page }) => {
    await malayalamWorker(page, []);
    await expect(page.getByText(/ഇപ്പോൾ ജോലികളൊന്നുമില്ല/)).toBeVisible();
    await expect(page.getByText(/No electrician requests right now/)).toHaveCount(0);
  });

  test("English is untouched for a worker who wants it", async ({ page }) => {
    await seed(page, { bookings: [offer] });
    await page.goto("/worker");
    await expect(page.getByText(/Dispatched to you/)).toBeVisible();
    await expect(page.getByText("Time online")).toBeVisible();
  });
});

test.describe("the worker card says less, and means more", () => {
  test("invented tiers no longer crowd out the facts", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/app");

    // A worker with real earned badges shows those, not a tier name a
    // first-time customer has no way to rank.
    await expect(page.getByText(/ID verified/).first()).toBeVisible();
    for (const tier of ["Diamond Pro", "Platinum Pro", "Gold Pro"]) {
      await expect(page.getByText(tier), tier).toHaveCount(0);
    }
  });
});
