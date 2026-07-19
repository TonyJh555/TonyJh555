"use client";

import { useEffect } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getWorker } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { matchScore } from "@/lib/matching";
import { inr } from "@/lib/format";
import { reviewsForWorker, useReviews } from "@/lib/reviews";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { useAwayMap, isAway, awayUntil } from "@/lib/availability";
import { recordWorkerView } from "@/lib/recently-viewed";
import { Avatar, BackLink, Card, Stars, Tag } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

export default function WorkerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const allReviews = useReviews();
  const favorites = useFavorites();

  // Remember this profile for the home "Recently viewed" row.
  useEffect(() => {
    if (getWorker(id)) recordWorkerView(id);
  }, [id]);

  const worker = getWorker(id);
  if (!worker) notFound();

  const category = getCategory(worker.categoryId);
  const reviews = reviewsForWorker(allReviews, worker.id);
  const isFavorite = favorites.includes(worker.id);
  const awayMap = useAwayMap();
  const away = isAway(awayMap, worker.id);
  const backOn = away
    ? new Date(awayUntil(awayMap, worker.id)!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  // Ratings histogram: the worker's verified history (reviewCount, centred on
  // their rating) plus any live KAAM reviews, so the 5→1 bars look real.
  const dist = [0, 0, 0, 0, 0];
  const weights = [1, 2, 3, 4, 5].map((s) => Math.max(0.03, 1 - Math.abs(s - worker.rating) * 0.85));
  const wsum = weights.reduce((a, b) => a + b, 0);
  weights.forEach((w, i) => (dist[i] = Math.round(worker.reviewCount * (w / wsum))));
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1] += 1;
  });
  const histo = [5, 4, 3, 2, 1].map((star) => ({ star, count: dist[star - 1] }));
  const totalReviews = dist.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...histo.map((h) => h.count));
  const reviewPhotos = reviews.flatMap((r) => r.photos);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app" />
        <h1 className="flex-1 font-display text-lg font-bold">Worker Profile</h1>
        <button
          onClick={async () => {
            const text = `${worker.name} — ${category.label} on KAAM ⭐ ${worker.rating} (${worker.reviewCount} reviews), KYC-verified. Book: ${window.location.origin}/app/worker/${worker.id}`;
            try {
              if (navigator.share) await navigator.share({ text });
              else await navigator.clipboard.writeText(text);
            } catch {
              /* user cancelled */
            }
          }}
          aria-label="Share this worker"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-lg shadow-card"
        >
          📤
        </button>
        <button
          onClick={() => toggleFavorite(worker.id)}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg shadow-card ${
            isFavorite ? "border-kaam-mid bg-kaam-light" : "border-line bg-white"
          }`}
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>
      </header>

      <Card className="fade-up mb-4">
        <div className="flex items-start gap-4">
          <Avatar initials={worker.initials} size={64} online={worker.online} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">
              {worker.name} {worker.verified && "✅"}
            </p>
            <p className="text-sm text-mid">
              {category.icon} {category.label} · {worker.city}
            </p>
            <div className="mt-1">
              <Stars rating={worker.rating} size={15} />
              <span className="ml-1 text-xs text-dim">({worker.reviewCount} reviews)</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Jobs done", value: worker.jobsDone.toLocaleString("en-IN") },
            { label: "Experience", value: `${worker.experienceYears} yrs` },
            { label: "Match score", value: `${matchScore(worker)}/100` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-surf p-2.5">
              <p className="font-display text-sm font-extrabold">{stat.value}</p>
              <p className="text-[10px] font-semibold text-mid">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="fade-up mb-4">
        <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">About</p>
        <p className="text-sm leading-relaxed text-ink">{worker.bio}</p>
        <p className="mt-3 mb-2 text-xs font-bold tracking-wide text-dim uppercase">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {worker.skills.map((skill) => (
            <Tag key={skill} color="blue">
              {skill}
            </Tag>
          ))}
        </div>
        <p className="mt-3 mb-2 text-xs font-bold tracking-wide text-dim uppercase">
          Trust & Safety
        </p>
        <div className="flex flex-wrap gap-1.5">
          {worker.badges.map((badge) => (
            <Tag key={badge} color="green">
              {badge}
            </Tag>
          ))}
          {worker.surge && <Tag color="yellow">⚡ Surge pricing active ×1.2</Tag>}
        </div>
        {worker.social &&
          (worker.social.instagram ||
            worker.social.youtube ||
            worker.social.facebook ||
            worker.social.website) && (
            <>
              <p className="mt-3 mb-2 text-xs font-bold tracking-wide text-dim uppercase">
                See their work
              </p>
              <div className="flex flex-wrap gap-2">
                {worker.social.instagram && (
                  <a
                    href={`https://instagram.com/${worker.social.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surf px-3 py-2 text-xs font-bold text-ink"
                  >
                    📸 Instagram
                  </a>
                )}
                {worker.social.youtube && (
                  <a
                    href={`https://youtube.com/${worker.social.youtube.startsWith("@") ? worker.social.youtube : worker.social.youtube.replace(/^https?:\/\/(www\.)?youtube\.com\//, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surf px-3 py-2 text-xs font-bold text-ink"
                  >
                    ▶️ YouTube
                  </a>
                )}
                {worker.social.facebook && (
                  <a
                    href={worker.social.facebook.startsWith("http") ? worker.social.facebook : `https://facebook.com/${worker.social.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surf px-3 py-2 text-xs font-bold text-ink"
                  >
                    👍 Facebook
                  </a>
                )}
                {worker.social.website && (
                  <a
                    href={worker.social.website.startsWith("http") ? worker.social.website : `https://${worker.social.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surf px-3 py-2 text-xs font-bold text-ink"
                  >
                    🌐 Website
                  </a>
                )}
              </div>
            </>
          )}
      </Card>

      <Card className="fade-up mb-28">
        <p className="mb-3 text-xs font-bold tracking-wide text-dim uppercase">Customer reviews</p>

        {/* Ratings summary + histogram */}
        <div className="mb-4 flex items-center gap-4">
          <div className="shrink-0 text-center">
            <p className="font-display text-4xl font-extrabold text-ink">{worker.rating.toFixed(1)}</p>
            <Stars rating={worker.rating} size={13} />
            <p className="mt-0.5 text-[10px] text-dim">{totalReviews.toLocaleString("en-IN")} ratings</p>
          </div>
          <div className="flex-1">
            {histo.map((h) => (
              <div key={h.star} className="mb-0.5 flex items-center gap-2">
                <span className="w-6 shrink-0 text-[11px] font-semibold text-mid">{h.star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surf">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(h.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-dim">
                  {h.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Photo gallery from reviews */}
        {reviewPhotos.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">
              📸 Photos from customers
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {reviewPhotos.map((p, i) => (
                <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="Customer photo" className="h-20 w-20 rounded-xl border border-line object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-xs text-mid">
            No reviews on KAAM yet — {worker.reviewCount} verified ratings from before.
            Be the first to review after your booking!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-line pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{review.customerName}</p>
                  <span className="text-amber-500">
                    {"★".repeat(review.rating)}
                    <span className="text-line">{"★".repeat(5 - review.rating)}</span>
                  </span>
                </div>
                {review.text && <p className="mt-1 text-xs text-mid">{review.text}</p>}
                {review.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {review.photos.map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="Review" className="h-16 w-16 rounded-lg border border-line object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="fixed bottom-20 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-pop">
          <div className="flex-1">
            <p className="font-display text-lg font-extrabold text-kaam">
              {inr(worker.rate)}
              <span className="text-xs font-semibold text-mid">/{worker.unit}</span>
            </p>
            <p className="text-[10px] text-dim">
              ⏱ Arrives in ~{worker.etaMinutes} min · {worker.distanceKm} km {t.away}
            </p>
          </div>
          {away ? (
            <span className="rounded-xl border border-warn-mid bg-warn-light px-6 py-3 text-center text-xs font-bold text-warn">
              🌴 Away until {backOn}
            </span>
          ) : (
            <Link
              href={`/app/book/${worker.id}`}
              className="rounded-xl bg-kaam px-8 py-3 text-sm font-bold text-white shadow-kaam transition-opacity hover:opacity-90"
            >
              {t.bookNow}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
