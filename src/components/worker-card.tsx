import Link from "next/link";
import type { Worker } from "@/lib/types";
import { getCategory } from "@/data/categories";
import { inr } from "@/lib/format";
import { workerTier } from "@/lib/pro-tiers";
import { priceModelForCategory } from "@/lib/price-model";
import { Avatar, Card, Stars, Tag } from "./ui";
import { ProBadge } from "./pro-badge";

export function WorkerCard({ worker }: { worker: Worker }) {
  const category = getCategory(worker.categoryId);
  const priceModel = priceModelForCategory(worker.categoryId);
  return (
    <Link href={`/app/worker/${worker.id}`} className="block">
      <Card className="fade-up transition-shadow hover:shadow-pop">
        <div className="flex items-start gap-3">
          <Avatar initials={worker.initials} size={52} online={worker.online} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-display text-sm font-bold">
                {worker.name} {worker.verified && <span title="Verified">✅</span>}
              </p>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-bold text-kaam">
                  {inr(worker.rate)}/{worker.unit}
                </span>
                <span className="block text-[9px] font-semibold text-dim">
                  {priceModel.icon} {priceModel.tag}
                </span>
              </span>
            </div>
            <p className="text-xs text-mid">
              {category.icon} {category.label} · {worker.experienceYears} yrs · {worker.city}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={worker.rating} />
              <span className="text-[11px] text-dim">({worker.reviewCount})</span>
              <span className="text-[11px] font-semibold text-mid">
                📍 {worker.distanceKm} km · ⏱ {worker.etaMinutes} min
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <ProBadge tierId={workerTier(worker).id} />
              {worker.surge && <Tag color="yellow">⚡ Surge ×1.2</Tag>}
              {worker.badges.slice(0, 2).map((b) => (
                <Tag key={b} color={b.includes("Police") ? "blue" : "green"}>
                  {b}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
