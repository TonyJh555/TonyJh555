import type { CategoryId, GroupId } from "@/lib/types";

/**
 * Drawn icons for the service catalogue.
 *
 * The categories carry an emoji, which is right for a line of text — "⚡
 * Electrician · 3 yrs · Kochi" reads fine in a list. It is wrong for a wall of
 * tiles on the front page: emoji are drawn by the operating system, so the same
 * grid is flat outlines on one phone, glossy 3-D blobs on another and a plain
 * box where the font is missing. They cannot take the brand colour, they cannot
 * be sized to a grid, and a page built out of them looks assembled rather than
 * designed. That is the difference a stranger notices in the first second.
 *
 * So the shopfront gets real artwork: one stroked line drawing per service, on
 * a 24-unit grid, in `currentColor` so each sector can tint its own.
 *
 * The emoji stay everywhere else. Swapping thirty inline glyphs across the app
 * would be a large change for no gain — inline, next to a word, an emoji is
 * perfectly good.
 */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Every category's drawing, keyed the same as the catalogue. */
const PATHS: Record<CategoryId, React.ReactNode> = {
  // ── Maintenance & Repair ──────────────────────────────
  elec: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  plumb: (
    <>
      <path d="M4 8h6a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h4" />
      <rect x="2" y="5.5" width="3" height="5" rx="1" />
      <rect x="19" y="13.5" width="3" height="5" rx="1" />
    </>
  ),
  mech: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" />
  ),
  ac: (
    <>
      <rect x="2" y="5" width="20" height="7" rx="2" />
      <path d="M6 9h12" />
      <path d="M7 15c0 2 2 2 2 4M12 15c0 2 2 2 2 4M17 15c0 2 2 2 2 4" />
    </>
  ),
  // A chunky mallet head, not a thin parallelogram — at 24px a slim angled
  // head reads as a pen nib, which is a different trade entirely.
  carp: (
    <>
      <path d="M12.8 2.2 21.8 11.2 18.6 14.4 9.6 5.4z" />
      <path d="M11.2 7 3 15.2V21h5.8l8.2-8.2" />
    </>
  ),
  painter: (
    <>
      <rect x="3" y="4" width="12" height="5" rx="1.5" />
      <path d="M15 6.5h3a2 2 0 0 1 2 2V11a2 2 0 0 1-2 2h-6a2 2 0 0 0-2 2v1" />
      <rect x="9" y="16" width="4" height="5" rx="1.5" />
    </>
  ),
  pest: (
    <>
      <path d="M8.5 4.5 10 6.5M15.5 4.5 14 6.5" />
      <rect x="7" y="6.5" width="10" height="13" rx="5" />
      <path d="M7 10.5H3M7 14H3M7 17l-3 2M17 10.5h4M17 14h4M17 17l3 2" />
      <path d="M12 6.5v13" />
    </>
  ),
  cctv: (
    <>
      <path d="M3 9.2 15.6 5l1.8 5.4L4.8 14.6z" />
      <path d="m17.4 10.4 2.6-.9a1.5 1.5 0 0 0 .9-1.9l-.5-1.6" />
      <path d="M8 13.5 9.5 18" />
      <path d="M6.5 20.5h6" />
    </>
  ),
  ro: (
    <>
      <path d="M12 3s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.4 12 3 12 3z" />
      <path d="M9 13h6M10 16h4" />
    </>
  ),

  // ── Care & Health ─────────────────────────────────────
  nurse: (
    <>
      <path d="M6 3v5a4 4 0 0 0 8 0V3" />
      <path d="M4.5 3h3M12.5 3h3" />
      <path d="M10 12v2a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-1" />
      <circle cx="19" cy="11" r="2" />
    </>
  ),
  physio: (
    <>
      <circle cx="8" cy="4" r="2" />
      <path d="M8 6v6l-2 8M8 12l4 1 2 7M8 9h5" />
      <path d="M17.5 6a8 8 0 0 1 0 12" />
    </>
  ),
  babysitter: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M9.5 12h.01M14.5 12h.01" />
      <path d="M9.5 16a3.5 3.5 0 0 0 5 0" />
      <path d="M12 6c0-2 2-2 2-3.5" />
    </>
  ),
  maid: (
    <>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M12 17.8s-3.2-2.1-3.2-4.1a1.9 1.9 0 0 1 3.2-1.3 1.9 1.9 0 0 1 3.2 1.3c0 2-3.2 4.1-3.2 4.1z" />
    </>
  ),
  eldercare: (
    <>
      <circle cx="9.5" cy="4" r="2" />
      <path d="M9.5 6v6l-2 9M9.5 12l3 1 1 8" />
      <path d="M18 8.5V21M16 8.5a2 2 0 0 1 4 0" />
    </>
  ),

  // ── Art & Music ───────────────────────────────────────
  // The bow is what makes this a violin. Without it, a body-and-neck drawing
  // at 24px is indistinguishable from the guitar two tiles along.
  violin: (
    <>
      <ellipse cx="8.6" cy="15.4" rx="4.3" ry="5.5" transform="rotate(-32 8.6 15.4)" />
      <path d="M12.2 11.6 17.9 5.9M16.6 4.6l3.2 3.2" />
      <path d="M2.6 19.6 20 12" />
    </>
  ),
  piano: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 6v12M10 6v12M14 6v12M18 6v12" />
      <path d="M8 6.5v5M12 6.5v5M16 6.5v5" strokeWidth={2.6} />
    </>
  ),
  guitar: (
    <>
      <circle cx="8" cy="16" r="5.4" />
      <circle cx="8" cy="16" r="2" />
      <path d="M11.9 12.2 18.4 5.7M17 4.2 19.9 7.1" />
      <path d="M5.9 19.6h4.2" />
    </>
  ),
  singer: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3M9 21h6" />
    </>
  ),
  dance: (
    <>
      <circle cx="13.5" cy="4" r="2" />
      <path d="M13.5 6.2 11 10.5l3.2 2.7 1.3 7.8" />
      <path d="M11 10.5 6.5 12.6M14.2 13.2 9.5 20.5M13.8 8 19 6" />
    </>
  ),
  photo: (
    <>
      <path d="M3 8.5a2 2 0 0 1 2-2h2.2l1.4-2.2h6.8L16.8 6.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.8" />
    </>
  ),

  // ── Hospitality ───────────────────────────────────────
  cook: (
    <>
      <path d="M6.5 13a4 4 0 0 1-1-7.9A4 4 0 0 1 12 3.2a4 4 0 0 1 6.5 1.9 4 4 0 0 1-1 7.9z" />
      <path d="M6.5 13v6a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-6" />
      <path d="M6.5 17h11" />
    </>
  ),
  catering: (
    <>
      <path d="M3 17a9 9 0 0 1 18 0z" />
      <path d="M2 20h20" />
      <path d="M12 8V6.5" />
      <circle cx="12" cy="5" r="1.2" />
    </>
  ),
  events: (
    <>
      <path d="M10 12 3 7.5v9zM14 12l7-4.5v9z" />
      <rect x="9.6" y="9.4" width="4.8" height="5.2" rx="1.2" />
    </>
  ),

  // ── Beauty & Wellness ─────────────────────────────────
  beauty: (
    <>
      <rect x="8.8" y="9" width="6.4" height="12" rx="1" />
      <path d="M8.8 9V5.6a1 1 0 0 1 .7-1l3.6-1.4a1 1 0 0 1 1.3 1V9" />
      <path d="M8 15h8" />
    </>
  ),
  massage: (
    <>
      <path d="M3 16.5h18M5.5 16.5V20M18.5 16.5V20" />
      <circle cx="7" cy="12.5" r="2" />
      <path d="M9.2 13.5H18" />
      <path d="M11.5 9.5c1 1.2 2.4 1.2 3.4 0" />
    </>
  ),
  nails: (
    <>
      <rect x="7.5" y="11" width="9" height="10" rx="2" />
      <path d="M10 11V8h4v3" />
      <path d="M10.8 8V4.4h2.4V8" />
    </>
  ),
  mehendi: (
    <>
      <path d="M12 21c0-5.6 2.8-8.6 7.6-9.6C18.6 17 15.8 20 12 21z" />
      <path d="M12 21c0-5.6-2.8-8.6-7.6-9.6C5.4 17 8.2 20 12 21z" />
      <path d="M12 21V9.2" />
      <circle cx="12" cy="6" r="2.6" />
    </>
  ),
  hair: (
    <>
      <circle cx="6" cy="18" r="2.8" />
      <circle cx="18" cy="18" r="2.8" />
      <path d="M8.2 16.1 20 4M15.8 16.1 4 4" />
    </>
  ),
  makeup: (
    <>
      <path d="M11 2.8 13 8.6l5.8 2-5.8 2-2 5.8-2-5.8-5.8-2 5.8-2z" />
      <path d="M18.6 14.4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </>
  ),
  yoga: (
    <>
      <circle cx="12" cy="4.2" r="2" />
      <path d="M12 6.4v5.2" />
      <path d="M12 11.6c-3.2 0-5.4 2.1-5.4 4.3h10.8c0-2.2-2.2-4.3-5.4-4.3z" />
      <path d="M12 8.8 5.8 12.6M12 8.8l6.2 3.8" />
    </>
  ),

  // ── Everyday Services ─────────────────────────────────
  driver: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 14.8V21M9.3 11.2 3.2 9.5M14.7 11.2l6.1-1.7" />
    </>
  ),
  tutor: (
    <>
      <path d="M12 6.4C10.5 4.9 8 4.4 3 4.4v13c5 0 7.5.5 9 2 1.5-1.5 4-2 9-2v-13c-5 0-7.5.5-9 2z" />
      <path d="M12 6.4v13" />
    </>
  ),
  clean: (
    <>
      <path d="M9 3.2 10.5 7.5 14.8 9l-4.3 1.5L9 14.8 7.5 10.5 3.2 9l4.3-1.5z" />
      <path d="M17.6 13.2l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" />
      <path d="M3 20.5h8" />
    </>
  ),
  movers: (
    <>
      <path d="M3 7.8 12 3l9 4.8v8.4L12 21l-9-4.8z" />
      <path d="M3 7.8 12 12.6l9-4.8M12 12.6V21" />
    </>
  ),
};

