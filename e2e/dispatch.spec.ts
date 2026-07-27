import { expect, test } from "@playwright/test";
import { booking, seed } from "./helpers";
import { WORKERS } from "@/data/workers";
import { CATEGORIES } from "@/data/categories";

/**
 * A request that hasn't been accepted must say exactly what happened.
 *
 * Telling someone to "keep waiting" for a worker who has already refused is
 * the same defect as calling an unaccepted booking "Confirmed": the screen is
 * describing a state the system is not in. These tests hold that line.
 */

const DECLINED = {
  passedIds: ["w1"],
  attempt: 2,
  offerExpiresAt: null,
  lastOutcome: {
    workerId: "w1",
    workerName: "Rahul Sharma",
    reason: "declined",
    at: new Date().toISOString(),
  },
};

const NO_REPLY = {
  passedIds: [],
  attempt: 1,
  offerExpiresAt: null,
  lastOutcome: {
    workerId: "w1",
    workerName: "Rahul Sharma",
    reason: "no_reply",
    at: new Date().toISOString(),
  },
};

test.describe("an unaccepted request says what actually happened", () => {
  test("a refusal is reported as a refusal, never as 'keep waiting'", async ({ page }) => {
    await seed(page, { bookings: [booking({ dispatch: DECLINED })] });
    await page.goto("/app/bookings");

    await expect(page.getByText(/Rahul can't take this job/i)).toBeVisible();
    await expect(page.getByText(/Nothing has been charged/i).first()).toBeVisible();
    // The precise lie this replaces.
    await expect(page.getByText(/hasn't replied yet/i)).toHaveCount(0);
    await expect(page.getByText(/They may still accept/i)).toHaveCount(0);

    // One card, one story: the pill and the timeline must not contradict it.
    await expect(page.getByText(/Not accepted/i)).toBeVisible();
    await expect(page.getByText(/Waiting for worker/i)).toHaveCount(0);
    await expect(page.getByText(/Waiting for the worker to confirm/i)).toHaveCount(0);
    await expect(page.getByText(/● live/)).toHaveCount(0);
  });

  test("silence is reported as silence, and still holds out hope", async ({ page }) => {
    await seed(page, { bookings: [booking({ dispatch: NO_REPLY })] });
    await page.goto("/app/bookings");

    await expect(page.getByText(/Rahul hasn't replied yet/i)).toBeVisible();
    await expect(page.getByText(/They may still accept/i)).toBeVisible();
    await expect(page.getByText(/can't take this job/i)).toHaveCount(0);
  });

  test("a live offer still counts down instead of pre-judging it", async ({ page }) => {
    await seed(page, {
      bookings: [booking({
        dispatch: {
          passedIds: [],
          attempt: 1,
          offerExpiresAt: new Date(Date.now() + 120_000).toISOString(),
        },
      })],
    });
    await page.goto("/app/bookings");

    await expect(page.getByText(/left on their offer/i)).toBeVisible();
    // Nothing may be decided for the customer while the worker still holds it.
    await expect(page.getByRole("button", { name: /Choose another worker/i })).toHaveCount(0);
  });
});

test.describe("thin supply is admitted, not hidden", () => {
  test("when nobody else does this work, the customer gets a way out", async ({ page }) => {
    // Construct the dead end rather than hunt for one: take a trade and pass
    // over every worker in it. Depending on a thin category would make this
    // test quietly stop testing anything the moment the roster grew — which is
    // exactly what happened when it was pinned to the one pianist.
    const categoryId = "piano";
    const crew = WORKERS.filter((w) => w.categoryId === categoryId);
    expect(crew.length).toBeGreaterThan(0);
    const worker = crew[0];
    const trade = CATEGORIES.find((c) => c.id === categoryId)!.label.toLowerCase();

    await seed(page, {
      bookings: [booking({
        categoryId,
        workerId: worker.id,
        workerName: worker.name,
        dispatch: {
          ...DECLINED,
          passedIds: crew.map((w) => w.id),
          lastOutcome: { ...DECLINED.lastOutcome, workerId: worker.id, workerName: worker.name },
        },
      })],
    });
    await page.goto("/app/bookings");

    await expect(page.getByText(new RegExp(`No other ${trade} nearby right now`, "i"))).toBeVisible();
    // He refused, so there is nobody left to accept — never promise otherwise.
    await expect(page.getByText(/They won't be taking it/i)).toBeVisible();
    await expect(page.getByText(/you'll be told the moment they accept/i)).toHaveCount(0);
    await expect(page.getByText(/Nothing has been charged — cancelling costs you nothing/i)).toBeVisible();

    // And the way out is real: two taps, and it actually cancels.
    await page.getByRole("button", { name: /Cancel this request/i }).click();
    await page.getByRole("button", { name: /Yes, cancel it/i }).click();
    await expect(page.getByText(/Cancelled/i).first()).toBeVisible();
  });
});
