import { expect, test } from "@playwright/test";

/**
 * The moving banner strip at the top of the front page.
 *
 * A landing page is the one screen where a broken image is not a small bug —
 * it is the first thing a stranger sees of the company. And a carousel that
 * has quietly stopped moving is worse than no carousel: five of the six
 * pictures simply never exist for anyone who doesn't swipe.
 */

const CARDS = [
  { ml: "വീട്ടിൽ വന്ന് പരിചരണം", en: "Home nursing", cat: "nurse" },
  { ml: "വീട്ടുപകരണങ്ങൾ നന്നാക്കാൻ", en: "Repairs you can trust", cat: "elec" },
  { ml: "വീട്ടിൽ വന്ന് സംഗീതം പഠിപ്പിക്കാൻ", en: "Music at home", cat: "violin" },
  { ml: "മുതിർന്നവർക്ക് കൂട്ടായി", en: "Elder care", cat: "eldercare" },
  { ml: "നൃത്തം പഠിക്കാൻ", en: "Dance classes", cat: "dance" },
  { ml: "ഫിസിയോതെറാപ്പി", en: "Physiotherapy", cat: "physio" },
];

/** How far the track has been slid, as a whole number of slides. */
async function slideIndex(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('[aria-roledescription="carousel"] > div');
    if (!track) return -1;
    const m = /translateX\(-?([\d.]+)%\)/.exec(track.style.transform);
    return m ? Math.round(parseFloat(m[1]) / 100) : 0;
  });
}

test("the banner is the first thing on the page", async ({ page }) => {
  await page.goto("/");
  const banner = page.locator('[aria-roledescription="carousel"]');
  await expect(banner).toBeVisible();
  // Above the green hero, not buried halfway down as a grid of tiles.
  const bannerBox = await banner.boundingBox();
  const heroBox = await page.getByRole("heading", { level: 1 }).boundingBox();
  expect(bannerBox!.y).toBeLessThan(heroBox!.y);
});

test("it moves on its own", async ({ page }) => {
  await page.goto("/");
  expect(await slideIndex(page)).toBe(0);
  // The strip advances every 5s; give it one turn plus the slide animation.
  await page.waitForTimeout(6200);
  expect(await slideIndex(page)).toBe(1);
});

test("a dot jumps straight to its banner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show Physiotherapy" }).click();
  await expect.poll(() => slideIndex(page)).toBe(5);
});

test("every banner photograph actually loads", async ({ page }) => {
  // A 404 on an image is invisible to toBeVisible() — the element is still
  // there, just empty. Only naturalWidth tells the truth.
  const failed: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/showcase/") && r.status() >= 400) failed.push(r.url());
  });

  await page.goto("/");
  await page.waitForTimeout(2500);

  const broken = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .filter((i) => i.currentSrc.includes("showcase") || i.src.includes("showcase"))
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => i.getAttribute("src") ?? ""),
  );

  expect(failed, `HTTP errors: ${failed.join(", ")}`).toEqual([]);
  expect(broken, `empty images: ${broken.join(", ")}`).toEqual([]);
});

test("all six banners are there, in both languages", async ({ page }) => {
  await page.goto("/");
  for (const c of CARDS) {
    await expect(page.getByText(c.ml), c.ml).toHaveCount(1);
    await expect(page.getByText(c.en, { exact: true }), c.en).toHaveCount(1);
  }
});

test("each banner leads to the service it shows", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page
    .locator('[aria-roledescription="carousel"] a')
    .evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  expect(hrefs).toEqual(CARDS.map((c) => `/app/search?cat=${c.cat}`));
});

test("the visible banner actually opens that service", async ({ page }) => {
  await page.goto("/");
  await page.locator('[aria-roledescription="carousel"] a').first().click();
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

test("the photograph is never squeezed into a letterbox", async ({ page }) => {
  // The bug this guards: a 5:4 photograph stretched across a 2.5:1 band is
  // magnified until only two faces are left. The uniform, the lanyard, the
  // stethoscope and the blood-pressure cuff all crop away — and a nurse with
  // her patient starts to read as a husband and wife.
  //
  // The source images are 1.25:1. Anything past ~1.8:1 is throwing away more
  // than a third of the frame, which is where the meaning lives.
  for (const width of [1920, 1280, 768, 393]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(400);
    const box = await page
      .locator('[aria-roledescription="carousel"] a')
      .first()
      .locator("img")
      .boundingBox();
    const ratio = box!.width / box!.height;
    expect(ratio, `${width}px wide → ${ratio.toFixed(2)}:1`).toBeLessThan(1.8);
  }
});
