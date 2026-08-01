import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * The two tabs a worker opens when they are not working.
 *
 * The Jobs tab was translated first, because that is where the work is. But
 * Earnings is where a worker checks whether they were paid what they expected,
 * and Status is where they find out why their KYC hasn't cleared — the two
 * screens most likely to be read slowly, by the person least likely to read
 * English. Both were English top to bottom.
 *
 * The negative assertions matter as much as the positive ones: a screen that
 * shows the Malayalam *and* the English it replaced is not translated, it is
 * twice as long.
 */

const done = booking({
  status: "completed",
  payment: {
    timing: "base_then_settle",
    paidNow: 590,
    dueOnAccept: 590,
    balanceDue: 0,
    confirmedAt: new Date().toISOString(),
  },
});

async function openTab(page: import("@playwright/test").Page, tab: RegExp, bookings: unknown[] = []) {
  await seed(page, { bookings });
  await page.evaluate(() => localStorage.setItem("kaam.lang", "ml"));
  await page.goto("/worker");
  await page.getByRole("button", { name: tab }).click();
}

test.describe("Earnings, in Malayalam", () => {
  test("the four numbers at the top are labelled", async ({ page }) => {
    await openTab(page, /വരുമാനം/, [done]);
    await expect(page.getByText("ഈ ആഴ്ച", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("ഈ മാസം", { exact: true })).toBeVisible();
    await expect(page.getByText("ഈ വർഷം", { exact: true })).toBeVisible();
    await expect(page.getByText("This week", { exact: true })).toHaveCount(0);
    await expect(page.getByText("This year", { exact: true })).toHaveCount(0);
  });

  test("the weekly goal ring reads in Malayalam", async ({ page }) => {
    await openTab(page, /വരുമാനം/);
    await expect(page.getByText("ഈ ആഴ്ചത്തെ ലക്ഷ്യം")).toBeVisible();
    await expect(page.getByText("ലക്ഷ്യത്തിൽ")).toBeVisible();
    await expect(page.getByText("Weekly goal")).toHaveCount(0);
  });

  test("the chart axis is not the only English left on the screen", async ({ page }) => {
    // A Malayalam page with "Mon Tue Wed" down its side is the exact failure
    // this guards: the worker cannot tell which bar is today.
    await openTab(page, /വരുമാനം/, [done]);
    await expect(page.getByText("ഓരോ ദിവസത്തെയും വരുമാനം")).toBeVisible();
    await expect(page.getByText("Earnings by weekday")).toHaveCount(0);
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      await expect(page.getByText(day, { exact: true }), day).toHaveCount(0);
    }
  });

  test("payout history says what it is", async ({ page }) => {
    await openTab(page, /വരുമാനം/, [done]);
    await expect(page.getByText("കിട്ടിയ പണം")).toBeVisible();
    await expect(page.getByText("Payout history")).toHaveCount(0);
  });

  test("the scorecard's three cards are translated", async ({ page }) => {
    await openTab(page, /വരുമാനം/, [done]);
    await expect(page.getByText("പൂർത്തിയാക്കൽ", { exact: true })).toBeVisible();
    await expect(page.getByText("ശരാശരി റേറ്റിംഗ്")).toBeVisible();
    await expect(page.getByText("ആകെ ജോലികൾ")).toBeVisible();
    await expect(page.getByText("Avg rating")).toHaveCount(0);
  });
});

test.describe("Status, in Malayalam", () => {
  test("the Pro ladder explains how to climb it", async ({ page }) => {
    await openTab(page, /വിവരങ്ങൾ/);
    await expect(page.getByText("നിങ്ങളുടെ KAAM Pro നില")).toBeVisible();
    await expect(page.getByText("KAAM Pro status")).toHaveCount(0);
    // The tier names stay English on purpose — a customer sees the same badge
    // on the worker's card, so both sides of the marketplace must read it the
    // same way.
    await expect(page.getByText(/Gold Pro|Platinum Pro|Diamond Pro|Rising/).first()).toBeVisible();
  });

  test("the profile snapshot is labelled in Malayalam", async ({ page }) => {
    await openTab(page, /വിവരങ്ങൾ/);
    await expect(page.getByText("നിങ്ങളുടെ പ്രൊഫൈൽ")).toBeVisible();
    await expect(page.getByText("ചെയ്ത ജോലി", { exact: true })).toBeVisible();
    await expect(page.getByText("Profile snapshot")).toHaveCount(0);
    await expect(page.getByText("Jobs done")).toHaveCount(0);
  });

  test("support says how to get help", async ({ page }) => {
    await openTab(page, /വിവരങ്ങൾ/);
    await expect(page.getByText("സഹായവും പരാതികളും")).toBeVisible();
    await expect(page.getByText("Support & disputes")).toHaveCount(0);
  });

  test("the referral card leads in Malayalam and keeps the English under it", async ({ page }) => {
    await openTab(page, /വിവരങ്ങൾ/);
    // Both languages stay on this card by design — a worker holds the phone
    // out to a friend, and either of them may be the one who reads English.
    await expect(page.getByText(/ഒരാളെ ചേർക്കൂ/)).toBeVisible();
    await expect(page.getByText(/Refer a worker/)).toBeVisible();
  });

  test("English is untouched for a worker who wants it", async ({ page }) => {
    await seed(page, { bookings: [] });
    await page.goto("/worker");
    await page.getByRole("button", { name: /Status/ }).click();
    await expect(page.getByText("Profile snapshot")).toBeVisible();
    await expect(page.getByText("KAAM Pro status")).toBeVisible();
  });
});
