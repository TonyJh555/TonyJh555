import { expect, test } from "@playwright/test";

/**
 * The photographs on the front page.
 *
 * A landing page is the one screen where a broken image is not a small bug —
 * it is the first thing a stranger sees of the company. These check the things
 * that break silently: a file that isn't there, a caption sitting on a picture
 * that failed to load, and a card that looks clickable but goes nowhere.
 */

const CARDS = [
  { ml: "വീട്ടിൽ വന്ന് പരിചരണം", en: "Home nursing", cat: "nurse" },
  { ml: "വീട്ടുപകരണങ്ങൾ നന്നാക്കാൻ", en: "Repairs you can trust", cat: "elec" },
  { ml: "വീട്ടിൽ വന്ന് സംഗീതം പഠിപ്പിക്കാൻ", en: "Music at home", cat: "violin" },
  { ml: "മുതിർന്നവർക്ക് കൂട്ടായി", en: "Elder care", cat: "eldercare" },
  { ml: "നൃത്തം പഠിക്കാൻ", en: "Dance classes", cat: "dance" },
  { ml: "ഫിസിയോതെറാപ്പി", en: "Physiotherapy", cat: "physio" },
];

test("every showcase photograph actually loads", async ({ page }) => {
  // A 404 on a background image is invisible to toBeVisible() — the element is
  // still there, just empty. Only naturalWidth tells the truth.
  const failed: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/showcase/") && r.status() >= 400) failed.push(r.url());
  });

  await page.goto("/");
  // Every card has to come into view: the ones past the first row are lazy, so
  // stopping at the heading would measure images the browser never fetched and
  // report a phantom failure.
  for (const c of CARDS) {
    await page.getByRole("link").filter({ hasText: c.en }).first().scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(1500);

  const broken = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .filter((i) => i.currentSrc.includes("showcase") || i.src.includes("showcase"))
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => i.getAttribute("src") ?? ""),
  );

  expect(failed, `HTTP errors: ${failed.join(", ")}`).toEqual([]);
  expect(broken, `empty images: ${broken.join(", ")}`).toEqual([]);
});

test("all six cards are on the page, in both languages", async ({ page }) => {
  await page.goto("/");
  for (const c of CARDS) {
    await expect(page.getByText(c.ml), c.ml).toBeVisible();
    await expect(page.getByText(c.en, { exact: true }), c.en).toBeVisible();
  }
});

test("each card leads to the service it shows", async ({ page }) => {
  await page.goto("/");
  for (const c of CARDS) {
    const href = await page.getByRole("link").filter({ hasText: c.en }).first().getAttribute("href");
    expect(href, c.en).toBe(`/app/search?cat=${c.cat}`);
  }
});

test("a card actually opens that service", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link").filter({ hasText: "Home nursing" }).first().click();
  await expect(page).toHaveURL(/\/app\/search\?cat=nurse/);
});

test("no invented person is named as a KAAM worker or customer", async ({ page }) => {
  // The posters these were cropped from captioned their subjects — "KAAM
  // Nurse: Latha", "Patient: Mr. Nair". They are generated images, so those
  // names would present invented people as real workers and real customers.
  // The crop removes them; this fails if a future crop puts them back.
  await page.goto("/");
  const body = (await page.textContent("body")) ?? "";
  for (const name of ["Latha", "Lathadevi", "Mr. Nair", "Mr. Menon", "Madhavan", "Sneha", "Biju", "Smitha", "Anjali", "Meera", "Kavya"]) {
    expect(body, name).not.toContain(name);
  }
});

test("the front page is readable at arm's length", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 830 });
  await page.goto("/");
  const bad = await page.evaluate(() => {
    const out: { text: string; size: number }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent?.trim() ?? "")
        .join(" ")
        .trim();
      if (!own || !el.getClientRects().length) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 12) out.push({ text: own.slice(0, 40), size });
    }
    return out;
  });
  expect(bad, `below 12px: ${JSON.stringify(bad.slice(0, 8))}`).toEqual([]);
});
