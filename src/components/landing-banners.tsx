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
      className="relative overflow-hidden bg-ink"
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
      {/* The track. One slide wide, six slides long, slid sideways. */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {banners.map((b, n) => (
          <Link
            key={b.photo}
            href={b.href}
            aria-hidden={n !== i}
            tabIndex={n === i ? 0 : -1}
            className="relative block h-[74vw] max-h-[430px] min-h-[300px] w-full shrink-0 sm:h-[430px] lg:h-[470px]"
          >
            {/* Two layouts, one photograph.
             *
             * On a phone the picture is the whole slide and the words sit over
             * its foot. On a wide screen it moves into its own column at close
             * to its natural shape, because stretching a 5:4 photograph across
             * a 2.5:1 band magnifies it until only two faces are left: the
             * uniform, the stethoscope and the blood-pressure cuff all crop
             * away, and a nurse and her patient start to read as a couple.
             */}
            {/* The bottom padding is what keeps the dots off the photograph:
                the row centres inside the reduced box, leaving a clear band. */}
            <div className="mx-auto grid h-full max-w-6xl items-center gap-8 sm:grid-cols-[1fr_1.05fr] sm:px-6 sm:pb-12">
              <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12 text-white sm:relative sm:inset-auto sm:z-auto sm:pb-0">
                <p className="font-display text-xl font-extrabold text-gold-bright sm:text-3xl">
                  {b.ml}
                </p>
                <p className="mt-0.5 font-display text-lg font-extrabold sm:text-2xl">{b.en}</p>
                <p className="mt-1 max-w-md text-sm text-white/85 sm:text-base">{b.body}</p>
                <span className="mt-3 inline-block rounded-xl bg-kaam px-5 py-2.5 text-sm font-bold shadow-kaam">
                  {b.cta} →
                </span>
              </div>

              <div className="absolute inset-0 sm:relative sm:inset-auto sm:h-[350px] sm:overflow-hidden sm:rounded-3xl lg:h-[390px]">
                <Image
                  src={b.photo}
                  alt={b.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 600px"
                  // The first is preloaded; the rest are fetched straight away
                  // rather than lazily. A lazy slide never enters the viewport
                  // by scrolling — it arrives by sliding — so it would pop in
                  // blank the moment the carousel reached it.
                  priority={n === 0}
                  loading={n === 0 ? undefined : "eager"}
                  className={`object-cover object-top ${n === i ? "animate-ken-burns" : ""}`}
                />
                {/* Only the phone needs a scrim: there the words lie on top of
                    the picture. On a wide screen they have their own space. */}
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.52)_30%,rgba(0,0,0,0.12)_58%,transparent_100%)] sm:hidden" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Dots — and the only controls, so they have to be real buttons. */}
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
        {banners.map((b, n) => (
          <button
            key={b.photo}
            onClick={() => go(n)}
            aria-label={`Show ${b.en}`}
            aria-current={n === i}
            className={`h-1.5 rounded-full transition-all ${
              n === i ? "w-7 bg-white" : "w-1.5 bg-white/45"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
