"use client";

import { useState } from "react";
import type { Worker } from "@/lib/types";
import { Card } from "@/components/ui";

/**
 * Refer-a-worker — the supply-side growth loop. Great workers know great
 * workers; rewarding them for bringing peers onto KAAM is how a marketplace
 * scales supply fast. Bilingual, one-tap WhatsApp share.
 */
export const WORKER_REFERRAL_REWARD = 500;
export const WORKER_REFERRAL_JOBS = 5;

export function WorkerRefer({ worker }: { worker: Worker }) {
  const [copied, setCopied] = useState(false);
  const code = `KWK${worker.id.replace(/\W/g, "").slice(0, 4).toUpperCase()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const text =
    `Join me on KAAM and earn well for your skills — jobs come to you, you keep 85%, ` +
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
          Refer a worker, earn ₹{WORKER_REFERRAL_REWARD}
        </p>
        <p className="text-[11px] text-white/80">
          ഒരു തൊഴിലാളിയെ ചേർക്കൂ — ₹{WORKER_REFERRAL_REWARD} നേടൂ
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-kaam-mid bg-kaam-light px-4 py-2.5">
          <span className="font-mono text-lg font-extrabold tracking-widest text-kaam">{code}</span>
          <span className="text-[11px] font-bold text-kaam">{copied ? "✅ Copied" : "your code"}</span>
        </div>

        <button
          onClick={share}
          className="mt-3 w-full rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
        >
          💬 Share on WhatsApp · ഷെയർ ചെയ്യൂ
        </button>

        <div className="mt-3 flex flex-col gap-1.5">
          {[
            { en: "Share your code with a skilled friend", ml: "കോഡ് ഷെയർ ചെയ്യൂ" },
            { en: "They sign up & pass KYC", ml: "അവർ ചേർന്ന് KYC പൂർത്തിയാക്കുന്നു" },
            { en: `They finish ${WORKER_REFERRAL_JOBS} jobs — you earn ₹${WORKER_REFERRAL_REWARD}`, ml: "അവർ ജോലി പൂർത്തിയാക്കുമ്പോൾ നിങ്ങൾക്ക് പണം" },
          ].map((s, i) => (
            <div key={s.en} className="flex items-center gap-2 text-[11px]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-kaam text-[10px] font-extrabold text-white">
                {i + 1}
              </span>
              <span>
                <span className="font-bold">{s.en}</span>
                <span className="ml-1 text-mid">· {s.ml}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
