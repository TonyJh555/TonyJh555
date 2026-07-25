"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { invoiceEmailFor, logout, setInvoiceEmail, useCustomer, type CustomerAccount } from "@/lib/auth";
import { clearMyBookings, useBookings } from "@/lib/bookings";
import { clearThreads } from "@/lib/chat";
import { customerRatingFor } from "@/lib/customer-rating";
import { customerTier } from "@/lib/loyalty";
import { useTheme, toggleTheme } from "@/lib/theme";
import { redeemReferral, useWallet } from "@/lib/wallet";
import { isMember, useMembership } from "@/lib/membership";
import { useLanguage } from "@/components/language-provider";
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

/**
 * Where invoices land. Most customers sign up with a phone number, so without
 * this they'd only ever see the invoice inside the app — this is how they get
 * the same tax invoice in their inbox that Uber/Ola send after every trip.
 */
function InvoiceEmail({ customer }: { customer: CustomerAccount }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const current = invoiceEmailFor(customer);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [saved, setSaved] = useState(false);

  // Signed up with an email and never overrode it — nothing to set up.
  const fixed = customer.identifier.type === "email" && !customer.invoiceEmail;
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const save = () => {
    setInvoiceEmail(value);
    setEditing(false);
    setSaved(true);
  };

  return (
    <Card className="mb-4">
      <p className="text-xs font-extrabold text-ink">
        🧾 {ml ? "ഇൻവോയ്സ് ഇമെയിൽ" : "Invoice email"}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-mid">
        {ml
          ? "ഓരോ ജോലിയും കഴിഞ്ഞാൽ GST ടാക്സ് ഇൻവോയ്സ് ഇവിടേക്ക് അയയ്ക്കും. ആപ്പിലും എപ്പോഴും കാണാം."
          : "We email the GST tax invoice here after every completed job. It's always in the app too."}
      </p>

      {!editing && (
        <div className="mt-2 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold">
            {current ?? (
              <span className="font-semibold text-dim">
                {ml ? "ഇതുവരെ ചേർത്തിട്ടില്ല" : "Not added yet"}
              </span>
            )}
          </p>
          <button
            onClick={() => {
              setEditing(true);
              setSaved(false);
              setValue(current ?? "");
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-kaam"
          >
            {current ? (ml ? "മാറ്റൂ" : "Change") : ml ? "ചേർക്കൂ" : "Add"}
          </button>
        </div>
      )}

      {editing && (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@email.com"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surf px-3 py-2 text-sm outline-none focus:border-kaam"
            />
            <button
              onClick={save}
              disabled={!valid && value.trim() !== ""}
              className="rounded-lg bg-kaam px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {ml ? "സേവ്" : "Save"}
            </button>
          </div>
          <button
            onClick={() => setEditing(false)}
            className="mt-1.5 text-[11px] font-bold text-mid"
          >
            {ml ? "വേണ്ട" : "Cancel"}
          </button>
        </div>
      )}

      {saved && !editing && (
        <p className="mt-1.5 text-[11px] font-bold text-good">
          ✓ {ml ? "സേവ് ചെയ്തു — അടുത്ത ഇൻവോയ്സ് ഇവിടെ എത്തും" : "Saved — your next invoice arrives here"}
        </p>
      )}
      {fixed && !editing && (
        <p className="mt-1.5 text-[11px] text-dim">
          {ml ? "സൈൻ അപ്പ് ചെയ്ത ഇമെയിൽ" : "The email you signed up with"}
        </p>
      )}
    </Card>
  );
}

/**
 * A reset button for testing, not a product feature.
 *
 * Trying the booking flow end to end leaves half-finished jobs behind, and a
 * stale one can sit there looking like a real unpaid booking. This clears the
 * signed-in customer's OWN bookings and their chats — never anyone else's —
 * including the cloud copy, since a local-only wipe would come straight back
 * on the next sync.
 */
function ResetTestData({ customerId }: { customerId?: string }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState<number | null>(null);

  const wipe = () => {
    const ids = clearMyBookings(customerId);
    clearThreads(ids);
    try {
      // Drop the one-shot guards too, so a fresh run behaves like a fresh run.
      window.localStorage.removeItem("kaam.invoiced.v1");
      window.localStorage.removeItem("kaam.remindersSent.v1");
    } catch {
      /* ignore */
    }
    setCleared(ids.length);
    setConfirming(false);
  };

  return (
    <Card className="mb-4">
      <p className="text-xs font-extrabold text-ink">🧪 {ml ? "ടെസ്റ്റിംഗ്" : "Testing"}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-mid">
        {ml
          ? "ടെസ്റ്റ് ചെയ്യുമ്പോൾ ബാക്കിയായ ബുക്കിംഗുകൾ മായ്ക്കൂ. നിങ്ങളുടെ സ്വന്തം ബുക്കിംഗുകൾ മാത്രം — തൊഴിലാളികളെയോ മറ്റുള്ളവരെയോ ബാധിക്കില്ല."
          : "Clear the bookings left behind while testing. Only your own bookings and chats — workers and other accounts are untouched."}
      </p>

      {cleared !== null ? (
        <p className="mt-2 text-[11px] font-bold text-good">
          ✓ {ml ? `${cleared} ബുക്കിംഗ് മായ്ച്ചു` : `Cleared ${cleared} booking${cleared === 1 ? "" : "s"}`}
        </p>
      ) : confirming ? (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-lg border border-line bg-white py-2 text-[11px] font-bold text-mid"
          >
            {ml ? "വേണ്ട" : "Cancel"}
          </button>
          <button
            onClick={wipe}
            className="flex-1 rounded-lg bg-kaam py-2 text-[11px] font-bold text-white"
          >
            {ml ? "അതെ, മായ്ക്കൂ" : "Yes, clear them"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-2 w-full rounded-lg border border-line bg-surf py-2 text-[11px] font-bold text-kaam"
        >
          {ml ? "എന്റെ ബുക്കിംഗുകൾ മായ്ക്കൂ" : "Clear my bookings"}
        </button>
      )}
    </Card>
  );
}

function AddressManager({ customerId }: { customerId: string }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const addresses = addressesFor(useAddresses(), customerId);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState<AddressLabel>("Home");
  const [customName, setCustomName] = useState("");
  const [line, setLine] = useState("");
  const [coords, setCoords] = useState<LatLng | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  const labelText = (l: AddressLabel) =>
    ml ? (l === "Home" ? "വീട്" : l === "Office" ? "ഓഫീസ്" : "മറ്റുള്ളവ") : l;

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
        <p className="text-sm font-bold">📍 {ml ? "സേവ് ചെയ്ത വിലാസങ്ങൾ" : "Saved addresses"}</p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-bold text-kaam">
            {ml ? "+ ചേർക്കൂ" : "+ Add"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start justify-between rounded-xl bg-surf p-3">
            <div>
              <p className="text-xs font-bold">
                {a.label === "Home" ? "🏠" : a.label === "Office" ? "🏢" : "📍"} {displayName(a)}
                {a.coords && <span className="ml-1 text-[10px] font-semibold text-good">🗺️ {ml ? "പിൻ ചെയ്തു" : "pinned"}</span>}
              </p>
              <p className="text-[11px] text-mid">{a.line}</p>
            </div>
            <button onClick={() => removeAddress(a.id)} className="text-[11px] font-bold text-dim">
              {ml ? "നീക്കം ചെയ്യൂ" : "Remove"}
            </button>
          </div>
        ))}
        {addresses.length === 0 && !adding && (
          <p className="text-xs text-dim">
            {ml ? "വിലാസങ്ങൾ ഒന്നുമില്ല. ഒറ്റ ടാപ്പ് ബുക്കിംഗിന് വീട് / ഓഫീസ് ചേർക്കൂ." : "No saved addresses yet. Add Home or Office for one-tap booking."}
          </p>
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
                {labelText(l)}
              </button>
            ))}
          </div>
          {label === "Other" && (
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={ml ? "പേര് (ഉദാ: അമ്മയുടെ വീട്)" : "Name (e.g. Mom's house)"}
              className="mb-2 w-full rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none"
            />
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-lg border border-kaam-mid bg-kaam-light px-3 py-2.5 text-xs font-bold text-kaam"
          >
            🗺️ {ml ? "മാപ്പിൽ തിരഞ്ഞെടുക്കൂ" : "Pick on map"} {coords && <span className="ml-auto text-[10px]">✓ {ml ? "പിൻ ചെയ്തു" : "pinned"}</span>}
          </button>
          <input
            value={line}
            onChange={(e) => {
              setLine(e.target.value);
              setCoords(undefined); // typing overrides the map pin
            }}
            placeholder={ml ? "…അല്ലെങ്കിൽ വീട്, സ്ഥലം, നഗരം ടൈപ്പ് ചെയ്യൂ" : "…or type flat / house, area, city"}
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
              {ml ? "സേവ്" : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-mid"
            >
              {ml ? "റദ്ദാക്കൂ" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ReferralCard() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
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
      <p className="text-sm font-bold">🎁 {ml ? "റഫർ ചെയ്ത് നേടൂ" : "Refer & Earn"}</p>
      <p className="mt-1 text-xs text-mid">
        {ml
          ? "₹100 നൽകൂ, ₹100 നേടൂ. കോഡ് ഷെയർ ചെയ്യൂ — സുഹൃത്ത് ചേരുമ്പോൾ രണ്ടു പേർക്കും കാം ക്യാഷ്."
          : "Give ₹100, get ₹100. Share your code — when a friend joins, you both get KAAM Cash."}
      </p>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-gold bg-white px-3 py-2.5">
        <span className="font-mono text-base font-extrabold tracking-widest text-warn">
          {wallet.referralCode}
        </span>
        <button onClick={share} className="rounded-lg bg-warn px-4 py-1.5 text-xs font-bold text-white">
          {copied ? (ml ? "കോപ്പി ചെയ്തു!" : "Copied!") : ml ? "ഷെയർ" : "Share"}
        </button>
      </div>
      <div className="mt-3">
        <p className="mb-1 text-[11px] font-bold text-mid">{ml ? "സുഹൃത്തിന്റെ കോഡ് ഉണ്ടോ?" : "Have a friend's code?"}</p>
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
            {ml ? "പ്രയോഗിക്കൂ" : "Apply"}
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
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const plusMember = isMember(useMembership(customer?.id));

  if (!customer) {
    return (
      <main className="px-4 pt-5">
        <header className="mb-4 flex items-center gap-3">
          <BackLink href="/app" />
          <h1 className="font-display text-lg font-bold">{ml ? "അക്കൗണ്ട്" : "Account"}</h1>
        </header>
        <div className="py-16 text-center">
          <p className="mb-2 text-4xl">👤</p>
          <p className="text-sm font-semibold text-mid">{ml ? "നിങ്ങൾ ലോഗിൻ ചെയ്തിട്ടില്ല" : "You're not logged in"}</p>
          <Link
            href="/app/login?next=/app/account"
            className="mt-4 inline-block rounded-xl bg-kaam px-8 py-3 text-sm font-bold text-white shadow-kaam"
          >
            {ml ? "ലോഗിൻ / സൈൻ അപ്പ് →" : "Login or Sign up →"}
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
        <h1 className="font-display text-lg font-bold">{ml ? "എന്റെ അക്കൗണ്ട്" : "My Account"}</h1>
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

      <InvoiceEmail customer={customer} />

      {/* KAAM Cash */}
      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/70">💰 {ml ? "കാം ക്യാഷ് ബാലൻസ്" : "KAAM Cash balance"}</p>
            <p className="font-display text-3xl font-extrabold">{inr(wallet.balance)}</p>
          </div>
          <Tag color="yellow">{ml ? "ചെക്ക്ഔട്ടിൽ ഉപയോഗിക്കാം" : "Usable at checkout"}</Tag>
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
                {loyalty.tier.name} {ml ? "അംഗം" : "member"}
              </p>
              <p className="text-[10px] text-mid">
                {ml
                  ? `${loyalty.jobs} പൂർത്തിയായ ബുക്കിംഗ്${loyalty.jobs === 1 ? "" : "ുകൾ"}`
                  : `${loyalty.jobs} completed booking${loyalty.jobs === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          {loyalty.tier.cashbackPct > 0 && (
            <Tag color="green">{loyalty.tier.cashbackPct}% {ml ? "തിരികെ" : "back"}</Tag>
          )}
        </div>

        {loyalty.next ? (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] font-semibold text-mid">
              <span>{ml ? "അടുത്തത്" : "Progress to"} {loyalty.next.emoji} {loyalty.next.name}</span>
              <span>{loyalty.toNext} {ml ? "കൂടി" : "more"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surf">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${loyalty.progress * 100}%`, background: loyalty.next.color }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs font-bold text-good">
            {ml ? "🏆 ഏറ്റവും ഉയർന്ന ടയർ — എല്ലാ ആനുകൂല്യങ്ങളും നിങ്ങൾക്ക്!" : "🏆 Top tier — you enjoy every KAAM perk!"}
          </p>
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
          <p className="text-[11px] font-semibold text-mid">{ml ? "ബുക്കിംഗുകൾ" : "Bookings"}</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-xl font-extrabold text-kaam">{inr(spent)}</p>
          <p className="text-[11px] font-semibold text-mid">{ml ? "ആകെ ചെലവാക്കിയത്" : "Total spent"}</p>
        </Card>
      </div>

      {myRating.count > 0 && (
        <Card className="mb-4 flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div className="flex-1">
            <p className="text-sm font-bold">
              {ml ? "ഉപഭോക്താവ് എന്ന നിലയിൽ നിങ്ങളുടെ റേറ്റിംഗ്: " : "Your rating as a customer: "}
              <span className="text-amber-500">⭐ {myRating.avg.toFixed(1)}</span>
            </p>
            <p className="text-[11px] text-mid">
              {ml
                ? `${myRating.count} തൊഴിലാളികളിൽ നിന്ന് · സൗമ്യതയും ഒരുക്കവും വ്യക്തതയും ഇത് ഉയർത്തും.`
                : `From ${myRating.count} worker${myRating.count === 1 ? "" : "s"} · being kind, ready and clear keeps it high.`}
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
          📋 {ml ? "എന്റെ ബുക്കിംഗുകൾ" : "My Bookings"}
        </Link>
        <Link href="/app/support" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🎧 {ml ? "സഹായം & പിന്തുണ · റീഫണ്ട്, പ്രശ്നങ്ങൾ" : "Help & Support · refunds, issues"}
        </Link>
        <Link href="/app/safety" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🛡️ {ml ? "സേഫ്റ്റി സെന്റർ · വിശ്വസ്ത കോൺടാക്ടുകൾ, SOS" : "Safety Center · trusted contacts, SOS"}
        </Link>
        <Link href="/app/pricing" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          ⚖️ {ml ? "എങ്ങനെ പണമടയ്ക്കും · ന്യായമായ വില" : "How you pay · fair pricing explained"}
        </Link>
        <Link href="/app/plus" className="flex items-center justify-between rounded-xl border border-[#e4d5ff] bg-[#f5f0ff] px-4 py-3.5 text-sm font-bold text-[#7c3aed] shadow-card">
          <span>✦ {ml ? "കാം പ്ലസ് · എല്ലാ ബുക്കിംഗിനും 10% ലാഭം" : "KAAM Plus · save 10% on every booking"}</span>
          {plusMember && <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10px] text-white">{ml ? "അംഗം" : "MEMBER"}</span>}
        </Link>
        <Link href="/app/refer" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🎁 {ml ? "റഫർ ചെയ്ത് നേടൂ · രണ്ടു പേർക്കും ₹100" : "Refer & earn · you both get ₹100"}
        </Link>
        <Link href="/app/promise" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🤝 {ml ? "കാം വാഗ്ദാനം · നിങ്ങൾക്കുള്ള ഉറപ്പ്" : "The KAAM Promise · our guarantee to you"}
        </Link>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card"
        >
          <span>{theme === "dark" ? (ml ? "🌙 ഡാർക്ക് മോഡ്" : "🌙 Dark mode") : ml ? "☀️ ലൈറ്റ് മോഡ്" : "☀️ Light mode"}</span>
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
          🔨 {ml ? "കാം തൊഴിലാളിയാകൂ" : "Become a KAAM worker"}
        </Link>
        <ResetTestData customerId={customer.id} />
        <button
          onClick={() => {
            logout();
            router.push("/app");
            router.refresh();
          }}
          className="mt-2 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          {ml ? "ലോഗ് ഔട്ട്" : "Log out"}
        </button>
      </div>
    </main>
  );
}
