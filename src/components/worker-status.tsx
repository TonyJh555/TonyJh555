"use client";

import Link from "next/link";
import { Card, Tag } from "@/components/ui";
import { slaHoursLeft, type WorkerApplication } from "@/lib/applications";
import type { Worker } from "@/lib/types";
import { earnedBadges } from "@/lib/badges";
import { useLanguage } from "@/components/language-provider";

/**
 * Worker's own verification status + public profile. If this device submitted
 * an application, it shows the live approval decision (approved / pending /
 * rejected with reason). Otherwise it invites them to apply.
 */
export function WorkerStatus({
  worker,
  application,
}: {
  worker: Worker;
  application?: WorkerApplication;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  return (
    <div className="flex flex-col gap-4">
      {application ? (
        <Card>
          <p className="mb-2 text-[10px] font-bold tracking-wide text-dim uppercase">
            Your KAAM application
          </p>
          {application.status === "approved" && (
            <div className="rounded-xl border border-good-mid bg-good-light p-4 text-center">
              <p className="text-3xl">✅</p>
              <p className="mt-1 font-display text-lg font-extrabold text-good">You&apos;re verified!</p>
              <p className="mt-1 text-xs text-mid">
                Your documents were approved. Go online in the Jobs tab and start accepting work.
              </p>
            </div>
          )}
          {application.status === "pending" && (
            <div className="rounded-xl border border-warn-mid bg-warn-light p-4 text-center">
              <p className="text-3xl">⏳</p>
              <p className="mt-1 font-display text-lg font-extrabold text-warn">Under review</p>
              <p className="mt-1 text-xs text-mid">
                Our team is checking your KYC. Decision within{" "}
                <b>{slaHoursLeft(application)} hours</b>. We&apos;ll notify you.
              </p>
            </div>
          )}
          {application.status === "rejected" && (
            <div className="rounded-xl border border-kaam-mid bg-kaam-light p-4 text-center">
              <p className="text-3xl">❌</p>
              <p className="mt-1 font-display text-lg font-extrabold text-kaam">Not approved</p>
              {application.rejectReason && (
                <p className="mt-1 rounded-lg bg-white p-2 text-xs text-mid">
                  Reason: {application.rejectReason}
                </p>
              )}
              <Link
                href="/worker/signup"
                className="mt-3 inline-block rounded-xl bg-kaam px-6 py-2.5 text-xs font-bold text-white"
              >
                Fix &amp; re-apply →
              </Link>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[11px] text-mid">
            <span>Applied as {application.name}</span>
            <span>{application.city}</span>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-3xl">🪪</p>
          <p className="mt-1 text-sm font-bold">Not registered on this device</p>
          <p className="mt-1 text-xs text-mid">
            Sign up and upload your KYC to join KAAM. Approval within 24 hours.
          </p>
          <Link
            href="/worker/signup"
            className="mt-3 inline-block rounded-xl bg-kaam px-6 py-2.5 text-xs font-bold text-white"
          >
            Apply to work with KAAM →
          </Link>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-[10px] font-bold tracking-wide text-dim uppercase">Profile snapshot</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Rating", value: `⭐ ${worker.rating}` },
            { label: "Reviews", value: `${worker.reviewCount}` },
            { label: "Jobs done", value: worker.jobsDone.toLocaleString("en-IN") },
            { label: "Experience", value: `${worker.experienceYears} yr` },
            { label: "Accept rate", value: `${Math.round(worker.acceptRate * 100)}%` },
            { label: "City", value: worker.city },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surf p-2.5">
              <p className="font-display text-sm font-extrabold">{s.value}</p>
              <p className="text-[10px] font-semibold text-mid">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {earnedBadges(worker).map((b) => (
            <Tag key={b.label} color="green">{ml ? b.labelMl : b.label}</Tag>
          ))}
        </div>
      </Card>
    </div>
  );
}
