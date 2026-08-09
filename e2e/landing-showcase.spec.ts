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
    const track = document.querySelector<HTMLElement>("[data-carousel-track]");
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
  // Scoped to the carousel. Page-wide this used to be safe and no longer is:
  // the service catalogue below now carries Malayalam names too, and a banner
  // headline can be a prefix of one ("ഫിസിയോതെറാപ്പി" of "ഫിസിയോതെറാപ്പിസ്റ്റ്").
  // The claim being made is that each banner exists once in the banner strip,
  // so that is where it should be counted.
  const banners = page.locator('[data-carousel-track]');
  for (const c of CARDS) {
    await expect(banners.getByText(c.ml), c.ml).toHaveCount(1);
    await expect(banners.getByText(c.en, { exact: true }), c.en).toHaveCount(1);
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

test("the photograph dissolves into the dark instead of ending at a seam", async ({ page }) => {
  // The mask is what removes the vertical line where the sharp photograph
  // meets the blurred fill behind it. It is written as an arbitrary Tailwind
  // property, and arbitrary properties can silently emit no rule at all —
  // `aspect-[5/4]` did exactly that here once, collapsing every showcase card
  // while the markup still looked correct. Only the computed style tells the
  // truth, so this asserts on the computed style.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const mask = await page.evaluate(() => {
    const box = document.querySelector("[data-carousel-track] a > div");
    return box ? getComputedStyle(box).maskImage : "";
  });
  expect(mask, `computed mask-image was "${mask}"`).toContain("linear-gradient");

  // And it must not apply on a phone, where the picture is the whole slide —
  // masking its left edge there would fade out part of the photograph itself.
  await page.setViewportSize({ width: 393, height: 830 });
  await page.goto("/");
  const phoneMask = await page.evaluate(() => {
    const box = document.querySelector("[data-carousel-track] a > div");
    return box ? getComputedStyle(box).maskImage : "";
  });
  expect(phoneMask).toBe("none");
});

test("the service catalogue is drawn, not typed in emoji", async ({ page }) => {
  // Emoji are rendered by the operating system: the same grid is flat outlines
  // on one phone, glossy 3-D blobs on another, and an empty box where the font
  // is missing. A shopfront built out of them looks assembled rather than
  // designed — so every tile carries a real drawing.
  await page.goto("/");
  // The banner slides link to the same places, so they have to be excluded —
  // they are photographs, not tiles, and carry no icon by design.
  const tiles = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/app/search?cat="]'))
      .filter((e) => !e.closest("[data-carousel-track]"))
      .map((e) => ({ text: e.textContent?.trim().slice(0, 24) ?? "", svg: Boolean(e.querySelector("svg")) })),
  );

  expect(tiles.length, "every service in the catalogue should have a tile").toBeGreaterThan(30);

  const withoutIcon = tiles.filter((t) => !t.svg).map((t) => t.text);
  expect(withoutIcon, `tiles with no drawing: ${withoutIcon.join(", ")}`).toEqual([]);

  // Nothing in the catalogue should be pictographic text.
  const emoji = tiles.map((t) => t.text).filter((t) => /\p{Extended_Pictographic}/u.test(t));
  expect(emoji, `emoji left in tiles: ${emoji.join(", ")}`).toEqual([]);
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
