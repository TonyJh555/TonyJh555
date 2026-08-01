"use client";

import { useState } from "react";
import type { Worker } from "@/lib/types";
import { Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";
import { DEFAULT_REWARDS, useRewards } from "@/lib/site-settings";

/**
 * Refer-a-worker — the supply-side growth loop. Great workers know great
 * workers; rewarding them for bringing peers onto KAAM is how a marketplace
 * scales supply fast. Bilingual, one-tap WhatsApp share.
 */
/** Shipped default; the live figure comes from the admin-editable settings. */
export const WORKER_REFERRAL_REWARD = DEFAULT_REWARDS.workerReferral;
export const WORKER_REFERRAL_JOBS = 5;

export function WorkerRefer({ worker }: { worker: Worker }) {
  const [copied, setCopied] = useState(false);
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const reward = useRewards().workerReferral;
  const code = `KWK${worker.id.replace(/\W/g, "").slice(0, 4).toUpperCase()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // The shared message goes out in the sender's language, because the friend
  // receiving it on WhatsApp is a Kerala worker too.
  const text = ml
    ? `KAAM-ൽ ചേരൂ — ജോലി നിങ്ങളെ തേടി വരും, 85% നിങ്ങൾക്ക്, പണം വേഗം കിട്ടും. ` +
      `എന്റെ കോഡ് ${code} ഉപയോഗിച്ച് ചേരൂ: ${origin}/worker/signup`
    : `Join me on KAAM and earn well for your skills — jobs come to you, you keep 85%, ` +
      `and payouts are fast. Sign up with my code ${code}: ${origin}/worker/signup`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <Card className="mb-4 overflow-hidden p-0">
      <div className="bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] p-4 text-white">
        <p className="text-2xl">🤝</p>
        <p className="mt-1 font-display text-lg font-extrabold">
          {ml ? `ഒരാളെ ചേർക്കൂ, ₹${reward} നേടൂ` : `Refer a worker, earn ₹${reward}`}
        </p>
        <p className="text-[11px] text-white/80">
          {ml
            ? `Refer a worker, earn ₹${reward}`
            : `ഒരു തൊഴിലാളിയെ ചേർക്കൂ — ₹${reward} നേടൂ`}
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-kaam-mid bg-kaam-light px-4 py-2.5">
          <span className="font-mono text-lg font-extrabold tracking-widest text-kaam">{code}</span>
          <span className="text-[11px] font-bold text-kaam">
            {copied ? (ml ? "✅ പകർത്തി" : "✅ Copied") : ml ? "നിങ്ങളുടെ കോഡ്" : "your code"}
          </span>
        </div>

        <button
          onClick={share}
          className="mt-3 w-full rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
        >
          💬 {ml ? "വാട്ട്‌സ്ആപ്പിൽ ഷെയർ ചെയ്യൂ" : "Share on WhatsApp · ഷെയർ ചെയ്യൂ"}
        </button>

        {/* Three steps, in the reader's language first and the other one under
            it — a worker showing this to a friend can point at either line. */}
        <div className="mt-3 flex flex-col gap-1.5">
          {[
            { en: "Share your code with a skilled friend", ml: "പണിയറിയാവുന്ന കൂട്ടുകാരന് കോഡ് അയക്കൂ" },
            { en: "They sign up & pass KYC", ml: "അവർ ചേർന്ന് KYC പൂർത്തിയാക്കുന്നു" },
            {
              en: `They finish ${WORKER_REFERRAL_JOBS} jobs — you earn ₹${reward}`,
              ml: `അവർ ${WORKER_REFERRAL_JOBS} ജോലി തീർത്താൽ നിങ്ങൾക്ക് ₹${reward}`,
            },
          ].map((s, i) => (
            <div key={s.en} className="flex items-center gap-2 text-[11px]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-kaam text-[10px] font-extrabold text-white">
                {i + 1}
              </span>
              <span>
                <span className="font-bold">{ml ? s.ml : s.en}</span>
                <span className="ml-1 text-mid">· {ml ? s.en : s.ml}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
