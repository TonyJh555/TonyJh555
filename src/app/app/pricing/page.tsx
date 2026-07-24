"use client";

import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { PRICE_MODEL_LIST } from "@/lib/price-model";
import { useLanguage } from "@/components/language-provider";

/**
 * "How you pay on KAAM" — the fairness story in one place. The dashboard's
 * pricing promise, spelled out: base hour covers time & travel, you pay only
 * for the minutes actually worked, and payment timing follows the nature of
 * the work. Everything here mirrors the live payment-policy + metered
 * engines, so what customers read is exactly what checkout does. Bilingual.
 */
export default function PricingPage() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">{ml ? "എങ്ങനെ പണമടയ്ക്കും" : "How you pay"}</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="font-display text-base font-extrabold">{ml ? "രൂപകൽപ്പനയാൽ ന്യായം ⚖️" : "Fair by design ⚖️"}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          {ml
            ? "ജോലി ചെയ്യാത്ത ഒരു മിനിറ്റിനും നിങ്ങൾ പണം നൽകില്ല, തൊഴിലാളി ഏറ്റെടുക്കുന്നതിന് മുൻപ് ജോലിക്ക് പണം നൽകില്ല. ഓരോ വിലയും എല്ലാം ഉൾപ്പെട്ടത് — GST മുൻകൂട്ടി, തൊഴിലാളിക്ക് നേരിട്ട് അധികമായി ഒന്നും നൽകേണ്ട."
            : "You never pay for a minute not worked, and you never pay for work before the worker has committed to it. Every price is all-inclusive — GST shown upfront, nothing extra to hand the worker directly."}
        </p>
      </Card>

      {/* The three payment models */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        {ml ? "ജോലിക്കനുസരിച്ച് പണം" : "Payment follows the work"}
      </h2>
      <div className="mb-5 flex flex-col gap-3">
        {PRICE_MODEL_LIST.map((m) => (
          <Card key={m.nature}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-extrabold">{ml ? m.titleMl : m.title}</p>
                  <span className="shrink-0 rounded-full bg-kaam-light px-2 py-0.5 text-[10px] font-bold text-kaam">
                    {ml ? m.tagMl : m.tag}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex items-start gap-2 text-[11px]">
                    <span className="mt-px shrink-0 rounded bg-good-light px-1.5 py-0.5 font-bold text-good">
                      {ml ? "ബുക്കിംഗിൽ" : "At booking"}
                    </span>
                    <span className="leading-relaxed text-mid">{ml ? m.payNowMl : m.payNow}</span>
                  </div>
                  {m.payAfter ? (
                    <div className="flex items-start gap-2 text-[11px]">
                      <span className="mt-px shrink-0 rounded bg-info-light px-1.5 py-0.5 font-bold text-info">
                        {ml ? "ജോലിക്ക് ശേഷം" : "After the job"}
                      </span>
                      <span className="leading-relaxed text-mid">{ml ? m.payAfterMl : m.payAfter}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-[11px]">
                      <span className="mt-px shrink-0 rounded bg-surf px-1.5 py-0.5 font-bold text-dim">
                        {ml ? "ജോലിക്ക് ശേഷം" : "After the job"}
                      </span>
                      <span className="leading-relaxed text-dim">{ml ? "പിന്നീട് ഒന്നും നൽകേണ്ട." : "Nothing more to pay."}</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 rounded-lg bg-surf px-2.5 py-1.5 text-[10px] leading-relaxed text-mid">
                  {ml ? m.noteMl : m.note}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* The metered example, made concrete */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        {ml ? "ഉദാഹരണം — ₹600/മണിക്കൂർ ഇലക്ട്രീഷ്യൻ" : "Example — a ₹600/hr electrician"}
      </h2>
      <Card className="mb-5">
        <div className="flex flex-col gap-2 text-xs">
          <Row label={ml ? "ഉറപ്പിക്കാൻ നൽകുന്നത് (ബേസ് അവർ)" : "You pay to confirm (base hour)"} value="₹600 + GST" tone="now" />
          <Row label={ml ? "തൊഴിലാളി 1മ 08മി-ൽ ശരിയാക്കുന്നു" : "Worker fixes it in 1h 08m"} value={ml ? "8 അധിക മിനിറ്റ്" : "8 extra minutes"} tone="plain" />
          <Row label={ml ? "അധികം (8 × ₹10/മി)" : "Extra billed after (8 × ₹10/min)"} value="₹80 + GST" tone="after" />
          <div className="mt-1 border-t border-line pt-2">
            <Row label={ml ? "68 മിനിറ്റിന് ആകെ" : "Total for 68 minutes"} value="₹680 + GST" tone="total" />
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-good-light px-2.5 py-2 text-[11px] leading-relaxed text-good">
          {ml
            ? "✅ 5 മിനിറ്റ് ഗ്രേസ് ഉള്ളതിനാൽ 1മ 03മി ജോലിയും ഒരു മണിക്കൂറായി കണക്കാക്കും — ചെറിയ തർക്കമില്ല. 40 മിനിറ്റ് ജോലിയോ? ബേസ് അവർ ഏറ്റവും കുറഞ്ഞ തുകയാണ്, തൊഴിലാളിയുടെ സമയവും യാത്രയും എപ്പോഴും മൂടും."
            : "✅ A 5-minute grace means a 1h 03m job still bills as one hour — no nickel-and-diming. Quick 40-minute fix? The base hour is the minimum, so the worker's time & travel are always covered."}
        </p>
      </Card>

      {/* Cancellations */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        {ml ? "റദ്ദാക്കലും റീഫണ്ടും" : "Cancellations & refunds"}
      </h2>
      <Card className="mb-5">
        <div className="flex flex-col gap-2 text-[11px] leading-relaxed">
          <p className="flex items-start gap-2">
            <span>✅</span>
            <span className="text-mid">
              <b className="text-ink">{ml ? "തൊഴിലാളി സ്വീകരിക്കുന്നതിന് മുൻപ്" : "Before a worker accepts"}</b>
              {ml ? " — സൗജന്യമായി റദ്ദാക്കാം, മുഴുവൻ തുകയും കാം ക്യാഷിലേക്ക്." : " — cancel free, full amount back to KAAM Cash."}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span>🔒</span>
            <span className="text-mid">
              <b className="text-ink">{ml ? "തൊഴിലാളി സ്വീകരിച്ച ശേഷം" : "After a worker accepts"}</b>
              {ml ? " — മുൻകൂർ തുക (ബേസ് അവർ അല്ലെങ്കിൽ അഡ്വാൻസ്) തൊഴിലാളിയുടെ സമയത്തിനും യാത്രയ്ക്കും." : " — the upfront amount (base hour or advance) goes to the worker for the time & travel they committed to you."}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span>💚</span>
            <span className="text-mid">
              <b className="text-ink">{ml ? "തൊഴിലാളി റദ്ദാക്കിയാൽ/ആരും ഇല്ലെങ്കിൽ" : "If the worker cancels or none is available"}</b>
              {ml ? " — എപ്പോഴും മുഴുവൻ റീഫണ്ട്. കാമിന്റെ വീഴ്ചയ്ക്ക് നിങ്ങളിൽ നിന്ന് ഈടാക്കില്ല." : " — you always get a full refund. You're never charged for a KAAM-side miss."}
            </span>
          </p>
        </div>
      </Card>

      {/* Two-way fairness */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">{ml ? "ഇരുവർക്കും ന്യായം" : "Fair to both sides"}</h2>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-lg">🙋 {ml ? "നിങ്ങൾ" : "You"}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-mid">
            {ml
              ? "ഇല്ലാത്ത ഒരു മണിക്കൂറിന് പണം നൽകേണ്ട. മറഞ്ഞ ചാർജില്ല. ജോലി നടന്നില്ലെങ്കിൽ റീഫണ്ട് കാം ക്യാഷിലേക്ക്."
              : "Never pay for a phantom hour. No hidden charges. Refunds return to KAAM Cash if a job can't happen."}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-lg">🛠️ {ml ? "തൊഴിലാളി" : "The worker"}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-mid">
            {ml
              ? "സമയവും യാത്രയും ബേസ് അവർ എപ്പോഴും മൂടും, ജോലി ചെയ്ത ഓരോ അധിക മിനിറ്റിനും പണം. കൂലിയില്ലാത്ത വരവില്ല."
              : "Time & travel always covered by the base hour, and paid for every extra minute they work. No unpaid call-outs."}
          </p>
        </div>
      </div>

      <Link
        href="/app/search"
        className="flex items-center justify-center gap-2 rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
      >
        🔍 {ml ? "തൊഴിലാളിയെ കണ്ടെത്തൂ" : "Find a worker"}
      </Link>
    </main>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "now" | "after" | "plain" | "total";
}) {
  const valueClass =
    tone === "total"
      ? "font-extrabold text-ink"
      : tone === "now"
        ? "font-bold text-good"
        : tone === "after"
          ? "font-bold text-info"
          : "font-semibold text-mid";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={tone === "total" ? "font-bold text-ink" : "text-mid"}>{label}</span>
      <span className={`shrink-0 tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
