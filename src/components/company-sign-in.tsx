"use client";

import { useState } from "react";
import {
  finishCompanySignIn,
  startCompanySignIn,
} from "@/lib/company-auth";
import { Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * Signing in as a company — the same two steps a customer already takes.
 *
 * A code to the registered number rather than a password, because a caterer's
 * office login gets written on a whiteboard and a code at least proves
 * somebody holds that phone today. Two screens, no account creation: a company
 * that is not registered is told to register rather than being walked through
 * a form that would fail at the end.
 */
export function CompanySignIn({ onRegister }: { onRegister: () => void }) {
  const ml = useLanguage().lang === "ml";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError(null);
    const started = await startCompanySignIn(phone);
    setBusy(false);
    if (started.error) {
      setError(started.error);
      return;
    }
    setDemoCode(started.code ?? null);
    setSent(true);
  };

  const check = async () => {
    setBusy(true);
    setError(null);
    const result = await finishCompanySignIn(phone, code);
    setBusy(false);
    // On success the session store notifies and the portal re-renders; there
    // is nothing to do here but leave the error clear.
    if (!result.ok) setError(result.error ?? "That code didn't work.");
  };

  return (
    <Card>
      <h2 className="font-display text-base font-extrabold text-ink">
        {ml ? "കമ്പനിയായി പ്രവേശിക്കൂ" : "Sign in as your company"}
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {ml
          ? "രജിസ്റ്റർ ചെയ്ത നമ്പറിലേക്ക് ഒരു കോഡ് അയയ്ക്കും. ഉപഭോക്താക്കളുടെ വിവരങ്ങളും വിലകളും കാണാൻ ഇത് വേണം."
          : "We'll text a code to your registered number. Customers' briefs and your prices are behind it."}
      </p>

      {!sent ? (
        <>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-bold text-mid">
              {ml ? "രജിസ്റ്റർ ചെയ്ത ഫോൺ" : "Registered phone"}
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit mobile"
              className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
            />
          </label>
          <button
            onClick={send}
            disabled={phone.length !== 10 || busy}
            className="mt-3 w-full rounded-xl bg-kaam py-3 text-sm font-extrabold text-white disabled:opacity-40"
          >
            {busy ? (ml ? "അയയ്ക്കുന്നു…" : "Sending…") : ml ? "കോഡ് അയയ്ക്കൂ" : "Send me a code"}
          </button>
        </>
      ) : (
        <>
          {demoCode && (
            <p className="mt-3 rounded-xl border border-info-mid bg-info-light px-3 py-2 text-[11px] font-bold text-info">
              {ml ? "ഡെമോ കോഡ്: " : "Demo code: "}
              <span className="font-mono tracking-[0.3em]">{demoCode}</span>
            </p>
          )}
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-bold text-mid">
              {ml ? "കോഡ്" : "The code"}
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              inputMode="numeric"
              className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-kaam"
            />
          </label>
          <button
            onClick={check}
            disabled={code.length < 4 || busy}
            className="mt-3 w-full rounded-xl bg-kaam py-3 text-sm font-extrabold text-white disabled:opacity-40"
          >
            {busy ? (ml ? "പരിശോധിക്കുന്നു…" : "Checking…") : ml ? "പ്രവേശിക്കൂ" : "Sign in"}
          </button>
          <button
            onClick={() => {
              setSent(false);
              setCode("");
              setError(null);
            }}
            className="mt-2 w-full text-[11px] font-bold text-mid"
          >
            {ml ? "← നമ്പർ മാറ്റൂ" : "← Use a different number"}
          </button>
        </>
      )}

      {error && <p className="mt-2 text-[11px] font-bold text-kaam">{error}</p>}

      <button
        onClick={onRegister}
        className="mt-4 w-full rounded-xl border border-line bg-white py-2.5 text-[11px] font-bold text-ink"
      >
        {ml ? "പുതിയ കമ്പനിയാണോ? രജിസ്റ്റർ ചെയ്യൂ →" : "New company? Register →"}
      </button>
    </Card>
  );
}
