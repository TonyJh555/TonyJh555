import Link from "next/link";
import type { ReactNode } from "react";

/** Small shared presentational primitives used across all three surfaces. */

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#C41E3A,#FF5C7A)",
  "linear-gradient(135deg,#15803D,#34D399)",
  "linear-gradient(135deg,#1D4ED8,#38BDF8)",
  "linear-gradient(135deg,#7C3AED,#F472B6)",
  "linear-gradient(135deg,#B45309,#FCD34D)",
  "linear-gradient(135deg,#0F766E,#5EEAD4)",
];

export function Avatar({
  initials,
  size = 44,
  online,
}: {
  initials: string;
  size?: number;
  online?: boolean;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center font-extrabold text-white shadow-sm"
      style={{
        width: size,
        height: size,
        borderRadius: Math.floor(size / 3.5),
        background: AVATAR_GRADIENTS[initials.charCodeAt(0) % AVATAR_GRADIENTS.length],
        fontSize: size > 55 ? 18 : size > 38 ? 15 : 13,
      }}
    >
      {initials}
      {online !== undefined && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-red-500"}`}
          style={{ width: Math.max(10, size * 0.22), height: Math.max(10, size * 0.22) }}
        />
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  // A caller asking for its own background must actually get it. `bg-white`
  // and `bg-ink` are both plain utilities, so which one wins is decided by the
  // order Tailwind emits them, not by the order they are written here — and
  // white was winning. The worker's "Today" card has been white text on a
  // white background: earnings, jobs done and time online, all invisible.
  const ownsBackground = /(^|\s)bg-/.test(className);
  return (
    <div
      className={`rounded-2xl border border-line ${
        ownsBackground ? "" : "bg-white"
      } p-4 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span role="img" aria-label={`${rating} stars`} className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size }} className={i <= Math.round(rating) ? "text-amber-500" : "text-line"}>
          ★
        </span>
      ))}
      {/* The score itself never drops below the app's readable floor. */}
      <span className="ml-1 font-bold text-mid" style={{ fontSize: Math.max(13, size) }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

const TAG_STYLES = {
  gray: "bg-surf text-mid border-line",
  red: "bg-kaam-light text-kaam border-kaam-mid",
  green: "bg-good-light text-good border-good-mid",
  blue: "bg-info-light text-info border-info-mid",
  yellow: "bg-warn-light text-warn border-warn-mid",
} as const;

export function Tag({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: keyof typeof TAG_STYLES;
}) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${TAG_STYLES[color]}`}>
      {children}
    </span>
  );
}

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-mid shadow-card"
    >
      ←
    </Link>
  );
}

/** Shimmering placeholder bar for loading states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surf ${className}`} />;
}

/** A worker-card-shaped loading placeholder. */
export function WorkerCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Skeleton className="h-13 w-13 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="mb-2 h-3.5 w-2/3" />
          <Skeleton className="mb-2 h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}
