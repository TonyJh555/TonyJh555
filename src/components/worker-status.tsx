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
            {ml ? "നിങ്ങളുടെ KAAM അപേക്ഷ" : "Your KAAM application"}
          </p>
          {application.status === "approved" && (
            <div className="rounded-xl border border-good-mid bg-good-light p-4 text-center">
              <p className="text-3xl">✅</p>
              <p className="mt-1 font-display text-lg font-extrabold text-good">
                {ml ? "പരിശോധിച്ചു ഉറപ്പിച്ചു!" : "You're verified!"}
              </p>
              <p className="mt-1 text-xs text-mid">
                {ml
                  ? "നിങ്ങളുടെ രേഖകൾ അംഗീകരിച്ചു. ജോലി ടാബിൽ ഓൺലൈൻ ആയി ജോലി എടുത്തുതുടങ്ങൂ."
                  : "Your documents were approved. Go online in the Jobs tab and start accepting work."}
              </p>
            </div>
          )}
          {application.status === "pending" && (
            <div className="rounded-xl border border-warn-mid bg-warn-light p-4 text-center">
              <p className="text-3xl">⏳</p>
              <p className="mt-1 font-display text-lg font-extrabold text-warn">
                {ml ? "പരിശോധിക്കുന്നു" : "Under review"}
              </p>
              <p className="mt-1 text-xs text-mid">
                {ml ? (
                  <>
                    ഞങ്ങളുടെ ടീം നിങ്ങളുടെ KYC പരിശോധിക്കുന്നു.{" "}
                    <b>{slaHoursLeft(application)} മണിക്കൂറിനുള്ളിൽ</b> മറുപടി കിട്ടും. ഞങ്ങൾ
                    അറിയിക്കാം.
                  </>
                ) : (
                  <>
                    Our team is checking your KYC. Decision within{" "}
                    <b>{slaHoursLeft(application)} hours</b>. We&apos;ll notify you.
                  </>
                )}
              </p>
            </div>
          )}
          {application.status === "rejected" && (
            <div className="rounded-xl border border-kaam-mid bg-kaam-light p-4 text-center">
              <p className="text-3xl">❌</p>
              <p className="mt-1 font-display text-lg font-extrabold text-kaam">
                {ml ? "അംഗീകരിച്ചില്ല" : "Not approved"}
              </p>
              {application.rejectReason && (
                <p className="mt-1 rounded-lg bg-white p-2 text-xs text-mid">
                  {ml ? "കാരണം" : "Reason"}: {application.rejectReason}
                </p>
              )}
              <Link
                href="/worker/signup"
                className="mt-3 inline-block rounded-xl bg-kaam px-6 py-2.5 text-xs font-bold text-white"
              >
                {ml ? "ശരിയാക്കി വീണ്ടും അപേക്ഷിക്കൂ →" : "Fix & re-apply →"}
              </Link>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[11px] text-mid">
            <span>
              {ml ? `${application.name} എന്ന പേരിൽ അപേക്ഷിച്ചു` : `Applied as ${application.name}`}
            </span>
            <span>{application.city}</span>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-3xl">🪪</p>
          <p className="mt-1 text-sm font-bold">
            {ml ? "ഈ ഫോണിൽ രജിസ്റ്റർ ചെയ്തിട്ടില്ല" : "Not registered on this device"}
          </p>
          <p className="mt-1 text-xs text-mid">
            {ml
              ? "ചേരാൻ രജിസ്റ്റർ ചെയ്ത് KYC രേഖകൾ അയക്കൂ. 24 മണിക്കൂറിനുള്ളിൽ അംഗീകാരം."
              : "Sign up and upload your KYC to join KAAM. Approval within 24 hours."}
          </p>
          <Link
            href="/worker/signup"
            className="mt-3 inline-block rounded-xl bg-kaam px-6 py-2.5 text-xs font-bold text-white"
          >
            {ml ? "KAAM-ൽ ജോലിക്ക് അപേക്ഷിക്കൂ →" : "Apply to work with KAAM →"}
          </Link>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-[10px] font-bold tracking-wide text-dim uppercase">
          {ml ? "നിങ്ങളുടെ പ്രൊഫൈൽ" : "Profile snapshot"}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: ml ? "റേറ്റിംഗ്" : "Rating", value: `⭐ ${worker.rating}` },
            { label: ml ? "അഭിപ്രായങ്ങൾ" : "Reviews", value: `${worker.reviewCount}` },
            { label: ml ? "ചെയ്ത ജോലി" : "Jobs done", value: worker.jobsDone.toLocaleString("en-IN") },
            {
              label: ml ? "പരിചയം" : "Experience",
              value: ml ? `${worker.experienceYears} വർഷം` : `${worker.experienceYears} yr`,
            },
            { label: ml ? "സ്വീകരിച്ച നിരക്ക്" : "Accept rate", value: `${Math.round(worker.acceptRate * 100)}%` },
            { label: ml ? "സ്ഥലം" : "City", value: worker.city },
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
