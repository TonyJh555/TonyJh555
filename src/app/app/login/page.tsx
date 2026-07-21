"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  completeSignup,
  requestOtp,
  verifyOtp,
  type Identifier,
} from "@/lib/auth";
import { grantJoinBonus } from "@/lib/wallet";
import { KaamLogo } from "@/components/logo";

type Step = "identify" | "otp" | "name";

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";

  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [value, setValue] = useState("");
  const [step, setStep] = useState<Step>("identify");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // null in real-auth mode (code sent by SMS/email); the code string in demo mode.
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const identifier: Identifier = { type: method, value: value.trim() };

  const valid =
    method === "phone"
      ? /^\d{10}$/.test(value.trim())
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const sendOtp = async () => {
    if (!valid) return;
    setError(null);
    setSending(true);
    const res = await requestOtp(identifier);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDemoCode(res.demo ? res.code ?? null : null);
    setStep("otp");
  };

  const submitOtp = async () => {
    setError(null);
    setVerifying(true);
    const res = await verifyOtp(identifier, otp);
    setVerifying(false);
    if (res.status === "error") {
      setError(res.error ?? "Verification failed.");
      return;
    }
    if (res.status === "logged_in") {
      router.push(next);
      router.refresh();
    } else {
      setStep("name");
    }
  };

  const finish = async () => {
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    await completeSignup(name, identifier);
    grantJoinBonus();
    router.push(next);
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center bg-page px-6">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/">
          <KaamLogo size={64} />
        </Link>
        <p className="mt-2 font-display text-sm text-kerala-green">കാം · Kerala&apos;s own</p>
      </div>

      {step === "identify" && (
        <div className="fade-up">
          <h1 className="mb-1 font-display text-xl font-extrabold">Login or Sign up</h1>
          <p className="mb-5 text-sm text-mid">
            Use your mobile number or email — we&apos;ll send a one-time code.
          </p>

          <div className="mb-4 flex rounded-xl border border-line bg-white p-1">
            {(["phone", "email"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMethod(m);
                  setValue("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                  method === m ? "bg-kaam text-white" : "text-mid"
                }`}
              >
                {m === "phone" ? "📱 Mobile" : "✉️ Email"}
              </button>
            ))}
          </div>

          {method === "phone" ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3">
              <span className="text-sm font-bold text-mid">🇮🇳 +91</span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoFocus
                placeholder="10-digit mobile number"
                className="flex-1 bg-transparent py-3 text-sm outline-none"
              />
            </div>
          ) : (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type="email"
              autoFocus
              placeholder="you@email.com"
              className="mb-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
            />
          )}

          {error && <p className="mb-3 text-xs font-semibold text-kaam">{error}</p>}
          <button
            onClick={sendOtp}
            disabled={!valid || sending}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send OTP →"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="fade-up">
          <button onClick={() => setStep("identify")} className="mb-3 text-xs font-bold text-mid">
            ← Change {method === "phone" ? "number" : "email"}
          </button>
          <h1 className="mb-1 font-display text-xl font-extrabold">Enter the code</h1>
          <p className="mb-4 text-sm text-mid">
            Sent to <strong>{method === "phone" ? `+91 ${value}` : value}</strong>
          </p>
          {demoCode && (
            <div className="mb-4 rounded-xl bg-info-light p-3 text-center text-xs text-info">
              📲 Demo mode — your code is <strong className="font-mono text-base">{demoCode}</strong>
            </div>
          )}
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoFocus
            placeholder="Enter code"
            className="mb-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.5em] outline-none focus:border-kaam"
          />
          {error && <p className="mb-3 text-xs font-semibold text-kaam">{error}</p>}
          <button
            onClick={submitOtp}
            disabled={otp.length < 4 || verifying}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify →"}
          </button>
        </div>
      )}

      {step === "name" && (
        <div className="fade-up">
          <h1 className="mb-1 font-display text-xl font-extrabold">Welcome to KAAM! 🎉</h1>
          <p className="mb-5 text-sm text-mid">One last thing — what should we call you?</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Your name"
            className="mb-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
          />
          {error && <p className="mb-3 text-xs font-semibold text-kaam">{error}</p>}
          <button
            onClick={finish}
            disabled={name.trim().length < 2}
            className="w-full rounded-xl bg-good py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Start using KAAM →
          </button>
        </div>
      )}

      <p className="mt-8 text-center text-[10px] leading-relaxed text-dim">
        By continuing you agree to KAAM&apos;s Terms & Privacy Policy.
        <br />
        Production build: OTP via MSG91 (SMS) / email, verified server-side.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}
