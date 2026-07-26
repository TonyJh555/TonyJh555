"use client";

import { useState } from "react";
import {
  BANNERS_KEY,
  DEFAULT_STORIES,
  type Story,
} from "@/components/kaam-stories";
import { STORY_IMAGES } from "@/lib/story-manifest";
import {
  COUPONS_KEY,
  DEFAULT_COUPONS,
  couponUsable,
  type Coupon,
} from "@/lib/coupons";
import { CATEGORIES } from "@/data/categories";
import { resetContent, saveContent, useContent } from "@/lib/content";
import { ImageTooBigError, prepareBannerImage } from "@/lib/banner-image";

/**
 * Home banner editor — the owner's own control over what the app says.
 *
 * Edits are saved as one JSON document (see src/lib/content.ts) and appear on
 * every device. "Reset to default" deletes the document rather than writing
 * the defaults back, so the app always has a known-good state to fall back to
 * and a bad edit can never be permanent.
 *
 * Deliberately not editable here: prices, GST, commission. Those are money and
 * law — they change in code, with a test.
 */
export function BannerEditor({ editor }: { editor?: string }) {
  const saved = useContent<Story[]>(BANNERS_KEY, DEFAULT_STORIES);
  const list = Array.isArray(saved) ? saved : DEFAULT_STORIES;
  const [draft, setDraft] = useState<Story[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const banners = draft ?? list;
  const dirty = draft !== null;

  const edit = (idx: number, patch: Partial<Story>) =>
    setDraft(banners.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  const move = (idx: number, by: number) => {
    const to = idx + by;
    if (to < 0 || to >= banners.length) return;
    const next = [...banners];
    [next[idx], next[to]] = [next[to], next[idx]];
    setDraft(next);
    setOpenIdx(to);
  };

  /** A new banner starts from a safe, complete default — never a blank card. */
  const add = () => {
    setDraft([
      ...banners,
      {
        href: "/app/search",
        gradient: "linear-gradient(150deg,#0a4d37 0%,#0f6e4f 55%,#0c5a41 100%)",
        hero: "💚",
        floats: ["✨", "🌴", "🏠"],
        glow: "#e8b923",
        overlineEn: "because of KAAM",
        overlineMl: "കാം ഉള്ളതുകൊണ്ട്",
        en: "New banner — write your message here",
        ml: "പുതിയ ബാനർ — നിങ്ങളുടെ സന്ദേശം എഴുതൂ",
        cta: "Explore",
        hidden: true, // off until it's been written and checked
      },
    ]);
    setOpenIdx(banners.length);
    setMsg(null);
  };

  const remove = (idx: number) => {
    setDraft(banners.filter((_, i) => i !== idx));
    setOpenIdx(null);
  };

  /**
   * Uploading crops and compresses before anything is stored, so the banner
   * always gets the same 16:9 shape whatever was picked.
   */
  const upload = async (idx: number, file: File | undefined) => {
    if (!file) return;
    setBusy(idx);
    setErr(null);
    try {
      const dataUrl = await prepareBannerImage(file);
      edit(idx, { upload: dataUrl });
    } catch (e) {
      setErr(
        e instanceof ImageTooBigError
          ? e.message
          : "Couldn't read that picture. Try a JPG or PNG.",
      );
    } finally {
      setBusy(null);
    }
  };

  const publish = () => {
    const ok = saveContent(BANNERS_KEY, banners, editor);
    setDraft(null);
    setMsg(
      ok
        ? "Published — live on every device."
        : "Saved on this device, but it was too big to store everywhere. Try a smaller picture.",
    );
  };

  const revert = () => {
    resetContent(BANNERS_KEY);
    setDraft(null);
    setOpenIdx(null);
    setMsg("Back to the built-in banners.");
  };

  const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-kaam";
  const label = "mt-2 mb-1 block text-[11px] font-bold tracking-wide text-dim uppercase";

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-extrabold">🖼️ Home banners</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-mid">
            The rotating stories on the customer home screen. Changes go live the
            moment you publish — no deploy.
          </p>
        </div>
        {dirty && (
          <span className="shrink-0 rounded-full bg-warn-light px-2.5 py-1 text-[10px] font-extrabold text-warn">
            Unpublished
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {banners.map((b, idx) => (
          <div key={idx} className="rounded-xl border border-line bg-surf">
            <div className="flex items-center gap-2 p-2.5">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-xs font-bold">
                  {b.hidden && <span className="text-dim">(off) </span>}
                  {b.en}
                </p>
                <p className="truncate text-[10px] text-mid">
                  {b.image ? `📷 ${b.image}` : "🎨 painted"} · {b.cta} · → {b.href}
                </p>
              </button>
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move up"
                className="rounded-lg border border-line bg-white px-2 py-1 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === banners.length - 1}
                aria-label="Move down"
                className="rounded-lg border border-line bg-white px-2 py-1 text-xs disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => edit(idx, { hidden: !b.hidden })}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                  b.hidden ? "bg-line text-mid" : "bg-good text-white"
                }`}
              >
                {b.hidden ? "Off" : "On"}
              </button>
            </div>

            {openIdx === idx && (
              <div className="border-t border-line p-3">
                <label className={label}>Headline — English</label>
                <textarea
                  value={b.en}
                  onChange={(e) => edit(idx, { en: e.target.value })}
                  rows={2}
                  className={`${field} resize-none`}
                />

                <label className={label}>Headline — Malayalam</label>
                <textarea
                  value={b.ml}
                  onChange={(e) => edit(idx, { ml: e.target.value })}
                  rows={2}
                  className={`${field} resize-none`}
                />

                <label className={label}>Small line above (EN / ML)</label>
                <div className="flex gap-2">
                  <input
                    value={b.overlineEn}
                    onChange={(e) => edit(idx, { overlineEn: e.target.value })}
                    className={field}
                  />
                  <input
                    value={b.overlineMl}
                    onChange={(e) => edit(idx, { overlineMl: e.target.value })}
                    className={field}
                  />
                </div>

                <label className={label}>Button text</label>
                <input
                  value={b.cta}
                  onChange={(e) => edit(idx, { cta: e.target.value })}
                  className={field}
                />

                <label className={label}>Where it goes</label>
                <input
                  value={b.href}
                  onChange={(e) => edit(idx, { href: e.target.value })}
                  placeholder="/app/search?cat=eldercare"
                  className={`${field} font-mono text-xs`}
                />

                <label className={label}>Picture</label>
                <BannerPreview banner={b} />

                <div className="mt-2 flex gap-2">
                  <label className="flex-1 cursor-pointer rounded-lg bg-kaam py-2 text-center text-[11px] font-bold text-white">
                    {busy === idx ? "Preparing…" : b.upload ? "Replace picture" : "⬆ Upload a picture"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy === idx}
                      onChange={(e) => {
                        void upload(idx, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {(b.upload || b.image) && (
                    <button
                      onClick={() => edit(idx, { upload: undefined, image: undefined })}
                      className="rounded-lg border border-line bg-white px-3 py-2 text-[11px] font-bold text-mid"
                    >
                      Use painted
                    </button>
                  )}
                </div>

                {STORY_IMAGES.length > 0 && !b.upload && (
                  <select
                    value={b.image ?? ""}
                    onChange={(e) => edit(idx, { image: e.target.value || undefined })}
                    className={`${field} mt-2`}
                  >
                    <option value="">🎨 Painted background</option>
                    {STORY_IMAGES.map((p) => {
                      const file = p.slice(p.lastIndexOf("/") + 1);
                      return (
                        <option key={p} value={file.slice(0, file.lastIndexOf("."))}>
                          📷 {file}
                        </option>
                      );
                    })}
                  </select>
                )}

                <p className="mt-1.5 text-[10px] leading-relaxed text-dim">
                  Any picture works — it&apos;s cropped to the banner shape and
                  shrunk automatically, so the design can&apos;t break. Keep
                  faces in the top half; the words sit over the bottom.
                </p>

                <button
                  onClick={() => remove(idx)}
                  className="mt-3 w-full rounded-lg border border-kaam-mid bg-kaam-light py-2 text-[11px] font-bold text-kaam"
                >
                  Delete this banner
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={add}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-2.5 text-xs font-bold text-mid"
      >
        + Add a banner
      </button>

      {err && (
        <p className="mt-2 rounded-xl border border-kaam-mid bg-kaam-light p-2.5 text-[11px] font-semibold text-kaam">
          {err}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={publish}
          disabled={!dirty}
          className="flex-1 rounded-xl bg-kaam py-2.5 text-sm font-bold text-white shadow-kaam disabled:opacity-40"
        >
          Publish
        </button>
        {dirty && (
          <button
            onClick={() => {
              setDraft(null);
              setMsg(null);
            }}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-mid"
          >
            Discard
          </button>
        )}
        <button
          onClick={revert}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-mid"
        >
          Reset to default
        </button>
      </div>
      {msg && <p className="mt-2 text-[11px] font-bold text-good">✓ {msg}</p>}
    </section>
  );
}


/**
 * Offers editor — the codes customers type at checkout.
 *
 * Same contract as the banners: edits are one JSON document, and "Reset to
 * default" deletes it rather than writing the built-ins back. The validation
 * here is the point of a purpose-built editor over a raw JSON box: a
 * percentage over 100, a flat discount of ₹0, or a duplicate code are all
 * caught before they reach a customer.
 */
export function OfferEditor({ editor }: { editor?: string }) {
  const saved = useContent<Coupon[]>(COUPONS_KEY, DEFAULT_COUPONS);
  const list = Array.isArray(saved) ? saved : DEFAULT_COUPONS;
  const [draft, setDraft] = useState<Coupon[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const offers = draft ?? list;
  const dirty = draft !== null;

  const edit = (idx: number, patch: Partial<Coupon>) =>
    setDraft(offers.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const add = () => {
    setDraft([
      ...offers,
      {
        code: "NEWCODE",
        label: "New offer",
        kind: "percent",
        value: 10,
        maxDiscount: 200,
        note: "10% off, up to ₹200",
        active: false,
      },
    ]);
    setOpenIdx(offers.length);
  };

  const remove = (idx: number) => {
    setDraft(offers.filter((_, i) => i !== idx));
    setOpenIdx(null);
  };

  /** Everything wrong with the current draft, in plain words. */
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of offers) {
    const code = c.code.trim().toUpperCase();
    if (!code) problems.push("An offer has no code.");
    else if (seen.has(code)) problems.push(`${code} appears twice — codes must be unique.`);
    seen.add(code);
    if (!(c.value > 0)) problems.push(`${code || "An offer"} gives no discount.`);
    if (c.kind === "percent" && c.value > 100) problems.push(`${code} is over 100% off.`);
    if (c.startsOn && c.endsOn && c.startsOn > c.endsOn) {
      problems.push(`${code} ends before it starts.`);
    }
  }

  const publish = () => {
    if (problems.length) return;
    saveContent(
      COUPONS_KEY,
      offers.map((c) => ({ ...c, code: c.code.trim().toUpperCase() })),
      editor,
    );
    setDraft(null);
    setMsg("Published — live at checkout.");
  };

  const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-kaam";
  const label = "mt-2 mb-1 block text-[11px] font-bold tracking-wide text-dim uppercase";

  return (
    <section className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-extrabold">🎟️ Offers &amp; promo codes</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-mid">
            What customers can type at checkout. Switch one off and it stops
            working immediately — no deploy, and the code is kept for next year.
          </p>
        </div>
        {dirty && (
          <span className="shrink-0 rounded-full bg-warn-light px-2.5 py-1 text-[10px] font-extrabold text-warn">
            Unpublished
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {offers.map((c, idx) => {
          const live = couponUsable(c);
          return (
            <div key={idx} className="rounded-xl border border-line bg-surf">
              <div className="flex items-center gap-2 p-2.5">
                <button
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-mono text-xs font-extrabold">
                    {c.code}
                    <span className="ml-2 font-sans font-bold text-mid">
                      {c.kind === "flat" ? `₹${c.value} off` : `${c.value}% off`}
                      {c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ""}
                    </span>
                  </p>
                  <p className="truncate text-[10px] text-mid">
                    {c.min ? `min ₹${c.min} · ` : ""}
                    {c.endsOn ? `until ${c.endsOn} · ` : ""}
                    {c.categories?.length ? `${c.categories.length} service(s)` : "all services"}
                  </p>
                </button>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    live ? "bg-good-light text-good" : "bg-line text-mid"
                  }`}
                >
                  {live ? "live" : "off"}
                </span>
                <button
                  onClick={() => edit(idx, { active: c.active === false })}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    c.active === false ? "bg-line text-mid" : "bg-good text-white"
                  }`}
                >
                  {c.active === false ? "Off" : "On"}
                </button>
              </div>

              {openIdx === idx && (
                <div className="border-t border-line p-3">
                  <label className={label}>Code</label>
                  <input
                    value={c.code}
                    onChange={(e) => edit(idx, { code: e.target.value.toUpperCase() })}
                    className={`${field} font-mono`}
                  />

                  <label className={label}>What the customer sees</label>
                  <input
                    value={c.label}
                    onChange={(e) => edit(idx, { label: e.target.value })}
                    placeholder="Onam 25% off"
                    className={field}
                  />
                  <input
                    value={c.note}
                    onChange={(e) => edit(idx, { note: e.target.value })}
                    placeholder="Festive 25% off, up to ₹500"
                    className={`${field} mt-1.5`}
                  />

                  <label className={label}>Discount</label>
                  <div className="flex gap-2">
                    <select
                      value={c.kind}
                      onChange={(e) => edit(idx, { kind: e.target.value as Coupon["kind"] })}
                      className={field}
                    >
                      <option value="percent">% off</option>
                      <option value="flat">₹ off</option>
                    </select>
                    <input
                      type="number"
                      value={c.value}
                      onChange={(e) => edit(idx, { value: Number(e.target.value) || 0 })}
                      className={field}
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={label}>Minimum order (₹)</label>
                      <input
                        type="number"
                        value={c.min ?? ""}
                        onChange={(e) => edit(idx, { min: Number(e.target.value) || undefined })}
                        placeholder="none"
                        className={field}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={label}>Max discount (₹)</label>
                      <input
                        type="number"
                        value={c.maxDiscount ?? ""}
                        onChange={(e) =>
                          edit(idx, { maxDiscount: Number(e.target.value) || undefined })
                        }
                        placeholder="no cap"
                        className={field}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={label}>Starts</label>
                      <input
                        type="date"
                        value={c.startsOn ?? ""}
                        onChange={(e) => edit(idx, { startsOn: e.target.value || undefined })}
                        className={field}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={label}>Ends</label>
                      <input
                        type="date"
                        value={c.endsOn ?? ""}
                        onChange={(e) => edit(idx, { endsOn: e.target.value || undefined })}
                        className={field}
                      />
                    </div>
                  </div>

                  <label className={label}>Limit to services (none = all)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => {
                      const on = c.categories?.includes(cat.id) ?? false;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            const set = new Set(c.categories ?? []);
                            if (on) set.delete(cat.id);
                            else set.add(cat.id);
                            const next = [...set];
                            edit(idx, { categories: next.length ? next : undefined });
                          }}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            on ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
                          }`}
                        >
                          {cat.icon} {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => remove(idx)}
                    className="mt-3 w-full rounded-lg border border-kaam-mid bg-kaam-light py-2 text-[11px] font-bold text-kaam"
                  >
                    Delete this offer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={add}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-2.5 text-xs font-bold text-mid"
      >
        + Add an offer
      </button>

      {problems.length > 0 && (
        <ul className="mt-3 rounded-xl border border-kaam-mid bg-kaam-light p-3 text-[11px] font-semibold text-kaam">
          {problems.map((p, i) => (
            <li key={i}>• {p}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={publish}
          disabled={!dirty || problems.length > 0}
          className="flex-1 rounded-xl bg-kaam py-2.5 text-sm font-bold text-white shadow-kaam disabled:opacity-40"
        >
          Publish
        </button>
        {dirty && (
          <button
            onClick={() => {
              setDraft(null);
              setMsg(null);
            }}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-mid"
          >
            Discard
          </button>
        )}
        <button
          onClick={() => {
            resetContent(COUPONS_KEY);
            setDraft(null);
            setOpenIdx(null);
            setMsg("Back to the built-in offers.");
          }}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-mid"
        >
          Reset to default
        </button>
      </div>
      {msg && <p className="mt-2 text-[11px] font-bold text-good">✓ {msg}</p>}
    </section>
  );
}


/**
 * Exactly what the customer will see — same crop, same dark gradient, same
 * text position. The point is that the owner can judge a picture before
 * publishing it, rather than discovering the headline is unreadable later.
 */
function BannerPreview({ banner }: { banner: Story }) {
  const fromRepo = banner.image
    ? STORY_IMAGES.find((p) => {
        const file = p.slice(p.lastIndexOf("/") + 1);
        return file.slice(0, file.lastIndexOf(".")).toLowerCase() === banner.image?.toLowerCase();
      })
    : undefined;
  const photo = banner.upload ?? fromRepo;
  return (
    <div className="relative mt-1 h-32 w-full overflow-hidden rounded-xl">
      <div className="absolute inset-0" style={{ background: banner.gradient }} />
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {photo && (
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.30)_45%,rgba(0,0,0,0.10)_100%)]" />
      )}
      {!photo && (
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-4xl">{banner.hero}</span>
      )}
      <div className="relative flex h-full flex-col justify-end p-3">
        <p className="text-[8px] font-bold tracking-[0.18em] text-white/80 uppercase">
          ✦ {banner.overlineEn}
        </p>
        <p
          className={`font-display text-[11px] leading-snug font-extrabold ${
            photo ? "text-white" : banner.dark ? "text-ink" : "text-white"
          }`}
        >
          {banner.en}
        </p>
        <span className="mt-1 w-fit rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
          {banner.cta} →
        </span>
      </div>
      {!photo && (
        <span className="absolute top-1.5 right-2 rounded-full bg-black/40 px-1.5 py-0.5 text-[8px] font-bold text-white">
          painted
        </span>
      )}
    </div>
  );
}
