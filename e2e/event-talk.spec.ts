import { expect, test, type Page } from "@playwright/test";
import { CUSTOMER } from "./helpers";

/**
 * Where a wedding actually gets agreed.
 *
 * Nobody prices a 400-guest sadya off a form. Before a caterer can quote they
 * have to ask whether it is vegetarian and whether the venue kitchen works —
 * and until now there was nowhere on KAAM to ask, so the conversation, and
 * usually the booking, went to WhatsApp.
 */

const COMPANY = "ec_seed_1";

const request = {
  id: "er-1",
  customerId: "c1",
  kind: "wedding",
  date: "2026-12-14",
  venue: "Ammas Auditorium, Kakkanad",
  district: "Ernakulam",
  guests: 400,
  budget: 300000,
  notes: "Sadya at noon, veg only",
  invitedIds: [COMPANY],
  status: "open",
  stateId: "KL",
  createdAt: "2026-08-01T09:00:00.000Z",
};

async function seedEvent(page: Page) {
  await page.goto("/app");
  await page.evaluate(
    ({ request, customer }) => {
      localStorage.clear();
      localStorage.setItem("kaam.tour.done", "1");
      localStorage.setItem("kaam.customer.v1", JSON.stringify(customer));
      localStorage.setItem("kaam.bookings.v1", "[]");
      localStorage.setItem("kaam.event.requests.v1", JSON.stringify([request]));
      localStorage.setItem("kaam.event.quotes.v1", "[]");
    },
    { request, customer: CUSTOMER },
  );
}

/** The company portal picks who you are from a dropdown, not from storage. */
async function asCompany(page: Page, name: string) {
  await page.goto("/events");
  const picker = page.locator("select").first();
  if (await picker.count()) await picker.selectOption({ label: name });
}

async function chat(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("kaam.chat.v1") ?? "[]") as Record<string, string>[],
  );
}

test("a customer can talk to a company before anybody has priced anything", async ({ page }) => {
  await seedEvent(page);
  await page.goto("/app/bookings");

  const open = page.getByRole("button", { name: /Talk to Malabar Weddings/ });
  await open.scrollIntoViewIfNeeded();
  await expect(open).toBeVisible();
  // Free is the point: a metered conversation gets moved off the platform.
  await expect(page.getByText(/free, before you decide/)).toBeVisible();
});

test("the company sees the brief the moment the room opens", async ({ page }) => {
  await seedEvent(page);
  await page.goto("/app/bookings");
  const open = page.getByRole("button", { name: /Talk to Malabar Weddings/ });
  await open.scrollIntoViewIfNeeded();
  await open.click();

  // The questions a caterer must answer before quoting are already on screen.
  // Scoped to the thread: the request header says "400 guests" too.
  await expect(page.getByText(/400 guests · Ammas Auditorium/)).toBeVisible();
  await expect(page.getByText(/Sadya at noon/)).toBeVisible();

  const msgs = await chat(page);
  expect(msgs).toHaveLength(1);
  expect(msgs[0].bookingId).toBe(`evt:er-1:${COMPANY}`);
});

test("an invited company is visible while it is still working on the price", async ({ page }) => {
  // It used to be invisible: the customer saw "who else to ask", then
  // eventually prices, and nothing at all in between.
  await seedEvent(page);
  await page.goto("/app/bookings");
  await expect(page.getByText("Companies you asked")).toBeVisible();
  await expect(page.getByText(/Working on your price/)).toBeVisible();
});

test("what the customer types reaches the company's own screen", async ({ page }) => {
  await seedEvent(page);
  await page.goto("/app/bookings");
  const open = page.getByRole("button", { name: /Talk to Malabar Weddings/ });
  await open.scrollIntoViewIfNeeded();
  await open.click();

  await page.getByPlaceholder(/Type a message/i).fill("Is the venue kitchen usable?");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  const msgs = await chat(page);
  expect(msgs.some((m) => m.text === "Is the venue kitchen usable?")).toBe(true);

  // Same thread, read from the company's side of the app.
  await asCompany(page, "Malabar Weddings & Events");
  const theirs = page.getByRole("button", { name: /Talk to the customer/ });
  await theirs.scrollIntoViewIfNeeded();
  await theirs.click();
  await expect(page.getByText("Is the venue kitchen usable?")).toBeVisible();
});

test("each company gets its own room", async ({ page }) => {
  // Four companies quoting one wedding must not read each other's questions.
  await seedEvent(page);
  await page.evaluate(() => {
    const key = "kaam.event.requests.v1";
    const rs = JSON.parse(localStorage.getItem(key) ?? "[]");
    rs[0].invitedIds = ["ec_seed_1", "ec_seed_2"];
    localStorage.setItem(key, JSON.stringify(rs));
  });
  await page.goto("/app/bookings");

  for (const name of [/Talk to Malabar Weddings/, /Talk to /]) {
    const b = page.getByRole("button", { name }).first();
    await b.scrollIntoViewIfNeeded();
    await b.click();
  }
  const ids = new Set((await chat(page)).map((m) => m.bookingId));
  expect(ids.size).toBe(2);
});
