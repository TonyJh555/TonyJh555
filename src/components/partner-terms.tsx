"use client";

import { useState } from "react";
import { updateCompany, type EventCompany } from "@/lib/event-store";
import {
  AGREEMENT_CLAUSES,
  AGREEMENT_VERSION,
  agreementCurrent,
} from "@/lib/partner-agreement";
import { Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * The terms a company accepts before it can price anything.
 *
 * Shown in full, on one screen, in the words a caterer in Thrissur would use.
 * Not a link to a PDF and not a pre-ticked box: the whole point of this
 * document is that the commission and the introduction rule are understood
 * *before* the first quote, so there is nothing to renegotiate in a car park
 * three weeks later.
 *
 * The name typed at the bottom is the signature. It is a weaker thing than a
 * wet one, and it is the same thing every Indian marketplace runs on — what
 * makes it worth anything is that the party accepting is a registered firm
 * with a GSTIN, not an anonymous account.
 */
export function PartnerTerms({ company }: { company: EventCompany }) {
  const ml = useLanguage().lang === "ml";
  const [name, setName] = useState(company.contactName ?? "");
  const [read, setRead] = useState(false);

  const signed = agreementCurrent(company.agreement);
  if (signed) return null;

  const renewing = Boolean(company.agreement) && !signed;
  const canSign = read && name.trim().length >= 3;

  const accept = () => {
    if (!canSign) return;
    updateCompany(company.id, {
      agreement: {
        version: AGREEMENT_VERSION,
        acceptedAt: new Date().toISOString(),
        acceptedBy: name.trim(),
      },
    });
  };

  return (
    <Card>
      <h2 className="font-display text-base font-extrabold text-ink">
        📄 {ml ? "കാമുമായുള്ള കരാർ" : "Your agreement with KAAM"}
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {renewing
          ? ml
            ? "നിബന്ധനകൾ പുതുക്കി. വില എഴുതുന്നതിന് മുൻപ് ഒന്നുകൂടി വായിക്കൂ."
            : "The terms have changed. Please read them once more before you quote again."
          : ml
            ? "വില എഴുതുന്നതിന് മുൻപ് ഇത് വായിക്കൂ. കമ്മീഷൻ എത്രയെന്ന് ഇവിടെ വ്യക്തമായി പറയുന്നു — പിന്നീട് ഒരു തർക്കവും വേണ്ട."
            : "Read this before you write your first price. What KAAM takes is stated plainly here, so there is nothing to argue about later."}
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        {AGREEMENT_CLAUSES.map((c, i) => (
          <div key={c.heading} className="rounded-xl border border-line bg-surf p-3">
            <p className="text-[11px] font-extrabold text-ink">
              {i + 1}. {ml ? c.headingMl : c.heading}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-mid">{ml ? c.bodyMl : c.body}</p>
          </div>
        ))}
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-white p-3">
        <input
          type="checkbox"
          checked={read}
          onChange={(e) => setRead(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-kaam)]"
        />
        <span className="text-[11px] leading-relaxed font-semibold text-ink">
          {ml
            ? "ഞാൻ ഇത് വായിച്ചു, ഈ കമ്പനിക്ക് വേണ്ടി സമ്മതിക്കാൻ എനിക്ക് അധികാരമുണ്ട്."
            : "I have read this, and I am authorised to accept it for this company."}
        </span>
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-bold text-mid">
          {ml ? "പേര് (ഒപ്പ്)" : "Your name (this is your signature)"}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
        />
      </label>

      <button
        onClick={accept}
        disabled={!canSign}
        className="mt-3 w-full rounded-xl bg-kaam py-3 text-sm font-extrabold text-white disabled:opacity-40"
      >
        {ml ? "സമ്മതിക്കുന്നു — ജോലി തുടങ്ങാം" : "Accept and start receiving briefs"}
      </button>
    </Card>
  );
}

/**
 * The one-line reminder of what was signed, once it has been.
 *
 * A company that can see the real commission on its own screen has nothing to
 * be told by a customer offering to "save you the 15%".
 */
export function AgreementBadge({ company }: { company: EventCompany }) {
  const ml = useLanguage().lang === "ml";
  const a = company.agreement;
  if (!agreementCurrent(a)) return null;
  return (
    <p className="mb-3 rounded-xl border border-good-mid bg-good-light px-3 py-2 text-[11px] leading-relaxed text-good">
      ✅ {ml ? "കരാർ സ്വീകരിച്ചു" : "Partner agreement accepted"}
      <span className="block font-semibold text-ink">
        {a!.acceptedBy} · {new Date(a!.acceptedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        {company.gstin ? ` · GSTIN ${company.gstin}` : ""}
      </span>
    </p>
  );
}
