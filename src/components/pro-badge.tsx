import { PRO_TIERS, type ProTierId } from "@/lib/pro-tiers";

/**
 * The KAAM Pro badge — the visible payoff of the recognition program.
 * Rendered wherever a worker appears (cards, profiles, portal) so an earned
 * tier travels with them. Rising (the starting tier) shows nothing: the badge
 * only exists once it means something.
 */
export function ProBadge({ tierId, className = "" }: { tierId: ProTierId; className?: string }) {
  if (tierId === "rising") return null;
  const tier = PRO_TIERS.find((t) => t.id === tierId);
  if (!tier) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${className}`}
      style={{ background: tier.color }}
      title={`${tier.name} — earned with genuine customer ratings`}
    >
      {tier.emoji} {tier.name}
    </span>
  );
}
