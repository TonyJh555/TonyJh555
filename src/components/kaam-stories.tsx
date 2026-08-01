"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isUploaded } from "@/lib/banner-image";
import { useContent } from "@/lib/content";
import { STORY_IMAGES } from "@/lib/story-manifest";
import { useLanguage } from "@/components/language-provider";

/**
 * KAAM Stories — the emotional heart of the home. A slow, cinematic carousel
 * of the lives KAAM touches: elderly parents cared for while their children are
 * away, homes that simply work, and — just as important — the workers whose
 * families thrive because of every job. Each closes on the same feeling: this
 * happiness is because of KAAM. 💚
 *
 * Every story renders a photograph when one exists at its `image` path, and
 * falls back to the painted gradient scene when it doesn't. That means real
 * images can be added one at a time — drop a file into /public/stories and it
 * appears; the home screen never breaks waiting for the full set.
 *
 * See docs/BANNER-IMAGES.md for the sizes, the safe area the text sits in, and
 * a prompt per story.
 */

export interface Story {
  href: string;
  /**
   * Name of this story's photograph in /public/stories, without an extension.
   * Any image format is accepted — whatever your export produces. When no
   * matching file exists the painted scene below is used instead, so a
   * half-finished set still looks deliberate.
   */
  image?: string;
  /** What the photo shows — read aloud by screen readers. */
  alt?: string;
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
  /** A picture uploaded in the admin console, stored as a data URL. */
  upload?: string;
  /** Turned off in the admin console — kept, but not shown. */
  hidden?: boolean;
}

/** Where the editable copy of the banners lives (see src/lib/content.ts). */
export const BANNERS_KEY = "home.banners";

/** The built-in banners. Editing them in the admin console overrides this. */
export const DEFAULT_STORIES: Story[] = [
  {
    // The Kerala NRI heart: children away, parents cared for at home.
    href: "/app/search?cat=eldercare",
    image: "elder-care",
    alt: "An older Malayali couple at home with a KAAM caretaker beside them",
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
    image: "happy-home",
    alt: "A Kerala family at home, relaxed, while work is done around them",
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
    image: "worker-family",
    alt: "A KAAM worker at home with their family, proud after a day's work",
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
    image: "from-afar",
    alt: "A son abroad on a video call with his mother in Kerala",
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

/** The file in /public/stories whose name matches, whatever its extension. */
function storyPhoto(name: string): string | undefined {
  return STORY_IMAGES.find((p) => {
    const file = p.slice(p.lastIndexOf("/") + 1);
    return file.slice(0, file.lastIndexOf(".")).toLowerCase() === name.toLowerCase();
  });
}

const INTERVAL_MS = 5000;

export function KaamStories() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [i, setI] = useState(0);
  // A file removed after the build still falls back rather than showing a
  // broken frame. Declared here so the hook order never changes.
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  // Whatever the owner has saved in the admin console, else the built-ins.
  const saved = useContent<Story[]>(BANNERS_KEY, DEFAULT_STORIES);
  const stories = (Array.isArray(saved) ? saved : DEFAULT_STORIES).filter((x) => !x.hidden);
  const count = stories.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % count), INTERVAL_MS);
    return () => clearInterval(t);
  }, [count]);

  if (count === 0) return null;
  // The saved set can shrink while the carousel is mid-rotation; clamp on the
  // way out rather than in an effect, so there's never a frame of nothing.
  const idx = i < count ? i : 0;

  const s = stories[idx];
  // STORY_IMAGES is generated at build time from what's actually in
  // public/stories, so the browser never requests a photo that isn't there.
  // An uploaded picture wins over a file in the repo, and either beats the
  // painted scene.
  const found = s.upload ?? (s.image ? storyPhoto(s.image) : undefined);
  const photo = found && !missing[found] ? found : undefined;
  // Over a photograph the text needs its own contrast, and always in white.
  const text = photo ? "text-white" : s.dark ? "text-ink" : "text-white";
  const sub = photo ? "text-white/90" : s.dark ? "text-ink/70" : "text-white/85";

  return (
    <section className="mb-5">
      <Link
        href={s.href}
        aria-label={s.en}
        className="relative block h-60 overflow-hidden rounded-[28px] shadow-[0_18px_44px_rgba(10,40,30,0.32)]"
      >
        {/* Painted scene — key remounts on change so each story fades in fresh */}
        <div key={idx} className="animate-story-pop absolute inset-0">
          <div className="absolute inset-0" style={{ background: s.gradient }} />

          {photo && (
            <>
              {isUploaded(photo) ? (
                // Uploaded pictures are data URLs, which Next's image
                // optimiser can't process — and don't need it, since they
                // were already cropped and compressed on the way in.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={s.alt ?? ""}
                  className="animate-ken-burns absolute inset-0 h-full w-full object-cover"
                  onError={() => setMissing((m) => ({ ...m, [photo]: true }))}
                />
              ) : (
                <Image
                  src={photo}
                  alt={s.alt ?? ""}
                  fill
                  priority={idx === 0}
                  sizes="(max-width: 430px) 100vw, 430px"
                  className="animate-ken-burns object-cover"
                  onError={() => setMissing((m) => ({ ...m, [photo]: true }))}
                />
              )}
              {/* Keeps the words readable over any photograph. */}
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.34)_38%,rgba(0,0,0,0.06)_72%,transparent_100%)]" />
            </>
          )}

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

          {/* The painted scene — only when there's no photograph. */}
          {!photo && (
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
          )}

          {/* Words */}
          <div className="relative flex h-full flex-col justify-end p-5">
            <p className={`text-[10px] font-bold tracking-[0.18em] uppercase ${sub}`}>
              ✦ {ml ? s.overlineMl : s.overlineEn}
            </p>
            {/* Smaller over a photograph: the picture is carrying the feeling, so
              four lines of extrabold display type on top of it just hides the
              faces that made it worth using. */}
          <p className={`mt-1 font-display leading-snug font-extrabold ${photo ? "text-base max-w-[88%]" : "text-lg max-w-[80%]"} ${text}`}>
              {ml ? s.ml : s.en}
            </p>
            <p className={`mt-1 text-[11px] leading-relaxed ${photo ? "max-w-[92%]" : "max-w-[78%]"} ${sub}`}>
              {ml ? s.en : s.ml}
            </p>
            <span
              className={`mt-3 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                !photo && s.dark ? "bg-ink text-white" : "bg-white/20 text-white backdrop-blur"
              }`}
            >
              {s.cta} →
            </span>
          </div>
        </div>
      </Link>

      {/* Progress dots — tap to jump */}
      <div className="mt-2.5 flex justify-center gap-1.5">
        {stories.map((_, dot) => (
          <button
            key={dot}
            onClick={() => setI(dot)}
            aria-label={`Story ${dot + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              dot === idx ? "w-6 bg-kaam" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
