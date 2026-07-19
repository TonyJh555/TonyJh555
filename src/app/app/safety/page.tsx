"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
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
          ? `You can save up to ${MAX_CONTACTS} contacts.`
          : "Please enter a name and a valid Indian mobile number.",
      );
    }
  };

  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">Safety Center</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="text-sm font-bold">🛡️ Your safety is the product</p>
        <p className="mt-1 text-xs leading-relaxed text-white/80">
          Every KAAM job is KYC-verified, OTP-started, tracked in-app, and one tap from help.
          Add your family below and they can know about every job too.
        </p>
      </Card>

      {/* Trusted contacts */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        Trusted contacts ({contacts.length}/{MAX_CONTACTS})
      </h2>
      <Card className="mb-4">
        {contacts.length === 0 && (
          <p className="mb-3 text-xs leading-relaxed text-mid">
            Add up to {MAX_CONTACTS} family members. When a worker starts a job at your home,
            you&apos;ll get a one-tap prompt to send them a live status on WhatsApp or SMS.
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
              {c.autoNotify ? "Auto-share ON" : "Auto-share off"}
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
                placeholder="Name (e.g. Amma)"
                className="w-2/5 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile number"
                inputMode="tel"
                className="flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
              />
            </div>
            {error && <p className="text-[11px] font-semibold text-kaam">{error}</p>}
            <button onClick={add} className="rounded-xl bg-kaam py-2.5 text-xs font-bold text-white">
              + Add trusted contact
            </button>
          </div>
        )}
      </Card>

      {/* How KAAM keeps you safe */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        How every job is protected
      </h2>
      <div className="mb-4 flex flex-col gap-2">
        {[
          { icon: "✅", title: "KYC-verified workers", sub: "Aadhaar + experience proof reviewed before the first job." },
          { icon: "🔐", title: "OTP start code", sub: "Work can only begin when you share your private 4-digit code." },
          { icon: "📍", title: "Live tracking", sub: "See your worker on the way and share status with family." },
          { icon: "🆘", title: "SOS in every active job", sub: "Emergency 112, live location, and the KAAM safety team, one tap away." },
          { icon: "⭐", title: "Mandatory ratings", sub: "Every completed job must be rated — bad actors surface fast." },
          { icon: "💬", title: "In-app chat only", sub: "Keep conversations in KAAM so there's always a record." },
        ].map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
            <span className="text-lg">{f.icon}</span>
            <div>
              <p className="text-sm font-bold">{f.title}</p>
              <p className="text-[11px] leading-relaxed text-mid">{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Emergency</h2>
      <div className="flex flex-col gap-2">
        <a
          href="tel:112"
          className="flex items-center gap-3 rounded-xl bg-kaam px-4 py-3.5 text-sm font-bold text-white shadow-kaam"
        >
          🆘 Call 112 — national emergency
        </a>
        <a
          href="tel:1091"
          className="flex items-center gap-3 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          👩 Women&apos;s helpline — 1091
        </a>
        <Link
          href="/app/support"
          className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card"
        >
          🎧 Report a safety concern to KAAM
        </Link>
      </div>
    </main>
  );
}