/** The sector headings. Two reuse a service drawing on purpose. */
const GROUP_PATHS: Record<GroupId, React.ReactNode> = {
  maintenance: PATHS.mech,
  care: <path d="M12 20.5s-7.5-4.8-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 3c0 5.3-7.5 10.1-7.5 10.1z" />,
  art: (
    <>
      <circle cx="6.5" cy="18" r="3" />
      <circle cx="17.5" cy="16" r="3" />
      <path d="M9.5 18V6l11-2v12M9.5 9.5l11-2" />
    </>
  ),
  hospitality: PATHS.catering,
  wellness: PATHS.makeup,
  everyday: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
};

/**
 * The colour each sector wears.
 *
 * Six tints rather than one, so the catalogue can be read at a glance —
 * plumbing is blue, care is pink, music is violet — and so a page of thirty
 * tiles has some life in it. Written as whole class strings because that is
 * what Tailwind can see.
 */
export const GROUP_TINT: Record<GroupId, { chip: string; ink: string }> = {
  maintenance: { chip: "bg-[#eaf1ff]", ink: "text-[#2f5fd0]" },
  care: { chip: "bg-[#ffedf1]", ink: "text-[#c33b5e]" },
  art: { chip: "bg-[#f2ecff]", ink: "text-[#6b46c1]" },
  hospitality: { chip: "bg-[#fff2e3]", ink: "text-[#b3651b]" },
  wellness: { chip: "bg-[#fdecf7]", ink: "text-[#a83a86]" },
  everyday: { chip: "bg-[#e7f6ee]", ink: "text-[#12764c]" },
};

