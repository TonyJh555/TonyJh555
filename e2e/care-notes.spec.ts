import { expect, test } from "@playwright/test";
import { CUSTOMER } from "./helpers";

/**
 * The handover a family is actually paying for.
 *
 * A plan used to show money leaving and a tick. These check that the visit
 * comes back with something in it — and that KAAM reports a reading without
 * ever telling a family what it means.
 */

/** Dates inside the current term, so the visits are real ones. */
function days(back: number): string {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TERM_START = new Date(Date.now() - 30 * 86_400_000).toISOString();
const TERM_END = new Date(Date.now() + 60 * 86_400_000).toISOString();

function plan(over: Record<string, unknown> = {}) {
  return {
    id: "sub1",
    customerId: "c1",
    workerId: "w1",
    workerName: "Sreeja Nair",
    categoryId: "nurse",
    service: "Home Nurse · 3 Months plan",
    planId: "m3",
    months: 3,
    monthlyAmount: 24000,
    termAmount: 72000,
    monthlyPayout: 19200,
    termPayout: 57600,
    // Every weekday, so there is always a recent visit whatever day it runs.
    visits: { days: [0, 1, 2, 3, 4, 5, 6], time: "09:00" },
    sessions: [],
    startDate: TERM_START,
    renewsOn: TERM_END,
    autoRenew: true,
    status: "active",
    paymentRef: "demo_sub_1",
    history: [],
    createdAt: TERM_START,
    ...over,
  };
}

function mark(date: string, care: Record<string, unknown>, note?: string) {
  return { date, status: "done", by: "worker", at: `${date}T10:00:00.000Z`, care, ...(note ? { note } : {}) };
}

async function seedPlan(page: import("@playwright/test").Page, sub: Record<string, unknown>) {
  await page.goto("/app");
  await page.evaluate(
    ({ sub, customer }) => {
      localStorage.clear();
      localStorage.setItem("kaam.tour.done", "1");
      localStorage.setItem("kaam.customer.v1", JSON.stringify(customer));
      localStorage.setItem("kaam.bookings.v1", "[]");
      localStorage.setItem("kaam.subscriptions.v1", JSON.stringify([sub]));
    },
    { sub, customer: CUSTOMER },
  );
}

test.describe("the family can see how the visit went", () => {
  test("the last handover reads as a sentence, not a tick", async ({ page }) => {
    await seedPlan(
      page,
      plan({
        sessions: [
          mark(days(2), { ate: "all", meds: "given", mood: "ok", bp: { sys: 122, dia: 80 } }),
        ],
      }),
    );
    await page.goto("/app/bookings");
    await expect(page.getByText("Last visit").first()).toBeVisible();
    await expect(page.getByText(/Ate well · Taken on time · As usual · BP 122\/80/)).toBeVisible();
  });

  test("a reading outside the range points at the doctor, never at a medicine", async ({ page }) => {
    await seedPlan(
      page,
      plan({ sessions: [mark(days(1), { ate: "some", meds: "given", bp: { sys: 158, dia: 96 } })] }),
    );
    await page.goto("/app/bookings");
    const warning = page.getByText(/Blood pressure 158\/96/).first();
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/doctor/i);
    // KAAM does not prescribe. Ever.
    await expect(page.getByText(/tablet|dose|mg\b/i)).toHaveCount(0);
  });

  test("a pattern across visits is said once, at the top", async ({ page }) => {
    await seedPlan(
      page,
      plan({
        sessions: [
          mark(days(4), { ate: "all", meds: "refused" }),
          mark(days(3), { ate: "some", meds: "given" }),
          mark(days(1), { ate: "none", meds: "refused" }, "Wouldn't take the evening ones"),
        ],
      }),
    );
    await page.goto("/app/bookings");
    await expect(page.getByText(/Medicines were refused 2 of the last 3 visits/i)).toBeVisible();
    await expect(page.getByText("Wouldn't take the evening ones")).toBeVisible();
  });

  test("a plan with nothing recorded promises nothing", async ({ page }) => {
    await seedPlan(page, plan());
    await page.goto("/app/bookings");
    await expect(page.getByText("Last visit")).toHaveCount(0);
    await expect(page.getByText(/Worth knowing/)).toHaveCount(0);
  });
});

test.describe("the carer's side is taps, not typing", () => {
  test("recording a visit asks for the handover and stores it", async ({ page }) => {
    await seedPlan(page, plan());
    await page.goto("/worker");
    await page.getByRole("button", { name: /Record this visit/i }).first().click();

    await expect(page.getByText("For the family")).toBeVisible();
    await page.getByRole("button", { name: "Ate well", exact: true }).click();
    await page.getByRole("button", { name: "Refused", exact: true }).click();
    await page.getByRole("button", { name: "✅ Done" }).click();

    const stored = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem("kaam.subscriptions.v1") || "[]");
      return subs[0].sessions.at(-1);
    });
    expect(stored.status).toBe("done");
    expect(stored.care).toMatchObject({ ate: "all", meds: "refused" });
  });

  test("a visit that did not happen carries no handover", async ({ page }) => {
    await seedPlan(page, plan());
    await page.goto("/worker");
    await page.getByRole("button", { name: /Record this visit/i }).first().click();
    await page.getByRole("button", { name: "Ate well", exact: true }).click();
    await page.getByRole("button", { name: /Didn't happen/i }).click();

    const stored = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem("kaam.subscriptions.v1") || "[]");
      return subs[0].sessions.at(-1);
    });
    expect(stored.status).toBe("missed");
    expect(stored.care).toBeUndefined();
  });
});
