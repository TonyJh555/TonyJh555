"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { inr } from "@/lib/format";
import { redeemReferral, referralEarnings, useWallet } from "@/lib/wallet";
import { useRewards } from "@/lib/site-settings";
import { useLanguage } from "@/components/language-provider";

/**
 * Refer & earn — the growth loop. Both the referrer and the friend get
 * ₹100, shared in one tap on WhatsApp. Kept dead-simple and bilingual so
 * anyone can use it.
 */
export default function ReferPage() {
  const wallet = useWallet();
  const ml = useLanguage().lang === "ml";
  const earned = referralEarnings(wallet.txns);
  // The same figure the wallet actually credits on redemption.
  const reward = useRewards().customerReferral;
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareText =
    `Join KAAM — Kerala's trusted app for home services (electricians, nurses, cooks & more). ` +
    `Use my code ${wallet.referralCode} and we BOTH get ${inr(reward)}! 👉 ${origin}/app`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(wallet.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const redeem = () => {
    const r = redeemReferral(code);
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setCode("");
  };

  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">Refer &amp; earn</h1>
      </header>

      {/* Hero */}
      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-center text-white">
        <p className="text-4xl">🎁</p>
        <p className="mt-1 font-display text-xl font-extrabold">
          You get {inr(reward)}. They get {inr(reward)}.
        </p>
        <p className="mt-1 text-xs text-white/80">
          {ml
            ? `രണ്ടു പേർക്കും ${inr(reward)} വീതം — സുഹൃത്തുക്കളെ ചേർക്കൂ`
            : "Share your code, and you both earn — it's that simple."}
        </p>
        {earned > 0 && (
          <div className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            Earned so far: {inr(earned)}
          </div>
        )}
      </Card>

      {/* Your code */}
      <Card className="mb-4">
        <p className="text-[10px] font-bold tracking-wide text-dim uppercase">Your code</p>
        <button
          onClick={copyCode}
          className="mt-1 flex w-full items-center justify-between rounded-xl border-2 border-dashed border-kaam-mid bg-kaam-light px-4 py-3"
        >
          <span className="font-mono text-xl font-extrabold tracking-widest text-kaam">
            {wallet.referralCode}
          </span>
          <span className="text-xs font-bold text-kaam">{copied ? "✅ Copied" : "📋 Copy"}</span>
        </button>
        <button
          onClick={share}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white"
        >
          💬 {ml ? "വാട്‌സ്ആപ്പിൽ ഷെയർ ചെയ്യൂ" : "Share on WhatsApp"}
        </button>
      </Card>

      {/* How it works */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">How it works</h2>
      <div className="mb-4 flex flex-col gap-2">
        {[
          { icon: "📤", en: "Share your code with friends", ml: "കോഡ് ഷെയർ ചെയ്യൂ" },
          { icon: "📲", en: "They sign up and book a job", ml: "അവർ ചേർന്ന് ജോലി ബുക്ക് ചെയ്യുന്നു" },
          { icon: "💰", en: `You both get ${inr(reward)} KAAM Cash`, ml: "രണ്ടു പേർക്കും പണം" },
        ].map((s, i) => (
          <div key={s.en} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kaam text-xs font-extrabold text-white">
              {i + 1}
            </span>
            <span className="text-lg">{s.icon}</span>
            <span>
              <span className="block text-sm font-bold leading-tight">{ml ? s.ml : s.en}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Redeem */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Have a friend&apos;s code?</h2>
      <Card>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KAAMXXXX"
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-kaam"
          />
          <button
            onClick={redeem}
            disabled={!code.trim()}
            className="rounded-xl bg-kaam px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Apply
          </button>
        </div>
        {msg && (
          <p className={`mt-2 text-xs font-semibold ${msg.ok ? "text-good" : "text-kaam"}`}>{msg.text}</p>
        )}
      </Card>

      <Link href="/app/search" className="mt-5 block text-center text-xs font-bold text-kaam">
        Start booking →
      </Link>
    </main>
  );
}
