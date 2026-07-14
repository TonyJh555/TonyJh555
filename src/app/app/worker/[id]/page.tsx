"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getWorker } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { matchScore } from "@/lib/matching";
import { inr } from "@/lib/format";
import { Avatar, BackLink, Card, Stars, Tag } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

export default function WorkerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const worker = getWorker(id);
  if (!worker) notFound();

  const category = getCategory(worker.categoryId);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app" />
        <h1 className="font-display text-lg font-bold">Worker Profile</h1>
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
          <Link
            href={`/app/chat/enquiry-${worker.id}`}
            aria-label={`Chat with ${worker.name}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-info-mid bg-info-light text-lg"
          >
            💬
          </Link>
          <Link
            href={`/app/book/${worker.id}`}
            className="rounded-xl bg-kaam px-6 py-3 text-sm font-bold text-white shadow-kaam transition-opacity hover:opacity-90"
          >
            {t.bookNow}
          </Link>
        </div>
      </div>
    </main>
  );
}
