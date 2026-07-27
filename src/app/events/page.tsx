"use client";

import { useState } from "react";
import Link from "next/link";
import { KERALA_DISTRICTS } from "@/lib/geo";
import { inr } from "@/lib/format";
import {
  EVENT_KINDS,
  daysToEvent,
  quoteTotals,
  type EventRequest,
} from "@/lib/events";
import {
  invitesFor,
  quoteBy,
  registerCompany,
  useCompanies,
  useEventQuotes,
  useEventRequests,
  type EventCompany,
} from "@/lib/event-store";
import { QuoteBuilder } from "@/components/quote-builder";
import { LivePortfolio, PortfolioEditor } from "@/components/company-portfolio";
import { Card, Tag } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * KAAM for event companies.
 *
 * Weddings and functions are the biggest single tickets on the platform — a
 * three-lakh booking earns more than three hundred fan repairs — and they were
 * previously represented by a "Event Staff" tile priced per day, which is not
 * how anyone actually buys a wedding.
 *
 * A business registers here, KAAM verifies it once, and then it receives the
 * briefs customers have specifically invited it to price. It never bids blind
 * into an open pit: the customer picked it by name off its rating and its past
 * work, which is the same rule the rest of KAAM runs on.
 */
export default function EventCompanyPortal() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const companies = useCompanies();
  const requests = useEventRequests();
  const quotes = useEventQuotes();
  const [meId, setMeId] = useState<string | null>(null);

  const me = companies.find((c) => c.id === meId) ?? companies[companies.length - 1] ?? null;

  return (
    <div className="min-h-screen bg-page pb-16">
      <header className="bg-ink px-5 py-5 text-white">
        <Link href="/" className="text-[11px] font-bold text-white/60">
          ← KAAM
        </Link>
        <h1 className="mt-1 font-display text-xl font-extrabold">
          {ml ? "കാം — ഇവന്റ് കമ്പനികൾക്ക്" : "KAAM for event companies"}
        </h1>
        <p className="mt-1 text-xs text-white/70">
          {ml
            ? "കല്യാണങ്ങളും ഫംഗ്ഷനുകളും. ഉപഭോക്താവ് നിങ്ങളെ തിരഞ്ഞെടുത്ത് വില ചോദിക്കുന്നു."
            : "Weddings and functions. Customers pick you by name and ask for your price."}
        </p>
      </header>

      <main className="mx-auto max-w-[430px] px-4 py-5">
        {companies.length > 1 && (
          <select
            value={me?.id ?? ""}
            onChange={(e) => setMeId(e.target.value)}
            className="mb-4 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {!me ? (
          <RegisterCompany />
        ) : me.status !== "approved" ? (
          <PendingReview company={me} />
        ) : (
          <>
            <Invites company={me} requests={requests} quotes={quotes} />
            <div className="mt-4">
              <LivePortfolio company={me} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ── Registration ─────────────────────────────────────────────────── */

function RegisterCompany() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState(KERALA_DISTRICTS[6]?.name ?? "Ernakulam");
  const [city, setCity] = useState("");
  const [yearsRunning, setYearsRunning] = useState("");
  const [crewSize, setCrewSize] = useState("");
  const [services, setServices] = useState("");
  const [about, setAbout] = useState("");
  const [gstin, setGstin] = useState("");
  const [portfolio, setPortfolio] = useState<EventCompany["portfolio"]>([]);

  const ready = name.trim() && contactName.trim() && phone.trim().length >= 10 && city.trim();

  const submit = () => {
    if (!ready) return;
    registerCompany({
      name: name.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      district: district as EventCompany["district"],
      city: city.trim(),
      yearsRunning: Number(yearsRunning) || 0,
      crewSize: Number(crewSize) || 0,
      services: services.split(",").map((s) => s.trim()).filter(Boolean),
      about: about.trim(),
      gstin: gstin.trim() || undefined,
      portfolio,
    });
  };

  const field = (
    label: string,
    labelMl: string,
    value: string,
    set: (v: string) => void,
    placeholder = "",
    numeric = false,
  ) => (
    <label className="mt-3 block">
      <span className="mb-1 block text-[11px] font-bold text-mid">{ml ? labelMl : label}</span>
      <input
        value={value}
        onChange={(e) => set(numeric ? e.target.value.replace(/[^\d]/g, "") : e.target.value)}
        inputMode={numeric ? "numeric" : "text"}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
      />
    </label>
  );

  return (
    <Card>
      <h2 className="font-display text-base font-extrabold text-ink">
        {ml ? "നിങ്ങളുടെ കമ്പനി രജിസ്റ്റർ ചെയ്യൂ" : "Register your company"}
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {ml
          ? "കാം ഒരിക്കൽ പരിശോധിക്കും. അതിനുശേഷം നിങ്ങളെ തിരഞ്ഞെടുക്കുന്ന ഉപഭോക്താക്കളുടെ ജോലികൾ ലഭിക്കും. ഓരോ ജോലിക്കും നിങ്ങളുടെ വില നിങ്ങൾ തന്നെ എഴുതാം."
          : "KAAM verifies you once. After that you receive briefs from customers who picked you, and you write your own price for each one."}
      </p>

      {field("Company name", "കമ്പനിയുടെ പേര്", name, setName, "e.g. Kerala Weddings & Events")}
      {field("Your name", "നിങ്ങളുടെ പേര്", contactName, setContactName)}
      {field("Phone", "ഫോൺ", phone, setPhone, "10-digit mobile", true)}

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-bold text-mid">{ml ? "ജില്ല" : "District"}</span>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
        >
          {KERALA_DISTRICTS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      {field("Town / city", "പട്ടണം", city, setCity)}
      {field("Years running", "എത്ര വർഷമായി", yearsRunning, setYearsRunning, "", true)}
      {field("People you can put on the ground", "എത്ര പേരെ ഇറക്കാം", crewSize, setCrewSize, "", true)}
      {field(
        "What you do (comma separated)",
        "എന്തെല്ലാം ചെയ്യും (കോമ ഇട്ട്)",
        services,
        setServices,
        "Stage, lighting, catering, live counters",
      )}
      {field("GST number (if you have one)", "GST നമ്പർ (ഉണ്ടെങ്കിൽ)", gstin, setGstin)}

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-bold text-mid">
          {ml ? "കമ്പനിയെക്കുറിച്ച്" : "About your company"}
        </span>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
        />
      </label>

      <PortfolioEditor photos={portfolio} onChange={setPortfolio} />

      <button
        onClick={submit}
        disabled={!ready}
        className="mt-4 w-full rounded-2xl bg-kaam py-3.5 text-sm font-extrabold text-white shadow-kaam disabled:opacity-40"
      >
        {ml ? "പരിശോധനയ്ക്ക് അയയ്ക്കൂ" : "Send for verification"}
      </button>
      <p className="mt-2 text-center text-[10px] text-dim">
        {ml
          ? "കാം 15% മാത്രം എടുക്കുന്നു. ബാക്കി മുഴുവൻ നിങ്ങൾക്ക്."
          : "KAAM takes 15%. The rest is yours."}
      </p>
    </Card>
  );
}

function PendingReview({ company }: { company: EventCompany }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const rejected = company.status === "rejected";
  return (
    <Card>
      <p className="text-3xl">{rejected ? "😔" : "⏳"}</p>
      <h2 className="mt-2 font-display text-base font-extrabold text-ink">
        {rejected
          ? ml ? "അപേക്ഷ സ്വീകരിച്ചില്ല" : "Not approved"
          : ml ? "പരിശോധനയിലാണ്" : "Being verified"}
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {rejected
          ? company.rejectReason ?? (ml ? "കാരണം നൽകിയിട്ടില്ല." : "No reason was given.")
          : ml
            ? `${company.name} — കാം ടീം പരിശോധിക്കുന്നു. അംഗീകരിച്ചാൽ ഉടൻ ജോലികൾ ഇവിടെ കാണാം.`
            : `${company.name} — the KAAM team is checking your details. Once approved, briefs appear here.`}
      </p>
    </Card>
  );
}

/* ── Invites ──────────────────────────────────────────────────────── */

function Invites({
  company,
  requests,
  quotes,
}: {
  company: EventCompany;
  requests: EventRequest[];
  quotes: ReturnType<typeof useEventQuotes>;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [quoting, setQuoting] = useState<string | null>(null);
  const mine = invitesFor(requests, company.id);

  if (quoting) {
    const request = mine.find((r) => r.id === quoting);
    if (request) {
      return (
        <QuoteBuilder
          request={request}
          companyId={company.id}
          companyName={company.name}
          existing={quoteBy(quotes, request.id, company.id)}
          onDone={() => setQuoting(null)}
        />
      );
    }
  }

  return (
    <>
      <p className="mb-2 text-xs font-extrabold text-ink">
        📩 {ml ? "നിങ്ങളോട് വില ചോദിച്ചവർ" : "Customers asking for your price"}
      </p>

      {mine.length === 0 ? (
        <Card>
          <p className="text-2xl">🎪</p>
          <p className="mt-2 text-sm font-bold text-ink">
            {ml ? "ഇപ്പോൾ ഒന്നുമില്ല" : "Nothing right now"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-mid">
            {ml
              ? "ഒരു ഉപഭോക്താവ് നിങ്ങളെ തിരഞ്ഞെടുത്താൽ അവരുടെ ഫംഗ്ഷന്റെ വിവരങ്ങൾ ഇവിടെ വരും. നല്ല ഫോട്ടോകളും റേറ്റിംഗും ഉള്ളവരെയാണ് ആളുകൾ തിരഞ്ഞെടുക്കുന്നത്."
              : "When a customer picks you, their function's details land here. People choose on past work and rating, so keep both strong."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {mine.map((r) => {
            const kind = EVENT_KINDS.find((k) => k.id === r.kind);
            const existing = quoteBy(quotes, r.id, company.id);
            const days = daysToEvent(r);
            return (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      {kind?.icon} {ml ? kind?.labelMl : kind?.label}
                    </p>
                    <p className="text-[11px] text-mid">
                      {r.venue}, {r.district}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-info">
                      🕐 {r.date}
                      {days >= 0 && ` · ${days} ${ml ? "ദിവസം" : "days"}`} · {r.guests}{" "}
                      {ml ? "പേർ" : "guests"}
                    </p>
                  </div>
                  {existing?.status === "sent" && (
                    <Tag color="blue">{ml ? "അയച്ചു" : "Quoted"}</Tag>
                  )}
                  {existing?.status === "accepted" && (
                    <Tag color="green">{ml ? "സ്വീകരിച്ചു 🎉" : "Won 🎉"}</Tag>
                  )}
                  {existing?.status === "declined" && (
                    <Tag color="gray">{ml ? "മറ്റൊരാൾക്ക്" : "Not chosen"}</Tag>
                  )}
                </div>

                {r.budget > 0 && (
                  <p className="mt-2 text-[11px] font-semibold text-mid">
                    💰 {ml ? "ബജറ്റ്: " : "Budget: "}
                    {inr(r.budget)}
                  </p>
                )}
                {existing && existing.lines.length > 0 && (
                  <p className="mt-1 text-[11px] font-bold text-good">
                    {ml ? "നിങ്ങളുടെ വില: " : "Your price: "}
                    {inr(quoteTotals(existing.lines, r.stateId).totalUserPays)}
                  </p>
                )}

                {existing?.status !== "accepted" && existing?.status !== "declined" && (
                  <button
                    onClick={() => setQuoting(r.id)}
                    className="mt-3 w-full rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white"
                  >
                    {existing
                      ? ml ? "വില മാറ്റൂ" : "Change my price"
                      : ml ? "വില എഴുതൂ →" : "Write your price →"}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
