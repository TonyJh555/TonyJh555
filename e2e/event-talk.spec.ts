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

/**
 * Sign in to the company portal the way a company really does: a code to the
 * registered number. There is no dropdown any more — that fell back to
 * whichever company was last in the list and let anyone act as any firm.
 */
async function asCompany(page: Page, phone: string) {
  await page.goto("/events");
  await page.getByPlaceholder("10-digit mobile").fill(phone);
  await page.getByRole("button", { name: /Send me a code/ }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await page.locator('input[inputmode="numeric"]').last().fill("4321");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** The seeded demo company these tests act as. */
const MALABAR_PHONE = "9876543211";

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
  await asCompany(page, MALABAR_PHONE);
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

/**
 * A newly approved registration, written to storage — seeded companies live
 * in the source file and cannot be edited, so this is both the only way to
 * test the gate and the path a real company actually takes.
 */
const UNSIGNED = {
  id: "ec_new",
  name: "Kochi Function Crew",
  contactName: "Anil Menon",
  phone: "9876500000",
  district: "Ernakulam",
  city: "Kochi",
  yearsRunning: 6,
  crewSize: 18,
  services: ["Catering", "Serving staff"],
  about: "Sadya and serving crew across Ernakulam.",
  legalName: "Kochi Function Crew Pvt Ltd",
  gstin: "32AABCU9603R1ZM",
  pan: "AABCU9603R",
  portfolio: [],
  status: "approved",
  submittedAt: "2026-06-01T09:00:00.000Z",
  reviewedAt: "2026-06-02T09:00:00.000Z",
};

async function seedUnsignedCompany(page: Page) {
  await seedEvent(page);
  await page.evaluate(
    ({ company }) => {
      localStorage.setItem("kaam.event.companies.v1", JSON.stringify([company]));
      const key = "kaam.event.requests.v1";
      const rs = JSON.parse(localStorage.getItem(key) ?? "[]");
      rs[0].invitedIds = [company.id];
      localStorage.setItem(key, JSON.stringify(rs));
    },
    { company: UNSIGNED },
  );
}

test("a company cannot quote before it has signed the terms", async ({ page }) => {
  // Gated on purpose: the commission has to be understood before the first
  // price, or it becomes an argument in a car park three weeks later.
  await seedUnsignedCompany(page);
  await asCompany(page, UNSIGNED.phone);

  await expect(page.getByText("Your agreement with KAAM")).toBeVisible();
  // The number the whole argument is about, stated before anyone quotes.
  await expect(page.getByText(/never more than ₹15,000/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Talk to the customer/ })).toHaveCount(0);
});

test("the introduction rule is stated, with its window and its limits", async ({ page }) => {
  await seedUnsignedCompany(page);
  await asCompany(page, UNSIGNED.phone);
  await expect(page.getByText(/within 12 months goes through KAAM/)).toBeVisible();
  // And it is explicit that it claims nothing it did not bring.
  await expect(page.getByText(/Customers you already had/)).toBeVisible();
});

test("signing it opens the briefs, and what was signed stays on screen", async ({ page }) => {
  await seedUnsignedCompany(page);
  await asCompany(page, UNSIGNED.phone);

  // Both are required — a pre-ticked box would defeat the point.
  await expect(page.getByRole("button", { name: /Accept and start/ })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Accept and start/ }).click();

  await expect(page.getByText("Partner agreement accepted")).toBeVisible();
  await expect(page.getByText(/Anil Menon/)).toBeVisible();
  await expect(page.getByText(/GSTIN 32AABCU9603R1ZM/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Talk to the customer/ })).toBeVisible();
});

test("the terms are readable in Malayalam too", async ({ page }) => {
  // The person signing may run a very good catering business in Malayalam.
  await seedUnsignedCompany(page);
  await asCompany(page, UNSIGNED.phone);
  // The portal has no language toggle of its own; the choice is the one
  // already made anywhere else in the app. Set after signing in, because the
  // sign-in helper types English button names.
  await page.evaluate(() => localStorage.setItem("kaam.lang", "ml"));
  await page.reload();
  await expect(page.getByText("കാമുമായുള്ള കരാർ")).toBeVisible();
  await expect(page.getByText(/കാം എടുക്കുന്നത്/)).toBeVisible();
});

