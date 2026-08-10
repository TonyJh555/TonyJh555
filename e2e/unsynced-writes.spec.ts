import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";

/**
 * A change that hasn't reached the database is shown, not swallowed.
 *
 * The unit tests cover the merge rule that stops a refetch destroying unsent
 * work. This covers the other half — that somebody is actually told — because
 * the whole bug was a warning going somewhere nobody looks.
 */

/** Put a stuck write in the queue, as a failed send would have left it. */
async function withStuckWrite(
  page: import("@playwright/test").Page,
  over: Record<string, unknown> = {},
) {
  await page.evaluate((over) => {
    localStorage.setItem(
      "kaam.outbox.v1",
      JSON.stringify([
        {
          id: "ob-stuck",
          table: "bookings",
          recordId: "bk1",
          kind: "update",
          payload: { status: "completed" },
          record: { id: "bk1", status: "completed" },
          at: new Date(Date.now() - 9 * 60_000).toISOString(),
          attempts: 2,
          ...over,
        },
      ]),
    );
  }, over);
}

test("the customer is told a change hasn't saved, in words that don't frighten", async ({
  page,
}) => {
  await seed(page, { bookings: [booking({ status: "in_progress" })] });
  await withStuckWrite(page);
  await page.goto("/app/bookings");

  await expect(page.getByText("1 change not saved yet")).toBeVisible();
  // Nothing is lost — saying otherwise would send them to support over a
  // problem that fixes itself the moment the signal returns.
  await expect(page.getByText(/safe on this phone/)).toBeVisible();
  await expect(page.getByText(/Waiting 9 min/)).toBeVisible();
});

test("the worker sees it above the fold, not buried in settings", async ({ page }) => {
  await seed(page, { bookings: [booking({ status: "in_progress" })] });
  await withStuckWrite(page);
  await page.goto("/worker");

  const warning = page.getByText("1 change not saved yet");
  await expect(warning).toBeVisible();
  // Visible without scrolling: a warning you have to hunt for is not a warning.
  const box = await warning.boundingBox();
  expect(box!.y).toBeLessThan(page.viewportSize()!.height);
});

test("one thumb can retry it", async ({ page }) => {
  await seed(page, { bookings: [booking({ status: "in_progress" })] });
  await withStuckWrite(page);
  await page.goto("/app/bookings");

  await expect(page.getByRole("button", { name: "Try again now" })).toBeVisible();
});

test("the database's own words are shown, not a guess at the cause", async ({ page }) => {
  await seed(page, { bookings: [booking({ status: "in_progress" })] });
  await withStuckWrite(page, { lastError: 'new row violates row-level security policy for table "bookings"' });
  await page.goto("/app/bookings");

  await expect(page.getByText(/violates row-level security/)).toBeVisible();
});

test("a refused write is reported at once, without waiting out the grace period", async ({
  page,
}) => {
  // A refusal will not fix itself on the next tick, so the delay meant for a
  // weak signal does not apply to it.
  await seed(page, { bookings: [booking({ status: "in_progress" })] });
  await withStuckWrite(page, { at: new Date().toISOString(), attempts: 1, lastError: "denied" });
  await page.goto("/app/bookings");

  await expect(page.getByText("1 change not saved yet")).toBeVisible();
});

test("nothing is said when everything has landed", async ({ page }) => {
  // The value of this warning is that it is rare enough to be believed. A box
  // that flashes on every tap is one people learn to scroll past.
  await seed(page, { bookings: [booking({ status: "in_progress" })] });
  await page.goto("/app/bookings");

  await expect(page.getByText(/not saved yet/)).toHaveCount(0);
});

test("a write queued a second ago is not worth interrupting anyone over", async ({ page }) => {
  await seed(page, { bookings: [booking({ status: "in_progress" })] });
  await withStuckWrite(page, { at: new Date().toISOString(), attempts: 0, lastError: undefined });
  await page.goto("/app/bookings");

  await expect(page.getByText(/not saved yet/)).toHaveCount(0);
});
