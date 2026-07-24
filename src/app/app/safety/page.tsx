"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";
import {
  addContact,
  MAX_CONTACTS,
  removeContact,
  toggleAutoNotify,
  useTrustedContacts,
} from "@/lib/safety";

/**
 * Safety Center — KAAM's version of Uber's Safety Toolkit hub. Trusted
 * contacts (share every job with family in one tap), the safety features
 * already protecting every booking, and emergency routes.
 */
export default function SafetyPage() {
  const contacts = useTrustedContacts();
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    if (addContact(name, phone)) {
      setName("");
      setPhone("");
      setError("");
    } else {
      setError(
        contacts.length >= MAX_CONTACTS
          ? ml
            ? `${MAX_CONTACTS} കോൺടാക്ടുകൾ വരെ സേവ് ചെയ്യാം.`
            : `You can save up to ${MAX_CONTACTS} contacts.`
          : ml
            ? "പേരും ശരിയായ ഇന്ത്യൻ മൊബൈൽ നമ്പറും നൽകൂ."
            : "Please enter a name and a valid Indian mobile number.",
      );
    }
  };

  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">{ml ? "സേഫ്റ്റി സെന്റർ" : "Safety Center"}</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="text-sm font-bold">🛡️ {ml ? "നിങ്ങളുടെ സുരക്ഷയാണ് ഞങ്ങളുടെ ലക്ഷ്യം" : "Your safety is the product"}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/80">
          {ml
            ? "ഓരോ കാം ജോലിയും KYC വെരിഫൈഡ്, OTP ഉപയോഗിച്ച് തുടങ്ങുന്നത്, ആപ്പിൽ ട്രാക്ക് ചെയ്യുന്നത്, സഹായം ഒറ്റ ടാപ്പിൽ. നിങ്ങളുടെ കുടുംബത്തെ താഴെ ചേർക്കൂ — അവർക്കും ഓരോ ജോലിയും അറിയാം."
            : "Every KAAM job is KYC-verified, OTP-started, tracked in-app, and one tap from help. Add your family below and they can know about every job too."}
        </p>
      </Card>

      {/* Trusted contacts */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        {ml ? "വിശ്വസ്ത കോൺടാക്ടുകൾ" : "Trusted contacts"} ({contacts.length}/{MAX_CONTACTS})
      </h2>
      <Card className="mb-4">
        {contacts.length === 0 && (
          <p className="mb-3 text-xs leading-relaxed text-mid">
            {ml
              ? `${MAX_CONTACTS} കുടുംബാംഗങ്ങളെ വരെ ചേർക്കൂ. തൊഴിലാളി നിങ്ങളുടെ വീട്ടിൽ ജോലി തുടങ്ങുമ്പോൾ, അവർക്ക് WhatsApp/SMS വഴി തത്സമയ വിവരം അയക്കാൻ ഒറ്റ ടാപ്പ് ലഭിക്കും.`
              : `Add up to ${MAX_CONTACTS} family members. When a worker starts a job at your home, you'll get a one-tap prompt to send them a live status on WhatsApp or SMS.`}
          </p>
        )}
        {contacts.map((c) => (
          <div key={c.id} className="mb-2 flex items-center gap-3 rounded-xl border border-line p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{c.name}</p>
              <p className="text-[11px] text-mid">+{c.phone}</p>
            </div>
            <button
              onClick={() => toggleAutoNotify(c.id)}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                c.autoNotify ? "bg-kaam text-white" : "border border-line bg-surf text-mid"
              }`}
            >
              {c.autoNotify ? (ml ? "ഓട്ടോ-ഷെയർ ഓൺ" : "Auto-share ON") : ml ? "ഓട്ടോ-ഷെയർ ഓഫ്" : "Auto-share off"}
            </button>
            <button
              onClick={() => removeContact(c.id)}
              aria-label={`Remove ${c.name}`}
              className="text-sm text-dim"
            >
              ✕
            </button>
          </div>
        ))}
        {contacts.length < MAX_CONTACTS && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={ml ? "പേര് (ഉദാ: അമ്മ)" : "Name (e.g. Amma)"}
                className="w-2/5 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={ml ? "മൊബൈൽ നമ്പർ" : "Mobile number"}
                inputMode="tel"
                className="flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
              />
            </div>
            {error && <p className="text-[11px] font-semibold text-kaam">{error}</p>}
            <button onClick={add} className="rounded-xl bg-kaam py-2.5 text-xs font-bold text-white">
              {ml ? "+ വിശ്വസ്ത കോൺടാക്ട് ചേർക്കൂ" : "+ Add trusted contact"}
            </button>
          </div>
        )}
      </Card>

      {/* How KAAM keeps you safe */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        {ml ? "ഓരോ ജോലിയും എങ്ങനെ സുരക്ഷിതം" : "How every job is protected"}
      </h2>
      <div className="mb-4 flex flex-col gap-2">
        {[
          { icon: "✅", title: "KYC-verified workers", titleMl: "KYC വെരിഫൈഡ് തൊഴിലാളികൾ", sub: "Aadhaar + experience proof reviewed before the first job.", subMl: "ആധാർ + പരിചയ തെളിവ് ആദ്യ ജോലിക്ക് മുൻപ് പരിശോധിക്കുന്നു." },
          { icon: "🔐", title: "OTP start code", titleMl: "OTP സ്റ്റാർട്ട് കോഡ്", sub: "Work can only begin when you share your private 4-digit code.", subMl: "നിങ്ങളുടെ 4-അക്ക കോഡ് നൽകുമ്പോൾ മാത്രമേ ജോലി തുടങ്ങൂ." },
          { icon: "📍", title: "Live tracking", titleMl: "തത്സമയ ട്രാക്കിംഗ്", sub: "See your worker on the way and share status with family.", subMl: "വരുന്ന വഴിയിൽ തൊഴിലാളിയെ കാണൂ, കുടുംബവുമായി ഷെയർ ചെയ്യൂ." },
          { icon: "🆘", title: "SOS in every active job", titleMl: "ഓരോ ജോലിയിലും SOS", sub: "Emergency 112, live location, and the KAAM safety team, one tap away.", subMl: "112, തത്സമയ ലൊക്കേഷൻ, കാം സേഫ്റ്റി ടീം — ഒറ്റ ടാപ്പിൽ." },
          { icon: "⭐", title: "Mandatory ratings", titleMl: "നിർബന്ധിത റേറ്റിംഗ്", sub: "Every completed job must be rated — bad actors surface fast.", subMl: "ഓരോ ജോലിയും റേറ്റ് ചെയ്യണം — മോശക്കാർ വേഗം പുറത്താകും." },
          { icon: "💬", title: "In-app chat only", titleMl: "ആപ്പിനുള്ളിൽ മാത്രം ചാറ്റ്", sub: "Keep conversations in KAAM so there's always a record.", subMl: "സംഭാഷണങ്ങൾ കാമിൽ സൂക്ഷിക്കൂ — എപ്പോഴും ഒരു രേഖയുണ്ട്." },
        ].map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
            <span className="text-lg">{f.icon}</span>
            <div>
              <p className="text-sm font-bold">{ml ? f.titleMl : f.title}</p>
              <p className="text-[11px] leading-relaxed text-mid">{ml ? f.subMl : f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">{ml ? "അടിയന്തരം" : "Emergency"}</h2>
      <div className="flex flex-col gap-2">
        <a
          href="tel:112"
          className="flex items-center gap-3 rounded-xl bg-kaam px-4 py-3.5 text-sm font-bold text-white shadow-kaam"
        >
          🆘 {ml ? "112 വിളിക്കൂ — ദേശീയ അടിയന്തര നമ്പർ" : "Call 112 — national emergency"}
        </a>
        <a
          href="tel:1091"
          className="flex items-center gap-3 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          👩 {ml ? "വനിതാ ഹെൽപ്‌ലൈൻ — 1091" : "Women's helpline — 1091"}
        </a>
        <Link
          href="/app/support"
          className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card"
        >
          🎧 {ml ? "കാമിനോട് സുരക്ഷാ പ്രശ്നം അറിയിക്കൂ" : "Report a safety concern to KAAM"}
        </Link>
      </div>
    </main>
  );
}