test("a tasting is arranged on the platform, free, and both sides must agree", async ({ page }) => {
  // Nobody hands over three lakhs for a sadya they haven't eaten. If arranging
  // the tasting has to happen elsewhere, so does everything after it.
  await seedEvent(page);
  await page.goto("/app/bookings");

  const propose = page.getByRole("button", { name: /Propose a tasting or visit/ });
  await propose.scrollIntoViewIfNeeded();
  // "free" appears on the thread button too — scope to the visits panel.
  const panel = page.locator("div", { hasText: /^📅 Tastings & site visits/ }).last();
  await expect(panel).toContainText("free");
  await propose.click();

  await page.getByRole("button", { name: /Food tasting/ }).click();
  await page.locator('input[type="date"]').fill("2026-11-20");
  await page.getByPlaceholder(/Where should you meet/).fill("Company kitchen, Kakkanad");
  await page.getByRole("button", { name: "Propose it" }).click();

  // Proposed by the customer, so the customer cannot also confirm it.
  await expect(page.getByText(/Waiting for them to confirm/)).toBeVisible();

  const visits = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kaam.event.visits.v1") ?? "[]") as Record<string, string>[],
  );
  expect(visits).toHaveLength(1);
  expect(visits[0].kind).toBe("tasting");
  expect(visits[0].proposedBy).toBe("customer");
  expect(visits[0].status).toBe("proposed");
});

test("the company confirms it, and the thread carries the whole story", async ({ page }) => {
  await seedEvent(page);
  await page.goto("/app/bookings");
  const propose = page.getByRole("button", { name: /Propose a tasting or visit/ });
  await propose.scrollIntoViewIfNeeded();
  await propose.click();
  await page.locator('input[type="date"]').fill("2026-11-20");
  await page.getByPlaceholder(/Where should you meet/).fill("Company kitchen, Kakkanad");
  await page.getByRole("button", { name: "Propose it" }).click();

  await asCompany(page, MALABAR_PHONE);
  const yes = page.getByRole("button", { name: /Yes, that works/ });
  await yes.scrollIntoViewIfNeeded();
  await yes.click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  // The record the introduction clause rests on: proposed, then agreed.
  const msgs = await chat(page);
  expect(msgs.some((m) => m.text?.includes("proposed"))).toBe(true);
  expect(msgs.some((m) => m.text?.includes("✅ Confirmed"))).toBe(true);
});

test("a tasting cannot be booked for after the wedding", async ({ page }) => {
  await seedEvent(page);
  await page.goto("/app/bookings");
  const propose = page.getByRole("button", { name: /Propose a tasting or visit/ });
  await propose.scrollIntoViewIfNeeded();
  await propose.click();
  await page.locator('input[type="date"]').fill("2026-12-20");
  await page.getByPlaceholder(/Where should you meet/).fill("Company kitchen");
  await expect(page.getByText(/after the function itself/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Propose it" })).toBeDisabled();
});

test("the portal shows nothing until a company proves who it is", async ({ page }) => {
  // It used to fall back to whichever company was last in the list, so any
  // visitor could read another firm's briefs and sign in its name.
  await seedEvent(page);
  await page.goto("/events");

  await expect(page.getByText("Sign in as your company")).toBeVisible();
  await expect(page.getByText("Customers asking for your price")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Talk to the customer/ })).toHaveCount(0);
});

test("a number with no company behind it is told so, not sent a code", async ({ page }) => {
  await seedEvent(page);
  await page.goto("/events");
  await page.getByPlaceholder("10-digit mobile").fill("9000000000");
  await page.getByRole("button", { name: /Send me a code/ }).click();
  await expect(page.getByText(/No company is registered against that number/)).toBeVisible();
});

test("the wrong code gets you nowhere", async ({ page }) => {
  await seedEvent(page);
  await page.goto("/events");
  await page.getByPlaceholder("10-digit mobile").fill(MALABAR_PHONE);
  await page.getByRole("button", { name: /Send me a code/ }).click();
  await page.locator('input[inputmode="numeric"]').last().fill("9999");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText(/Wrong code/)).toBeVisible();
  await expect(page.getByText("Customers asking for your price")).toHaveCount(0);
});

test("signing in reaches that company and no other", async ({ page }) => {
  await seedEvent(page);
  await asCompany(page, MALABAR_PHONE);
  await expect(page.getByText("Malabar Weddings & Events")).toBeVisible();
  await expect(page.getByText("Customers asking for your price")).toBeVisible();
});

test("signing out closes the door behind you", async ({ page }) => {
  await seedEvent(page);
  await asCompany(page, MALABAR_PHONE);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("Sign in as your company")).toBeVisible();

  // And it stays shut on the next visit — the session is really gone.
  await page.goto("/events");
  await expect(page.getByText("Sign in as your company")).toBeVisible();
});