/**
 * The front page's own icons — the "how it works" steps and the promises.
 *
 * Same reason as the catalogue: a ⏱️ next to a drawn wrench is the one tile
 * that gives the page away.
 */
const PAGE_PATHS = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.4 15.4 21 21" />
    </>
  ),
  match: <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />,
  pay: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20M6 14.5h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  balance: (
    <>
      <path d="M12 3v18M7 21h10M4 7l8-2 8 2" />
      <path d="M4 7 1.5 13a2.5 2.5 0 0 0 5 0zM20 7l-2.5 6a2.5 2.5 0 0 0 5 0z" />
    </>
  ),
  star: <path d="m12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 17.1 6.4 20.2l1.3-6.3L3 9.6l6.3-.7z" />,
  shield: (
    <>
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10.5-4.6-1.9-8-5.5-8-10.5v-6z" />
      <path d="m8.8 11.8 2.2 2.2 4.2-4.2" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.2 14-1.2 8 5-3 5 3-1.2-8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
    </>
  ),
} as const;

export type PageIconId = keyof typeof PAGE_PATHS;

/** One of the front page's own drawings. */
export function PageIcon({ id, className }: { id: PageIconId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...S}>
      {PAGE_PATHS[id]}
    </svg>
  );
}

/** One service's drawing. Sized by the caller; coloured by `currentColor`. */
export function ServiceIcon({ id, className }: { id: CategoryId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...S}>
      {PATHS[id]}
    </svg>
  );
}

/** One sector's drawing. */
export function GroupIcon({ id, className }: { id: GroupId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...S}>
      {GROUP_PATHS[id]}
    </svg>
  );
}
