"use client";

import type { Quote } from "@/lib/types";
import { inr } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

/**
 * Price breakdown, shaped per audience:
 * - "user": customer-facing invoice — service amount, GST, cess, total.
 *   The platform commission is settled behind the scenes and never shown.
 * - "worker": earnings view — service amount minus platform fee and TDS.
 * Bilingual (EN/ML); statutory tax names (GST/TDS) stay as-is.
 */
export function QuoteBreakdown({
  quote,
  perspective = "user",
}: {
  quote: Quote;
  perspective?: "user" | "worker";
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const surgeSuffix = quote.surgeApplied ? (ml ? " (സർജ് ×1.2 ഉൾപ്പെടെ)" : " (incl. surge ×1.2)") : "";
  const row = (label: string, value: string, cls = "") => (
    <div className={`flex items-center justify-between py-1.5 text-sm ${cls}`}>
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );

  if (perspective === "worker") {
    return (
      <div className="divide-y divide-line">
        {row(`${ml ? "ജോലിയുടെ മൂല്യം" : "Job value"}${surgeSuffix}`, inr(quote.serviceAmount))}
        {row(ml ? "കാം പ്ലാറ്റ്ഫോം ഫീസ് (15%)" : "KAAM platform fee (15%)", `− ${inr(quote.platformFee)}`, "text-mid")}
        {row("TDS @1% (Sec 194-O)", `− ${inr(quote.tds)}`, "text-mid")}
        {row(ml ? "നിങ്ങൾക്ക് ലഭിക്കും" : "You receive", inr(quote.workerPayout), "text-base font-extrabold text-good")}
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {row(`${ml ? "സേവന തുക" : "Service amount"}${surgeSuffix}`, inr(quote.serviceAmount))}
      {row("GST @18%", `+ ${inr(quote.gst)}`, "text-mid")}
      {quote.cess > 0 && row(ml ? "സംസ്ഥാന ക്ഷേമ സെസ്" : "State welfare cess", `+ ${inr(quote.cess)}`, "text-mid")}
      {row(ml ? "ആകെ നൽകേണ്ടത്" : "Total you pay", inr(quote.totalUserPays), "text-base font-extrabold text-kaam")}
    </div>
  );
}
