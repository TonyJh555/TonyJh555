"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

/**
 * KAAM Stories — the emotional heart of the home. A slow, cinematic carousel
 * of the lives KAAM touches: elderly parents cared for while their children are
 * away, homes that simply work, and — just as important — the workers whose
 * families thrive because of every job. Warm painted gradients, floating light
 * and gentle motion (no external images — CSP-safe and instant to load), each
 * closing on the same feeling: this happiness is because of KAAM. 💚
 */

interface Story {
  href: string;
  gradient: string;
  /** Big central motif + a couple of floating accents that make the scene. */
  hero: string;
  floats: string[];
  /** Warm glow colour behind the hero motif. */
  glow: string;
  overlineMl: string;
  overlineEn: string;
  ml: string;
  en: string;
  cta: string;
  /** Dark text for light (gold) backgrounds. */
  dark?: boolean;
}

const STORIES: Story[] = [
  {
    // The Kerala NRI heart: children away, parents cared for at home.
    href: "/app/search?cat=eldercare",
    gradient: "linear-gradient(150deg,#0a4d37 0%,#0f6e4f 55%,#0c5a41 100%)",
    hero: "🧓",
    floats: ["❤️", "🩺", "🌴"],
    glow: "#e8b923",
    overlineMl: "കാം ഉള്ളതുകൊണ്ട്",
    overlineEn: "because of KAAM",
    ml: "അച്ഛനും അമ്മയും ഒരിക്കലും ഒറ്റയ്ക്കല്ല",
    en: "Your parents are never alone — a verified caretaker beside them while you build your life away.",
    cta: "Book care for family",
  },
  {
    // A whole family, happy — the home simply works.
    href: "/app/search",
    gradient: "linear-gradient(150deg,#0b3b6f 0%,#1466b8 55%,#0d4f92 100%)",
    hero: "👨‍👩‍👧‍👦",
    floats: ["🔧", "🍲", "📚"],
    glow: "#7cc4ff",
    overlineMl: "കാം ഉള്ളതുകൊണ്ട്",
    overlineEn: "because of KAAM",
    ml: "വീട് സന്തോഷത്തിന്റെ കേന്ദ്രമാകുന്നു",
    en: "A home that simply works — plumber, cook, tutor, nurse, one tap away. More time for the people you love.",
    cta: "Explore services",
  },
  {
    // The other family KAAM lifts: the worker's.
    href: "/worker/signup",
    gradient: "linear-gradient(150deg,#e8b923 0%,#f0c948 50%,#c99700 100%)",
    hero: "👷",
    floats: ["👩‍👧‍👦", "💰", "🎓"],
    glow: "#fff3c4",
    overlineMl: "കാം ഉള്ളതുകൊണ്ട്",
    overlineEn: "because of KAAM",
    ml: "ഓരോ ജോലിയും ഒരു കുടുംബത്തിന്റെ സ്വപ്നം",
    en: "Every job feeds a dream. 85% of each rupee reaches the worker — steady income, a proud family, dignity in every hand.",
    cta: "Meet our workers",
    dark: true,
  },
  {
    // Distance dissolves — care from anywhere in the world.
    href: "/app/search?cat=eldercare",
    gradient: "linear-gradient(150deg,#3b1470 0%,#7b2ff2 50%,#c41e6d 100%)",
    hero: "🌍",
    floats: ["✈️", "👵", "💚"],
    glow: "#ff8fc7",
    overlineMl: "കാം ഉള്ളതുകൊണ്ട്",
    overlineEn: "because of KAAM",
    ml: "ദൂരം ഒരിക്കലും ഒരു തടസ്സമല്ല",
    en: "Miles apart, hearts at ease — pay for and track your family's care from anywhere in the world.",
    cta: "Care from afar",
  },
];

const INTERVAL_MS = 5000;

export function KaamStories() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % STORIES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const s = STORIES[i];
  const text = s.dark ? "text-ink" : "text-white";
  const sub = s.dark ? "text-ink/70" : "text-white/85";

  return (
    <section className="mb-5">
      <Link
        href={s.href}
        aria-label={s.en}
        className="relative block h-60 overflow-hidden rounded-[28px] shadow-[0_18px_44px_rgba(10,40,30,0.32)]"
      >
        {/* Painted scene — key remounts on change so each story fades in fresh */}
        <div key={i} className="animate-story-pop absolute inset-0">
          <div className="absolute inset-0" style={{ background: s.gradient }} />

          {/* Ken-burns glow behind the hero — slow cinematic drift */}
          <div
            className="animate-ken-burns absolute inset-0"
            style={{
              background: `radial-gradient(60% 55% at 72% 42%, ${s.glow}66 0%, transparent 62%)`,
            }}
          />
          {/* Ambient aurora blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="animate-aurora absolute -top-16 -left-10 h-48 w-48 rounded-full opacity-30 blur-2xl"
              style={{ background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)` }}
            />
            <div className="animate-aurora absolute -right-8 -bottom-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,#ffffff_0%,transparent_70%)] opacity-15 blur-2xl [animation-delay:-5s]" />
          </div>
          {/* Gold kasavu hairline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,#e8b923,transparent)]" />
          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-shine absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
          </div>
          {/* Legibility vignette on the left where the text sits */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.28)_0%,transparent_58%)]" />

          {/* The scene: big bobbing hero motif + floating accents */}
          <div className="pointer-events-none absolute inset-y-0 right-3 flex w-40 items-center justify-center select-none">
            <span
              className="absolute h-28 w-28 rounded-full blur-2xl"
              style={{ background: s.glow, opacity: 0.4 }}
            />
            <span className="animate-bob-soft relative text-[76px] leading-none drop-shadow-lg">
              {s.hero}
            </span>
            <span className="animate-drift-up absolute top-6 right-2 text-2xl">{s.floats[0]}</span>
            <span className="animate-drift-up absolute bottom-8 left-1 text-xl [animation-delay:-1.6s]">
              {s.floats[1]}
            </span>
            <span className="animate-drift-up absolute top-10 left-4 text-lg [animation-delay:-3.2s]">
              {s.floats[2]}
            </span>
          </div>

          {/* Words */}
          <div className="relative flex h-full flex-col justify-end p-5">
            <p className={`text-[10px] font-bold tracking-[0.18em] uppercase ${sub}`}>
              ✦ {ml ? s.overlineMl : s.overlineEn}
            </p>
            <p className={`mt-1 max-w-[80%] font-display text-lg leading-snug font-extrabold ${text}`}>
              {ml ? s.ml : s.en}
            </p>
            <p className={`mt-1 max-w-[78%] text-[11px] leading-relaxed ${sub}`}>
              {ml ? s.en : s.ml}
            </p>
            <span
              className={`mt-3 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                s.dark ? "bg-ink text-white" : "bg-white/20 text-white backdrop-blur"
              }`}
            >
              {s.cta} →
            </span>
          </div>
        </div>
      </Link>

      {/* Progress dots — tap to jump */}
      <div className="mt-2.5 flex justify-center gap-1.5">
        {STORIES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Story ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-6 bg-kaam" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
