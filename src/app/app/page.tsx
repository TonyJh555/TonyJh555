"use client";

import Link from "next/link";
import { categoriesInGroup, getCategory, GROUPS } from "@/data/categories";
import { WORKERS, getWorker } from "@/data/workers";
import { useRecentlyViewed } from "@/lib/recently-viewed";
import { rankByProximity } from "@/lib/matching";
import { useSearchLocation } from "@/lib/location";
import { WorkerCard } from "@/components/worker-card";
import { SectionTitle } from "@/components/ui";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { PromoBanners } from "@/components/promo-banners";
import { KaamWordmark } from "@/components/logo";
import { HomeHero } from "@/components/home-hero";
import { LocationBar } from "@/components/location-bar";
import { useCustomer } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { useBookings } from "@/lib/bookings";
import { useChatMessages } from "@/lib/chat";
import { useLastSeen } from "@/lib/seen";
import { applyPresence, usePresence } from "@/lib/presence";

export default function UserHome() {
  const { t } = useLanguage();
  const customer = useCustomer();
  const favorites = useFavorites();
  const favoriteWorkers = WORKERS.filter((w) => favorites.includes(w.id));
  const location = useSearchLocation();
  const presence = usePresence();
  const bookings = useBookings();
  const messages = useChatMessages();
  const lastSeen = useLastSeen();
  const myIds = new Set(
    bookings.filter((b) => (customer ? b.customerId === customer.id : !b.customerId)).map((b) => b.id),
  );
  const unread = messages.filter(
    (m) => myIds.has(m.bookingId) && m.sender !== "user" && m.createdAt > lastSeen,
  ).length;

  const viewed = useRecentlyViewed()
    .map((id) => getWorker(id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w))
    .slice(0, 8);

  // "Book again" — the customer's most recent distinct workers on completed jobs.
  const rebook = (() => {
    const seen = new Set<string>();
    const out: typeof bookings = [];
    const mine = bookings
      .filter((b) => (customer ? b.customerId === customer.id : !b.customerId) && b.status === "completed")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const b of mine) {
      if (seen.has(b.workerId)) continue;
      seen.add(b.workerId);
      out.push(b);
      if (out.length >= 8) break;
    }
    return out;
  })();
  const nearby = rankByProximity(applyPresence(WORKERS, presence), location.coords).slice(0, 4);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-mid">
            {t.greeting}
            {customer ? `, ${customer.name.split(" ")[0]}` : ""} 👋
          </p>
          <KaamWordmark size={30} malayalam />
          <p className="mt-0.5 text-[11px] text-dim">📍 {location.label}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/app/notifications"
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-sm shadow-card"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-kaam px-1 text-[9px] font-extrabold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <LanguageSwitcher />
          </div>
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

      {/* Book again — one-tap reorder of workers you've used */}
      {rebook.length > 0 && (
        <section className="mb-5">
          <SectionTitle>🔁 Book again</SectionTitle>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {rebook.map((b) => {
              const cat = getCategory(b.categoryId);
              const initials = b.workerName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <Link
                  key={b.workerId}
                  href={`/app/book/${b.workerId}`}
                  className="flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-3 text-center shadow-card"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kaam text-sm font-extrabold text-white">
                    {initials}
                  </span>
                  <span className="w-full truncate text-[11px] font-bold text-ink">
                    {b.workerName.split(" ")[0]}
                  </span>
                  <span className="w-full truncate text-[10px] text-dim">
                    {cat.icon} {cat.label}
                  </span>
                  <span className="text-[10px] font-bold text-kaam">Rebook →</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently viewed — pick up where you left off */}
      {viewed.length > 0 && (
        <section className="mb-5">
          <SectionTitle>👀 Recently viewed</SectionTitle>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {viewed.map((w) => {
              const cat = getCategory(w.categoryId);
              return (
                <Link
                  key={w.id}
                  href={`/app/worker/${w.id}`}
                  className="flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-3 text-center shadow-card"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kerala-green text-sm font-extrabold text-white">
                    {w.initials}
                  </span>
                  <span className="w-full truncate text-[11px] font-bold text-ink">
                    {w.name.split(" ")[0]}
                  </span>
                  <span className="w-full truncate text-[10px] text-dim">
                    {cat.icon} ⭐ {w.rating}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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

      {/* Care Plans — subscribe & save for long-running help */}
      <Link
        href="/app/search?cat=eldercare"
        className="mb-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-good-mid bg-[linear-gradient(135deg,#f0fdf4,#e6faf0)] p-4 shadow-card"
      >
        <span className="text-3xl">♻️</span>
        <span className="flex-1">
          <span className="block font-display text-sm font-extrabold text-kerala-green-dark">
            Care Plans — subscribe &amp; save up to 20%
          </span>
          <span className="block text-[11px] text-mid">
            Monthly packages for nurses, maids, cooks, elder care &amp; lessons. Same trusted worker,
            one fixed price, cancel anytime.
          </span>
        </span>
        <span className="text-lg text-good">→</span>
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
        <div className="mb-3">
          <LocationBar />
        </div>
        <div className="flex flex-col gap-3">
          {nearby.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
          ))}
        </div>
      </section>
    </main>
  );
}
