"use client";

import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { WORKERS } from "@/data/workers";
import { rankWorkers } from "@/lib/matching";
import { WorkerCard } from "@/components/worker-card";
import { SectionTitle } from "@/components/ui";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";

export default function UserHome() {
  const { t } = useLanguage();
  const nearby = rankWorkers(WORKERS).slice(0, 4);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-mid">
            {t.greeting} 👋
          </p>
          <h1 className="font-display text-xl font-extrabold">
            KAAM <span className="text-kaam">🔨</span>
          </h1>
          <p className="text-[11px] text-dim">📍 Noida, Delhi NCR</p>
        </div>
        <LanguageSwitcher />
      </header>

      <Link
        href="/app/search"
        className="mb-5 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dim shadow-card"
      >
        🔍 {t.searchPlaceholder}
      </Link>

      <section className="mb-6">
        <SectionTitle>{t.findWorker}</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
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
