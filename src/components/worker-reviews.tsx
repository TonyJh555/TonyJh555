"use client";

import { reviewsForWorker, useReviews } from "@/lib/reviews";
import { Card } from "@/components/ui";

/** What customers said — the worker's own feedback loop (motivating + honest). */
export function WorkerReviews({ workerId }: { workerId: string }) {
  const reviews = reviewsForWorker(useReviews(), workerId).slice(0, 6);

  return (
    <Card>
      <h3 className="mb-3 font-display text-sm font-bold">💬 What customers say</h3>
      {reviews.length === 0 ? (
        <p className="text-xs text-dim">
          No reviews yet on KAAM. Finish jobs and delight customers — their reviews show here and
          on your profile.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-line pb-3 last:border-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">{r.customerName}</p>
                <span className="text-amber-500">
                  {"★".repeat(r.rating)}
                  <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
              {r.tags && r.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {r.tags.map((t) => (
                    <span key={t} className="rounded-full bg-surf px-2 py-0.5 text-[10px] font-bold text-mid">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {r.text && <p className="mt-1 text-xs text-mid">{r.text}</p>}
              {r.photos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.photos.map((p, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={i} src={p} alt="Review" className="h-14 w-14 rounded-lg border border-line object-cover" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
