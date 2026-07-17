"use client";

import Link from "next/link";
import { categoriesInGroup, GROUPS } from "@/data/categories";
import { WORKERS } from "@/data/workers";
import { rankWorkers } from "@/lib/matching";
import { WorkerCard } from "@/components/worker-card";
import { SectionTitle } from "@/components/ui";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { PromoBanners } from "@/components/promo-banners";
import { KaamWordmark } from "@/components/logo";
import { HomeHero } from "@/components/home-hero";
import { useCustomer } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";

export default function UserHome() {
  const { t } = useLanguage();
  const customer = useCustomer();
  const favorites = useFavorites();
  const favoriteWorkers = WORKERS.filter((w) => favorites.includes(w.id));
  const nearby = rankWorkers(WORKERS).slice(0, 4);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-mid">
            {t.greeting}
            {customer ? `, ${customer.name.split(" ")[0]}` : ""} 👋
          </p>
          <KaamWordmark size={30} malayalam />
          <p className="mt-0.5 text-[11px] text-dim">📍 Kochi, Kerala</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LanguageSwitcher />
          <Link
            href="/app/account"
            className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-ink shadow-card"
          >
            {customer ? (
              <>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-kaam text-[10px] text-white">
                  {customer.name[0]?.toUpperCase()}
                </span>
                Account
              </>
            ) : (
              <>👤 Login</>
            )}
          </Link>
        </div>
      </header>

      <HomeHero />

      <Link
        href="/app/search"
        className="mb-5 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dim shadow-card"
      >
        🔍 {t.searchPlaceholder}
      </Link>

      {/* Emotional wedge — Kerala's NRI families caring from afar */}
      <Link
        href="/app/search?cat=eldercare"
        className="mb-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-kasavu-line bg-[linear-gradient(135deg,#fffdf5,#f5ecd7)] p-4 shadow-card"
      >
        <span className="text-3xl">🌍</span>
        <span className="flex-1">
          <span className="block font-display text-sm font-extrabold text-kerala-green-dark">
            Away from home? We&apos;ll care for your family here.
          </span>
          <span className="block text-[11px] text-mid">
            Book a verified nurse, cook or helper for your parents in Kerala — pay &amp; track from
            anywhere in the world.
          </span>
        </span>
        <span className="text-lg text-gold">→</span>
      </Link>

      <PromoBanners />

      {favoriteWorkers.length > 0 && (
        <section className="mb-6">
          <SectionTitle>❤️ Your favorites</SectionTitle>
          <div className="flex flex-col gap-3">
            {favoriteWorkers.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-2">
        <SectionTitle>{t.findWorker}</SectionTitle>
        {GROUPS.map((group) => (
          <div key={group.id} className="mb-5">
            <p className="mb-2 text-xs font-bold text-mid">
              {group.icon} {group.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {categoriesInGroup(group.id).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/app/search?cat=${cat.id}`}
                  className="fade-up flex flex-col items-center gap-1 rounded-2xl border border-line bg-white p-2.5 text-center shadow-card transition-shadow hover:shadow-pop"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[10px] leading-tight font-bold text-ink">{cat.label}</span>
                  <span className="text-[9px] text-dim">₹{cat.basePrice}+</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/app/search" className="text-xs font-bold text-kaam">
              {t.viewAll} →
            </Link>
          }
        >
          {t.nearby}
        </SectionTitle>
        <div className="flex flex-col gap-3">
          {nearby.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
          ))}
        </div>
      </section>
    </main>
  );
}
