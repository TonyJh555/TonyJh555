/**
 * KAAM brand mark — a monogram "K" in a kasavu-bordered gradient badge.
 * Replaces the generic 🔨 emoji across the app. Pure SVG, scalable, crisp.
 */

export function KaamLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="KAAM logo"
    >
      <defs>
        <linearGradient id="kaamGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C41E3A" />
          <stop offset="1" stopColor="#FF4D6D" />
        </linearGradient>
      </defs>
      {/* badge */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#kaamGrad)" />
      {/* kasavu (temple-saree gold) inner border */}
      <rect x="3.4" y="3.4" width="41.2" height="41.2" rx="11.6" fill="none" stroke="#E8B923" strokeOpacity="0.6" strokeWidth="1.5" />
      {/* monogram K */}
      <g stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 13.5 V34.5" />
        <path d="M17 24.5 L29.5 13.5" />
        <path d="M17 23.5 L30.5 34.5" />
      </g>
      {/* gold spark — the 'service near you' accent */}
      <circle cx="33.5" cy="14.5" r="2.4" fill="#E8B923" />
    </svg>
  );
}

export function KaamWordmark({
  size = 32,
  malayalam = false,
  tone = "ink",
  className = "",
}: {
  size?: number;
  malayalam?: boolean;
  tone?: "ink" | "white";
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <KaamLogo size={size} />
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: size * 0.62, color: tone === "white" ? "#fff" : "var(--color-ink)" }}
        >
          KAAM
        </span>
        {malayalam && (
          <span
            className="font-display font-bold text-kerala-green"
            style={{ fontSize: Math.max(13, size * 0.44) }}
          >
            കാം
          </span>
        )}
      </span>
    </span>
  );
}
