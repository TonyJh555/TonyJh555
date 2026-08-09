"use client";

import Link from "next/link";
import type { Worker } from "@/lib/types";
import { categoryLabel, getCategory } from "@/data/categories";
import { inr } from "@/lib/format";
import { workerTier } from "@/lib/pro-tiers";
import { priceModelForCategory } from "@/lib/price-model";
import { useBookings } from "@/lib/bookings";
import { useAwayMap } from "@/lib/availability";
import { usePresence } from "@/lib/presence";
import { workerStatus } from "@/lib/worker-status";
import { earnedBadges } from "@/lib/badges";
import { useLanguage } from "@/components/language-provider";
import { Avatar, Card, Stars, Tag } from "./ui";
import { ProBadge } from "./pro-badge";
import { WorkerStatusDot } from "./worker-status-dot";

export function WorkerCard({ worker }: { worker: Worker }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const category = getCategory(worker.categoryId);
  const priceModel = priceModelForCategory(worker.categoryId);
  // Live availability — the customer picks the worker here, so they need to
  // know who can actually come before they pick.
  const status = workerStatus(worker, {
    presence: usePresence(),
    away: useAwayMap(),
    bookings: useBookings(),
  });
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
              {category.icon} {categoryLabel(category, ml)} · {worker.experienceYears} yrs · {worker.city}
            </p>
            <p className="mt-0.5">
              <WorkerStatusDot status={status} />
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={worker.rating} />
              <span className="text-[11px] text-dim">({worker.reviewCount})</span>
              <span className="text-[11px] font-semibold text-mid">
                📍 {worker.distanceKm} km · ⏱ {worker.etaMinutes} min
              </span>
            </div>
            {/*
              Two badges, not five.

              This card already carries the rating, the review count, the
              distance, the ETA and the price — five facts a customer can
              actually use. Stacking "Platinum Pro", a surge tag, "ID verified"
              and "Top rated" on top of them buried the useful ones under
              vocabulary KAAM invented, and a first-time customer has no way to
              rank a Diamond against a Gold.

              Surge always shows when it applies, because it changes the price.
              Otherwise the two most meaningful earned badges, then the tier —
              which is mostly a worker-side motivation and comes last.
            */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {worker.surge && <Tag color="yellow">⚡ Surge ×1.2</Tag>}
              {earnedBadges(worker)
                .slice(0, worker.surge ? 1 : 2)
                .map((b) => (
                  <Tag key={b.label} color="green">
                    {ml ? b.labelMl : b.label}
                  </Tag>
                ))}
              {earnedBadges(worker).length === 0 && !worker.surge && (
                <ProBadge tierId={workerTier(worker).id} />
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
