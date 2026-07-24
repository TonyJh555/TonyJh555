"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  accountHasPassword,
  loginWithPassword,
  lookupAccount,
  requestOtp,
  resetPassword,
  signupWithPassword,
  verifyCode,
  type Identifier,
} from "@/lib/auth";
import { grantJoinBonus } from "@/lib/wallet";
import { KaamLogo } from "@/components/logo";
import { useLanguage } from "@/components/language-provider";

type Step = "identify" | "password" | "code" | "setup";

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const { lang } = useLanguage();
  const ml = lang === "ml";

  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [value, setValue] = useState("");
  const [step, setStep] = useState<Step>("identify");
  const [mode, setMode] = useState<"signup" | "reset">("signup");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const identifier: Identifier = { type: method, value: value.trim() };
  const valid =
    method === "phone"
      ? /^\d{10}$/.test(value.trim())
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const done = () => {
    router.push(next);
    router.refresh();
  };

  const sendCode = async (nextMode: "signup" | "reset") => {
    setMode(nextMode);
    const res = await requestOtp(identifier);
    if (res.error) {
      setError(res.error);
      return false;
    }
    setDemoCode(res.demo ? res.code ?? null : null);
    setStep("code");
    return true;
  };

  // Step 1 — who are you? Returning users go to password; new ones verify first.
  const onIdentify = async () => {
    if (!valid) return;
    setError(null);
    setBusy(true);
    const account = await lookupAccount(identifier);
    if (account && accountHasPassword(account.id)) {
      setBusy(false);
      setPw("");
      setStep("password");
      return;
    }
    await sendCode(account ? "reset" : "signup");
    setBusy(false);
  };

  const onLogin = async () => {
    setError(null);
    setBusy(true);
    const res = await loginWithPassword(identifier, pw);
    setBusy(false);
    if (res.status === "error") {
      setError(res.error ?? "Login failed.");
      return;
    }
    done();
  };

  const onForgot = async () => {
    setError(null);
    setBusy(true);
    await sendCode("reset");
    setBusy(false);
  };

  const onVerify = async () => {
    setError(null);
    setBusy(true);
    const res = await verifyCode(identifier, code);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Verification failed.");
      return;
    }
    setPw("");
    setPw2("");
    setStep("setup");
  };

  const onFinish = async () => {
    if (mode === "signup" && name.trim().length < 2) {
      setError(ml ? "നിങ്ങളുടെ പേര് നൽകൂ." : "Please enter your name.");
      return;
    }
    if (pw.length < 6) {
      setError(ml ? "പാസ്‌വേഡ് കുറഞ്ഞത് 6 അക്ഷരം വേണം." : "Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setError(ml ? "രണ്ട് പാസ്‌വേഡുകളും ഒരുപോലെയല്ല." : "The two passwords don't match.");
      return;
    }
    setError(null);
    setBusy(true);
    const res =
      mode === "signup"
        ? await signupWithPassword(name, identifier, pw)
        : await resetPassword(identifier, pw);
    setBusy(false);
    if (res.status === "error") {
      setError(res.error ?? "Could not save. Try again.");
      return;
    }
    if (mode === "signup") grantJoinBonus();
    done();
  };

  const contact = method === "phone" ? `+91 ${value}` : value;

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
          <h1 className="mb-1 font-display text-xl font-extrabold">{ml ? "ലോഗിൻ / സൈൻ അപ്പ്" : "Login or Sign up"}</h1>
          <p className="mb-5 text-sm text-mid">{ml ? "തുടരാൻ മൊബൈൽ നമ്പർ അല്ലെങ്കിൽ ഇമെയിൽ നൽകൂ." : "Enter your mobile number or email to continue."}</p>

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
                {m === "phone" ? (ml ? "📱 മൊബൈൽ" : "📱 Mobile") : ml ? "✉️ ഇമെയിൽ" : "✉️ Email"}
              </button>
            ))}
          </div>

          {method === "phone" ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3">
              <span className="text-sm font-bold text-mid">🇮🇳 +91</span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e) => e.key === "Enter" && onIdentify()}
                inputMode="numeric"
                autoFocus
                placeholder={ml ? "10 അക്ക മൊബൈൽ നമ്പർ" : "10-digit mobile number"}
                className="flex-1 bg-transparent py-3 text-sm outline-none"
              />
            </div>
          ) : (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onIdentify()}
              type="email"
              autoFocus
              placeholder="you@email.com"
              className="mb-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
            />
          )}

          {error && <p className="mb-3 text-xs font-semibold text-kaam">{error}</p>}
          <button
            onClick={onIdentify}
            disabled={!valid || busy}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {busy ? (ml ? "കാത്തിരിക്കൂ…" : "Please wait…") : ml ? "തുടരൂ →" : "Continue →"}
          </button>
        </div>
      )}

      {step === "password" && (
        <div className="fade-up">
          <button onClick={() => setStep("identify")} className="mb-3 text-xs font-bold text-mid">
            ← {ml ? (method === "phone" ? "നമ്പർ മാറ്റൂ" : "ഇമെയിൽ മാറ്റൂ") : `Change ${method === "phone" ? "number" : "email"}`}
          </button>
          <h1 className="mb-1 font-display text-xl font-extrabold">{ml ? "വീണ്ടും സ്വാഗതം 👋" : "Welcome back 👋"}</h1>
          <p className="mb-4 text-sm text-mid">
            {ml ? "പാസ്‌വേഡ് നൽകൂ — " : "Enter your password for "}
            <strong>{contact}</strong>
          </p>
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && pw && onLogin()}
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder={ml ? "പാസ്‌വേഡ്" : "Password"}
            className="mb-3 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
          />
          {error && <p className="mb-3 text-xs font-semibold text-kaam">{error}</p>}
          <button
            onClick={onLogin}
            disabled={!pw || busy}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {busy ? (ml ? "സൈൻ ഇൻ ചെയ്യുന്നു…" : "Signing in…") : ml ? "ലോഗിൻ →" : "Login →"}
          </button>
          <button
            onClick={onForgot}
            disabled={busy}
            className="mt-3 w-full text-center text-xs font-bold text-mid disabled:opacity-50"
          >
            {ml ? "പാസ്‌വേഡ് മറന്നോ? കോഡ് ഉപയോഗിച്ച് പുതുക്കൂ" : "Forgot password? Reset with a code"}
          </button>
        </div>
      )}

      {step === "code" && (
        <div className="fade-up">
          <button onClick={() => setStep("identify")} className="mb-3 text-xs font-bold text-mid">
            ← {ml ? (method === "phone" ? "നമ്പർ മാറ്റൂ" : "ഇമെയിൽ മാറ്റൂ") : `Change ${method === "phone" ? "number" : "email"}`}
          </button>
          <h1 className="mb-1 font-display text-xl font-extrabold">{ml ? "കോഡ് നൽകൂ" : "Enter the code"}</h1>
          <p className="mb-4 text-sm text-mid">
            {ml ? "നിങ്ങളാണെന്ന് ഉറപ്പിക്കാൻ " : "We sent a one-time code to "}
            <strong>{contact}</strong>
            {ml ? " എന്ന നമ്പറിലേക്ക് ഒറ്റത്തവണ കോഡ് അയച്ചു." : " to confirm it's really you."}
          </p>
          {demoCode && (
            <div className="mb-4 rounded-xl bg-info-light p-3 text-center text-xs text-info">
              📲 {ml ? "ഡെമോ മോഡ് — നിങ്ങളുടെ കോഡ് " : "Demo mode — your code is "}
              <strong className="font-mono text-base">{demoCode}</strong>
            </div>
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.length >= 4 && onVerify()}
            inputMode="numeric"
            autoFocus
            placeholder={ml ? "കോഡ് നൽകൂ" : "Enter code"}
            className="mb-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.5em] outline-none focus:border-kaam"
          />
          {error && <p className="mb-3 text-xs font-semibold text-kaam">{error}</p>}
          <button
            onClick={onVerify}
            disabled={code.length < 4 || busy}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {busy ? (ml ? "പരിശോധിക്കുന്നു…" : "Verifying…") : ml ? "പരിശോധിക്കൂ →" : "Verify →"}
          </button>
        </div>
      )}

      {step === "setup" && (
        <div className="fade-up">
          <h1 className="mb-1 font-display text-xl font-extrabold">
            {mode === "signup" ? (ml ? "കാമിലേക്ക് സ്വാഗതം! 🎉" : "Welcome to KAAM! 🎉") : ml ? "പുതിയ പാസ്‌വേഡ് സെറ്റ് ചെയ്യൂ 🔒" : "Set a new password 🔒"}
          </h1>
          <p className="mb-5 text-sm text-mid">
            {mode === "signup"
              ? ml
                ? "അവസാന ഘട്ടം — നിങ്ങളുടെ പേരും ലോഗിൻ ചെയ്യാൻ ഒരു പാസ്‌വേഡും."
                : "One last step — your name and a password to log in with."
              : ml
                ? "നിങ്ങളുടെ അക്കൗണ്ടിന് പുതിയ പാസ്‌വേഡ് തിരഞ്ഞെടുക്കൂ."
                : "Choose a new password for your account."}
          </p>
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder={ml ? "നിങ്ങളുടെ പേര്" : "Your name"}
              className="mb-3 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
            />
          )}
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder={ml ? "പാസ്‌വേഡ് ഉണ്ടാക്കൂ (കുറഞ്ഞത് 6 അക്ഷരം)" : "Create a password (min 6 characters)"}
            className="mb-3 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
          />
          <input
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onFinish()}
            type="password"
            autoComplete="new-password"
            placeholder={ml ? "പാസ്‌വേഡ് സ്ഥിരീകരിക്കൂ" : "Confirm password"}
            className="mb-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
          />
          {error && <p className="mb-3 text-xs font-semibold text-kaam">{error}</p>}
          <button
            onClick={onFinish}
            disabled={busy}
            className="w-full rounded-xl bg-good py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? (ml ? "സേവ് ചെയ്യുന്നു…" : "Saving…") : mode === "signup" ? (ml ? "അക്കൗണ്ട് ഉണ്ടാക്കൂ →" : "Create account →") : ml ? "പാസ്‌വേഡ് സേവ് ചെയ്യൂ →" : "Save password →"}
          </button>
        </div>
      )}

      <p className="mt-8 text-center text-[10px] leading-relaxed text-dim">
        {ml
          ? "തുടരുന്നതിലൂടെ കാമിന്റെ നിബന്ധനകളും സ്വകാര്യതാ നയവും നിങ്ങൾ അംഗീകരിക്കുന്നു. സൈൻ അപ്പ് ഒറ്റത്തവണ കോഡ് വഴി സ്ഥിരീകരിക്കും; പിന്നീട് പാസ്‌വേഡ് ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യാം."
          : "By continuing you agree to KAAM's Terms & Privacy Policy. Sign-up is confirmed by a one-time code; you log in with your password after."}
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
