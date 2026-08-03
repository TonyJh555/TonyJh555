"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * The moving banner strip at the top of the front page.
 *
 * A grid of six photographs said the same thing as a grid of icons: here is a
 * list. A banner that moves says something a list cannot — that there is
 * always another kind of work, another person, another Kerala home. It is the
 * first thing a stranger sees, so it carries the pictures rather than the
 * prose.
 *
 * The slides really translate rather than cross-fading, because movement is
 * the point; the photograph drifts underneath at a different rate so the frame
 * never feels static between changes. It stops moving for anyone who has asked
 * their system for reduced motion, and it stops while a finger is on it.
 */

export interface Banner {
  photo: string;
  alt: string;
  ml: string;
  en: string;
  body: string;
  href: string;
  cta: string;
}

const ADVANCE_MS = 5000;

export function LandingBanners({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  const go = useCallback(
    (next: number) => setI(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || count < 2) return;
    // Anyone who has asked for less motion gets a still first frame rather
    // than a banner that moves on its own.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const t = setInterval(() => setI((x) => (x + 1) % count), ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What KAAM workers do"
      className="relative overflow-hidden bg-[linear-gradient(120deg,#062a1e_0%,#0a4d37_55%,#04211a_100%)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        // A deliberate swipe, not a tap that wandered a few pixels.
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      {/* The backdrop, on wide screens only.
       *
       * A 5:4 photograph in its own column leaves the rest of a 1440px band
       * empty, and empty reads as unfinished — a picture floating on black
       * looks like a layout that failed rather than one that was drawn. So the
       * band is filled by the same photograph, blurred past recognition: the
       * colour of the room the worker is standing in becomes the background of
       * the slide, and it changes as the slide changes. Nothing is cropped,
       * because nothing here is meant to be read.
       */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        {banners.map((b, n) => (
          <Image
            key={b.photo}
            src={b.photo}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            className={`scale-125 object-cover blur-2xl transition-opacity duration-700 ${
              n === i ? "opacity-45" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(4,26,19,0.95)_0%,rgba(4,26,19,0.86)_42%,rgba(4,26,19,0.58)_76%,rgba(4,26,19,0.42)_100%)]" />
      </div>

      {/* Kasavu gold, the same hairline the hero below wears. It closes the
          band at the top so the strip reads as part of the page, not as a
          black gap above it. */}
      <div className="absolute inset-x-0 top-0 z-20 h-1 bg-[linear-gradient(90deg,#c99700,#e8b923,#c99700)]" />

      {/* The track. One slide wide, six slides long, slid sideways. */}
      <div
        data-carousel-track
        className="relative flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {banners.map((b, n) => (
          <Link
            key={b.photo}
            href={b.href}
            aria-hidden={n !== i}
            tabIndex={n === i ? 0 : -1}
            // max-h caps the 74vw phone slide; it has to be released on wide
            // screens or it silently overrides the taller desktop band.
            //
            // The band grows with the viewport for one specific reason: the
            // picture takes a fixed share of the width, so a wider screen makes
            // it wider, and only a taller band keeps it near its own 5:4 shape.
            className="relative block h-[86vw] max-h-[440px] min-h-[340px] w-full shrink-0 sm:h-[460px] sm:max-h-none lg:h-[600px] xl:h-[660px]"
          >
            {/* One photograph, bled to the edge.
             *
             * The picture is not in a frame. A photograph in a rounded card,
             * floating on a coloured field, is what a page builder produces;
             * every app worth copying — Grab, Mrsool, Careem — runs its media
             * to the edge of the screen and sets the words straight on top.
             *
             * What it must not do is stretch. A 5:4 photograph pulled across a
             * 4:1 band magnifies until only two faces are left: the uniform,
             * the lanyard, the stethoscope and the blood-pressure cuff all crop
             * away, and a nurse with her patient starts to read as a couple. So
             * the picture takes the right 58% and the band grows taller as the
             * screen grows wider, which holds it near its own shape at every
             * size. It reaches the edge without being distorted to get there.
             */}
            {/* overflow-hidden matters: the slow zoom scales the photograph
                past its own box, and without a clip it spills left over the
                headline as a hard-edged sliver of undimmed picture.

                The mask is what removes the seam. Dimming alone could not:
                however dark the ramp, a sharp photograph and a blurred one
                still meet along a line, and the eye finds that line instantly.
                Fading the sharp copy out over its own blurred copy leaves
                nothing to meet — the picture simply stops being in focus. */}
            <div className="absolute inset-0 overflow-hidden sm:left-[42%] sm:[mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.55)_14%,#000_34%)]">
              <Image
                src={b.photo}
                alt={b.alt}
                fill
                sizes="(max-width: 640px) 100vw, 60vw"
                // The first is preloaded; the rest are fetched straight away
                // rather than lazily. A lazy slide never enters the viewport
                // by scrolling — it arrives by sliding — so it would pop in
                // blank the moment the carousel reached it.
                priority={n === 0}
                loading={n === 0 ? undefined : "eager"}
                className={`object-cover object-top ${n === i ? "animate-ken-burns" : ""}`}
              />
              {/* On a phone the words lie over the foot of the picture, so the
                  scrim rises from the bottom. It has to reach further up than
                  feels necessary: the block runs four lines plus a button, and
                  its top line lands around 40% of the way up the slide — right
                  where a gentler ramp has already given out and gold-on-daylight
                  stops being readable. */}
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.93)_0%,rgba(0,0,0,0.86)_26%,rgba(0,0,0,0.66)_46%,rgba(0,0,0,0.34)_66%,rgba(0,0,0,0.08)_86%,transparent_100%)] sm:hidden" />
            </div>

            {/* The wide-screen dim runs across the whole slide, not just the
                photograph.

                Scoped to the picture it produced a hard vertical seam: the ramp
                was at its darkest exactly where the photo began, with a lighter
                panel butted against it. One gradient over the full width has
                nothing to butt against, so the picture fades into the dark side
                continuously — and the headline stays legible where it crosses
                onto the image, which is where it is supposed to sit. */}
            <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(3,26,20,0.92)_0%,rgba(3,26,20,0.86)_36%,rgba(3,26,20,0.62)_52%,rgba(3,26,20,0.22)_70%,transparent_86%)] sm:block" />

            {/* The words. Set large and low, over the darkened side. */}
            <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12 text-white sm:inset-y-0 sm:flex sm:items-center sm:px-0 sm:pb-0">
              <div className="mx-auto w-full max-w-6xl sm:px-8">
                <div className="sm:max-w-[42%]">
                  <p className="font-display text-xl leading-[1.15] font-extrabold text-gold-bright sm:text-4xl lg:text-5xl">
                    {b.ml}
                  </p>
                  <p className="mt-1.5 font-display text-lg font-extrabold sm:text-xl lg:text-2xl">
                    {b.en}
                  </p>
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-white/85 sm:text-base lg:text-lg">
                    {b.body}
                  </p>
                  <span className="mt-4 inline-block rounded-xl bg-kaam px-5 py-2.5 text-sm font-bold shadow-kaam sm:mt-6 sm:px-7 sm:py-3.5 sm:text-base">
                    {b.cta} →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Dots — and the only controls, so they have to be real buttons.
          Centred under the picture on a phone; on a wide screen they line up
          with the left edge of the words, which is the difference between a
          row that was placed and a row that was left over. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 sm:bottom-9">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 sm:justify-start sm:px-8">
          {banners.map((b, n) => (
            <button
              key={b.photo}
              onClick={() => go(n)}
              aria-label={`Show ${b.en}`}
              aria-current={n === i}
              className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                n === i ? "w-7 bg-gold-bright" : "w-1.5 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
