"use client";

import type { WorkerStatus } from "@/lib/worker-status";
import { useLanguage } from "@/components/language-provider";

/**
 * The availability dot — green free, amber on a job, grey offline or on
 * leave. Same idea as the presence dot in Teams or Slack, and here for the
 * same reason: you shouldn't message (or book) someone without knowing
 * whether they can answer.
 */
export function WorkerStatusDot({ status, showLabel = true }: { status: WorkerStatus; showLabel?: boolean }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden />
      {showLabel && (
        <span
          className={`text-[10px] font-bold ${
            status.id === "available" ? "text-good" : status.id === "busy" ? "text-warn" : "text-dim"
          }`}
        >
          {ml ? status.labelMl : status.label}
        </span>
      )}
      <span className="sr-only">{status.label}</span>
    </span>
  );
}

/** Fuller version for a profile/booking header: dot, label and what it means. */
export function WorkerStatusBanner({ status }: { status: WorkerStatus }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const tone =
    status.id === "available"
      ? "border-good-mid bg-good-light text-good"
      : status.id === "busy"
        ? "border-warn-mid bg-warn-light text-warn"
        : "border-line bg-surf text-mid";
  return (
    <div className={`mt-3 rounded-xl border p-2.5 text-[11px] leading-relaxed ${tone}`}>
      <p className="flex items-center gap-1.5 font-extrabold">
        <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden />
        {ml ? status.labelMl : status.label}
      </p>
      <p className="mt-0.5 opacity-90">{ml ? status.hintMl : status.hint}</p>
    </div>
  );
}
