import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * Pause & reschedule belongs to repairs, and nowhere else.
 *
 * It exists for one situation: the electrician opens the wall, needs a part,
 * and comes back tomorrow — with the meter stopped while he is at the shop.
 * A mehendi sitting or a massage is bought whole, so there is no clock to stop
 * and the button said nothing true.
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

const pauseButton = /Pause & reschedule/i;

test.describe("where the pause button belongs", () => {
  test("a repair still offers it", async ({ page }) => {
    await seed(page, { bookings: [running({ categoryId: "elec", subService: "Wiring" })] });
    await page.goto("/app/bookings");
    await expect(page.getByRole("button", { name: pauseButton })).toBeVisible();
  });

  test("a mehendi sitting does not", async ({ page }) => {
    await seed(page, { bookings: [running({ categoryId: "mehendi", subService: "Bridal Mehendi" })] });
    await page.goto("/app/bookings");
    await expect(page.getByText(/Work in progress/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: pauseButton })).toHaveCount(0);
  });

  test("neither does a nurse's visit or a cook's function", async ({ page }) => {
    for (const categoryId of ["nurse", "cook"]) {
      await seed(page, { bookings: [running({ categoryId, subService: "Visit" })] });
      await page.goto("/app/bookings");
      await expect(page.getByRole("button", { name: pauseButton }), categoryId).toHaveCount(0);
    }
  });

  test("the worker's own screen agrees", async ({ page }) => {
    await seed(page, { bookings: [running({ categoryId: "mehendi", subService: "Bridal Mehendi" })] });
    await page.goto("/worker");
    await expect(page.getByRole("button", { name: pauseButton })).toHaveCount(0);
  });

  test("a pause already agreed can still be finished", async ({ page }) => {
    // A job paused before this rule existed must not be stranded mid-flow.
    await seed(page, {
      bookings: [
        running({
          categoryId: "mehendi",
          subService: "Bridal Mehendi",
          pausedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
          bankedMs: 20 * 60_000,
        }),
      ],
    });
    await page.goto("/app/bookings");
    await expect(page.getByText(/start code/i).first()).toBeVisible();
  });
});
