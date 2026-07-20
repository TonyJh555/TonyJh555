"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, useCustomer } from "@/lib/auth";
import { useBookings } from "@/lib/bookings";
import { customerRatingFor } from "@/lib/customer-rating";
import { customerTier } from "@/lib/loyalty";
import { useTheme, toggleTheme } from "@/lib/theme";
import { redeemReferral, useWallet } from "@/lib/wallet";
import {
  addAddress,
  addressesFor,
  displayName,
  removeAddress,
  useAddresses,
  type AddressLabel,
} from "@/lib/addresses";
import { inr } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import { Avatar, BackLink, Card, Tag } from "@/components/ui";
import { LocationPicker } from "@/components/location-picker";

function AddressManager({ customerId }: { customerId: string }) {
  const addresses = addressesFor(useAddresses(), customerId);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState<AddressLabel>("Home");
  const [customName, setCustomName] = useState("");
  const [line, setLine] = useState("");
  const [coords, setCoords] = useState<LatLng | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  const resetForm = () => {
    setLine("");
    setCustomName("");
    setCoords(undefined);
    setAdding(false);
  };

  return (
    <Card>
      {pickerOpen && (
        <LocationPicker
          initial={coords}
          onClose={() => setPickerOpen(false)}
          onConfirm={({ coords: c, label: pickedLabel }) => {
            setCoords(c);
            setLine(pickedLabel);
            setPickerOpen(false);
          }}
        />
      )}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">📍 Saved addresses</p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-bold text-kaam">
            + Add
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start justify-between rounded-xl bg-surf p-3">
            <div>
              <p className="text-xs font-bold">
                {a.label === "Home" ? "🏠" : a.label === "Office" ? "🏢" : "📍"} {displayName(a)}
                {a.coords && <span className="ml-1 text-[10px] font-semibold text-good">🗺️ pinned</span>}
              </p>
              <p className="text-[11px] text-mid">{a.line}</p>
            </div>
            <button onClick={() => removeAddress(a.id)} className="text-[11px] font-bold text-dim">
              Remove
            </button>
          </div>
        ))}
        {addresses.length === 0 && !adding && (
          <p className="text-xs text-dim">No saved addresses yet. Add Home or Office for one-tap booking.</p>
        )}
      </div>

      {adding && (
        <div className="mt-3 rounded-xl border border-line p-3">
          <div className="mb-2 flex gap-2">
            {(["Home", "Office", "Other"] as AddressLabel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                  label === l ? "bg-kaam text-white" : "bg-surf text-mid"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {label === "Other" && (
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name (e.g. Mom's house)"
              className="mb-2 w-full rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none"
            />
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-lg border border-kaam-mid bg-kaam-light px-3 py-2.5 text-xs font-bold text-kaam"
          >
            🗺️ Pick on map {coords && <span className="ml-auto text-[10px]">✓ pinned</span>}
          </button>
          <input
            value={line}
            onChange={(e) => {
              setLine(e.target.value);
              setCoords(undefined); // typing overrides the map pin
            }}
            placeholder="…or type flat / house, area, city"
            className="mb-2 w-full rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!line.trim()) return;
                addAddress({
                  customerId,
                  label,
                  customName: customName.trim() || undefined,
                  line: line.trim(),
                  coords,
                });
                resetForm();
              }}
              className="flex-1 rounded-lg bg-kaam py-2 text-xs font-bold text-white"
            >
              Save
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-mid"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ReferralCard() {
  const wallet = useWallet();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `Join me on KAAM — Kerala's own services app! Use my code ${wallet.referralCode} and we both get ₹100 KAAM Cash. 🔨`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <Card className="border-gold/40 bg-[linear-gradient(135deg,#fffbeb,#fff)]">
      <p className="text-sm font-bold">🎁 Refer & Earn</p>
      <p className="mt-1 text-xs text-mid">
        Give ₹100, get ₹100. Share your code — when a friend joins, you both get KAAM Cash.
      </p>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-gold bg-white px-3 py-2.5">
        <span className="font-mono text-base font-extrabold tracking-widest text-warn">
          {wallet.referralCode}
        </span>
        <button onClick={share} className="rounded-lg bg-warn px-4 py-1.5 text-xs font-bold text-white">
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
      <div className="mt-3">
        <p className="mb-1 text-[11px] font-bold text-mid">Have a friend&apos;s code?</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KAAMXXXX"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surf px-3 py-2 text-xs font-mono outline-none"
          />
          <button
            onClick={() => setMsg(redeemReferral(code).message)}
            className="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white"
          >
            Apply
          </button>
        </div>
        {msg && <p className="mt-1.5 text-[11px] font-semibold text-good">{msg}</p>}
      </div>
    </Card>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const customer = useCustomer();
  const bookings = useBookings();
  const wallet = useWallet();
  const theme = useTheme();

  if (!customer) {
    return (
      <main className="px-4 pt-5">
        <header className="mb-4 flex items-center gap-3">
          <BackLink href="/app" />
          <h1 className="font-display text-lg font-bold">Account</h1>
        </header>
        <div className="py-16 text-center">
          <p className="mb-2 text-4xl">👤</p>
          <p className="text-sm font-semibold text-mid">You&apos;re not logged in</p>
          <Link
            href="/app/login?next=/app/account"
            className="mt-4 inline-block rounded-xl bg-kaam px-8 py-3 text-sm font-bold text-white shadow-kaam"
          >
            Login or Sign up →
          </Link>
        </div>
      </main>
    );
  }

  // Only count this customer's own bookings (the cloud store holds everyone's).
  const myBookings = bookings.filter((b) => b.customerId === customer.id);
  const spent = myBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.quote.totalUserPays, 0);
  const myRating = customerRatingFor(bookings, customer.id);
  const loyalty = customerTier(bookings, customer.id);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app" />
        <h1 className="font-display text-lg font-bold">My Account</h1>
      </header>

      <Card className="mb-4 flex items-center gap-3">
        <Avatar initials={customer.name.slice(0, 2).toUpperCase()} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold">{customer.name}</p>
          <p className="text-xs text-mid">
            {customer.identifier.type === "phone"
              ? `📱 +91 ${customer.identifier.value}`
              : `✉️ ${customer.identifier.value}`}
          </p>
        </div>
      </Card>

      {/* KAAM Cash */}
      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/70">💰 KAAM Cash balance</p>
            <p className="font-display text-3xl font-extrabold">{inr(wallet.balance)}</p>
          </div>
          <Tag color="yellow">Usable at checkout</Tag>
        </div>
        {wallet.txns.length > 0 && (
          <div className="mt-3 border-t border-white/15 pt-2">
            {wallet.txns.slice(0, 3).map((t) => (
              <div key={t.id} className="flex justify-between py-0.5 text-[11px] text-white/80">
                <span>{t.reason}</span>
                <span className={t.amount > 0 ? "text-green-300" : "text-white/60"}>
                  {t.amount > 0 ? "+" : ""}
                  {inr(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* KAAM Rewards tier */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{loyalty.tier.emoji}</span>
            <div>
              <p className="font-display text-base font-extrabold" style={{ color: loyalty.tier.color }}>
                {loyalty.tier.name} member
              </p>
              <p className="text-[10px] text-mid">
                {loyalty.jobs} completed booking{loyalty.jobs === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {loyalty.tier.cashbackPct > 0 && (
            <Tag color="green">{loyalty.tier.cashbackPct}% back</Tag>
          )}
        </div>

        {loyalty.next ? (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] font-semibold text-mid">
              <span>Progress to {loyalty.next.emoji} {loyalty.next.name}</span>
              <span>{loyalty.toNext} more</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surf">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${loyalty.progress * 100}%`, background: loyalty.next.color }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs font-bold text-good">🏆 Top tier — you enjoy every KAAM perk!</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {loyalty.tier.perks.map((p) => (
            <span key={p} className="rounded-lg bg-surf px-2 py-1 text-[10px] font-bold text-mid">
              ✓ {p}
            </span>
          ))}
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="font-display text-xl font-extrabold">{myBookings.length}</p>
          <p className="text-[11px] font-semibold text-mid">Bookings</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-xl font-extrabold text-kaam">{inr(spent)}</p>
          <p className="text-[11px] font-semibold text-mid">Total spent</p>
        </Card>
      </div>

      {myRating.count > 0 && (
        <Card className="mb-4 flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div className="flex-1">
            <p className="text-sm font-bold">
              Your rating as a customer:{" "}
              <span className="text-amber-500">⭐ {myRating.avg.toFixed(1)}</span>
            </p>
            <p className="text-[11px] text-mid">
              From {myRating.count} worker{myRating.count === 1 ? "" : "s"} · being kind, ready and
              clear keeps it high.
            </p>
          </div>
        </Card>
      )}

      <div className="mb-4">
        <ReferralCard />
      </div>

      <div className="mb-4">
        <AddressManager customerId={customer.id} />
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/app/bookings" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          📋 My Bookings
        </Link>
        <Link href="/app/support" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🎧 Help &amp; Support · refunds, issues
        </Link>
        <Link href="/app/safety" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🛡️ Safety Center · trusted contacts, SOS
        </Link>
        <Link href="/app/pricing" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          ⚖️ How you pay · fair pricing explained
        </Link>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card"
        >
          <span>{theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}</span>
          <span
            className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === "dark" ? "bg-kaam" : "bg-line"
            }`}
          >
            <span
              className={`absolute h-5 w-5 rounded-full bg-white transition-all ${
                theme === "dark" ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
        <Link href="/worker/signup" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🔨 Become a KAAM worker
        </Link>
        <button
          onClick={() => {
            logout();
            router.push("/app");
            router.refresh();
          }}
          className="mt-2 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          Log out
        </button>
      </div>
    </main>
  );
}
