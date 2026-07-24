"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { useCustomer } from "@/lib/auth";
import { useBookings } from "@/lib/bookings";
import { useLanguage } from "@/components/language-provider";
import { inr } from "@/lib/format";
import {
  cancelPlus,
  getPlusPlan,
  isMember,
  joinPlus,
  memberSavings,
  PLUS_PERKS,
  PLUS_PLANS,
  useMembership,
  type PlusPlan,
} from "@/lib/membership";

/**
 * KAAM Plus — membership landing / management. Non-members see the pitch,
 * perks, plans and potential savings, then pay before Plus activates; members
 * see their status, savings and can cancel. Fully bilingual (EN/ML).
 */
export default function PlusPage() {
  const customer = useCustomer();
  const bookings = useBookings();
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const membership = useMembership(customer?.id);
  const member = isMember(membership);
  const saved = memberSavings(bookings, customer?.id);
  const [planId, setPlanId] = useState<PlusPlan["id"]>("yearly");
  const [done, setDone] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const plan = getPlusPlan(planId);

  const pay = () => {
    setPaying(true);
    // Demo payment. In production this opens Razorpay (UPI / cards) and Plus
    // activates only on a verified success webhook.
    setTimeout(() => {
      joinPlus(customer?.id, planId);
      setPaying(false);
      setPayOpen(false);
      setDone(true);
    }, 1300);
  };

  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">{ml ? "കാം പ്ലസ്" : "KAAM Plus"}</h1>
      </header>

      {/* Hero */}
      <Card className="mb-4 bg-[linear-gradient(135deg,#7c3aed,#4c1d95)] text-white">
        <p className="font-display text-2xl font-extrabold">
          KAAM <span className="text-amber-300">Plus</span> ✦
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          {member
            ? ml
              ? "നിങ്ങൾ ഒരു പ്ലസ് അംഗമാണ് — എല്ലാ ബുക്കിംഗും വിലക്കുറവ്, ഫീസില്ലാതെ, മുൻഗണനയോടെ."
              : "You're a Plus member — every booking is cheaper, fee-free, and priority-matched."
            : ml
              ? "ഒരു മെമ്പർഷിപ്പ്. എല്ലാ ബുക്കിംഗും വിലക്കുറവ്, ഫീസില്ലാതെ, മുൻഗണനയോടെ. രണ്ട് ജോലികളിൽ തന്നെ മുതലാകും."
              : "One membership. Every booking cheaper, fee-free, and priority-matched. It pays for itself in a couple of jobs."}
        </p>
        {member && (
          <div className="mt-3 rounded-xl bg-white/15 p-3">
            <p className="text-[10px] font-bold tracking-wide text-white/70 uppercase">
              {ml ? "പ്ലസ് കൊണ്ട് ലാഭിച്ചത്" : "Saved with Plus"}
            </p>
            <p className="font-display text-xl font-extrabold">{inr(saved)}</p>
            <p className="text-[10px] text-white/70">
              {ml ? getPlusPlan(membership.planId ?? "yearly").labelMl : getPlusPlan(membership.planId ?? "yearly").label} ·{" "}
              {ml ? "പുതുക്കുന്നു" : "renews"}{" "}
              {membership.renewsOn
                ? new Date(membership.renewsOn).toLocaleDateString(ml ? "ml-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—"}
            </p>
          </div>
        )}
      </Card>

      {/* Perks */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        {ml ? "എല്ലാ പ്ലസ് ആനുകൂല്യങ്ങളും" : "Every Plus perk"}
      </h2>
      <div className="mb-5 flex flex-col gap-2">
        {PLUS_PERKS.map((p) => (
          <div key={p.title} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
            <span className="text-lg">{p.icon}</span>
            <div>
              <p className="text-sm font-bold">{ml ? p.titleMl : p.title}</p>
              <p className="text-[11px] leading-relaxed text-mid">{ml ? p.subMl : p.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {done && (
        <p className="mb-4 rounded-xl bg-good-light px-3 py-2.5 text-xs font-bold text-good">
          {ml
            ? "🎉 കാം പ്ലസിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ 10% അംഗ കിഴിവ് ഇനി ചെക്ക്ഔട്ടിൽ സ്വയമേവ ലഭിക്കും."
            : "🎉 Welcome to KAAM Plus! Your 10% member discount now applies automatically at checkout."}
        </p>
      )}

      {member ? (
        <button
          onClick={() => {
            cancelPlus(customer?.id);
            setDone(false);
          }}
          className="w-full rounded-xl border border-line bg-white py-3 text-sm font-bold text-mid"
        >
          {ml ? "മെമ്പർഷിപ്പ് റദ്ദാക്കൂ" : "Cancel membership"}
        </button>
      ) : (
        <>
          <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
            {ml ? "നിങ്ങളുടെ പ്ലാൻ തിരഞ്ഞെടുക്കൂ" : "Choose your plan"}
          </h2>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {PLUS_PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={`rounded-2xl border p-3 text-left ${
                  planId === p.id ? "border-kaam bg-kaam-light" : "border-line bg-white"
                }`}
              >
                <p className="text-sm font-extrabold">{ml ? p.labelMl : p.label}</p>
                <p className="font-display text-lg font-extrabold text-kaam">{inr(p.price)}</p>
                <p className="text-[10px] text-mid">{ml ? p.noteMl : p.note}</p>
              </button>
            ))}
          </div>
          {saved > 0 && (
            <p className="mb-3 rounded-xl bg-surf px-3 py-2 text-[11px] text-mid">
              {ml ? "💡 നിങ്ങളുടെ കഴിഞ്ഞ ജോലികളിൽ പ്ലസ് " : "💡 On your past jobs, Plus would have saved you "}
              <span className="font-bold text-good">{inr(saved)}</span>
              {ml ? " ലാഭിക്കുമായിരുന്നു." : "."}
            </p>
          )}
          <button
            onClick={() => setPayOpen(true)}
            className="w-full rounded-xl bg-[linear-gradient(135deg,#7c3aed,#4c1d95)] py-3.5 text-sm font-bold text-white shadow-pop"
          >
            {ml ? "✦ കാം പ്ലസ് എടുക്കൂ · " : "✦ Join KAAM Plus · "}
            {inr(plan.price)}
          </button>
          <p className="mt-2 text-center text-[10px] text-dim">
            {ml
              ? "എപ്പോൾ വേണമെങ്കിലും റദ്ദാക്കാം · സ്വയമേവ ലാഭം · മറഞ്ഞ ചാർജില്ല"
              : "Cancel anytime · auto-applied savings · no hidden charges"}
          </p>
        </>
      )}

      <Link href="/app/search" className="mt-5 block text-center text-xs font-bold text-kaam">
        {ml ? "പ്ലസുമായി ബുക്ക് ചെയ്യാൻ തുടങ്ങൂ →" : "Start booking with Plus →"}
      </Link>

      {/* Payment sheet — Plus only activates after paying */}
      {payOpen && (
        <div className="fixed inset-0 z-[350] flex items-end justify-center bg-black/60 sm:items-center">
          <div className="w-full max-w-[430px] rounded-t-3xl bg-page p-6 pb-8 sm:rounded-3xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
            <p className="font-display text-lg font-extrabold">
              {ml ? "സുരക്ഷിത പേയ്മെന്റ്" : "Secure payment"}
            </p>
            <p className="mt-0.5 text-xs text-mid">
              KAAM Plus · {ml ? plan.labelMl : plan.label}
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
              <span className="text-sm font-bold text-ink">{ml ? "അടയ്ക്കേണ്ട തുക" : "Amount to pay"}</span>
              <span className="font-display text-xl font-extrabold text-kaam">{inr(plan.price)}</span>
            </div>

            <div className="mt-3 flex gap-2">
              {[
                { k: "upi", en: "UPI", ml: "UPI" },
                { k: "card", en: "Card", ml: "കാർഡ്" },
                { k: "netbank", en: "Net­banking", ml: "നെറ്റ് ബാങ്കിംഗ്" },
              ].map((m, i) => (
                <div
                  key={m.k}
                  className={`flex-1 rounded-xl border px-2 py-2 text-center text-[11px] font-bold ${
                    i === 0 ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-white text-mid"
                  }`}
                >
                  {ml ? m.ml : m.en}
                </div>
              ))}
            </div>

            <button
              onClick={pay}
              disabled={paying}
              className="mt-4 w-full rounded-xl bg-good py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {paying
                ? ml
                  ? "പ്രോസസ്സ് ചെയ്യുന്നു…"
                  : "Processing…"
                : ml
                  ? `₹${plan.price} സുരക്ഷിതമായി അടയ്ക്കൂ`
                  : `Pay ${inr(plan.price)} securely`}
            </button>
            {!paying && (
              <button
                onClick={() => setPayOpen(false)}
                className="mt-2 w-full text-center text-xs font-bold text-mid"
              >
                {ml ? "റദ്ദാക്കൂ" : "Cancel"}
              </button>
            )}
            <p className="mt-3 text-center text-[10px] leading-relaxed text-dim">
              {ml
                ? "🔒 ഡെമോ പേയ്മെന്റ് — യഥാർത്ഥ ചാർജില്ല. പ്രൊഡക്ഷനിൽ Razorpay (UPI/കാർഡ്) വഴി."
                : "🔒 Demo payment — no real charge. Production uses Razorpay (UPI / cards)."}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
