import { expect, test } from "@playwright/test";

/**
 * The owner changing what the app says and pays, without a deploy.
 *
 * The point of these is not that the form works — it is that the figure the
 * customer reads and the figure the wallet pays are the same one, and that a
 * fat-fingered amount cannot reach either.
 */

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin");
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[type="password"]').fill("kaam2026");
  await page.getByRole("button", { name: /sign in|login/i }).first().click();
  await expect(page.getByRole("button", { name: /Content/i })).toBeVisible();
  await page.getByRole("button", { name: /Content/i }).click();
}

test.describe("offers and membership, without a developer", () => {
  test("a new referral amount reaches the customer's screen", async ({ page }) => {
    await signIn(page);
    await page.getByRole("textbox", { name: "Customer referral" }).fill("250");
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await page.goto("/app/refer");
    // Both the share copy and the headline read the saved figure.
    await expect(page.getByText(/You get ₹250\. They get ₹250\./)).toBeVisible();
    await expect(page.getByText(/₹100/)).toHaveCount(0);
  });

  test("an extra zero is pulled back to the ceiling before it can be paid", async ({ page }) => {
    await signIn(page);
    await page.getByRole("textbox", { name: "Customer referral" }).fill("50000");
    await expect(page.getByText(/outside the safe range/i)).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await page.goto("/app/refer");
    // ₹500 is the ceiling. ₹50,000 never reaches a customer's wallet.
    await expect(page.getByText(/You get ₹500\. They get ₹500\./)).toBeVisible();
  });

  test("a changed Plus price rewrites its own small print", async ({ page }) => {
    await signIn(page);
    await page.getByRole("textbox", { name: "KAAM Plus · yearly" }).fill("599");
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await page.goto("/app/plus");
    // The saving is derived, so it can never be the old number beside the new.
    await expect(page.getByText("₹599 / year · save ₹589")).toBeVisible();
  });

  test("reset puts the shipped amounts back", async ({ page }) => {
    await signIn(page);
    await page.getByRole("textbox", { name: "Welcome bonus" }).fill("300");
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await page.getByRole("button", { name: "Reset to default" }).first().click();

    await page.goto("/app/refer");
    await expect(page.getByText(/You get ₹100\. They get ₹100\./)).toBeVisible();
  });
});

test.describe("the Help centre, without a developer", () => {
  test("a new question appears for customers", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "+ Add a question" }).click();
    await page.getByLabel(/Question \(English\)/).last().fill("Do you work on Onam?");
    await page.getByLabel(/Answer \(English\)/).last().fill("Yes — with festival pricing shown upfront.");
    await page.getByRole("button", { name: "Save changes" }).last().click();

    await page.goto("/app/help");
    await expect(page.getByText("Do you work on Onam?")).toBeVisible();
  });

  test("a half-written question is dropped rather than shown empty", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "+ Add a question" }).click();
    await page.getByLabel(/Question \(English\)/).last().fill("Question with no answer?");
    await expect(page.getByText(/missing a question or an answer/i)).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).last().click();

    await page.goto("/app/help");
    await expect(page.getByText("Question with no answer?")).toHaveCount(0);
    // And the shipped questions are still there.
    await expect(page.getByText("How do I book a worker?")).toBeVisible();
  });
});
