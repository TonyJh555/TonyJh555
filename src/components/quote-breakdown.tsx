import type { Quote } from "@/lib/types";
import { inr } from "@/lib/format";

/**
 * Price breakdown, shaped per audience:
 * - "user": customer-facing invoice — service amount, GST, cess, total.
 *   The platform commission is settled behind the scenes and never shown.
 * - "worker": earnings view — service amount minus platform fee and TDS.
 */
export function QuoteBreakdown({
  quote,
  perspective = "user",
}: {
  quote: Quote;
  perspective?: "user" | "worker";
}) {
  const row = (label: string, value: string, cls = "") => (
    <div className={`flex items-center justify-between py-1.5 text-sm ${cls}`}>
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );

  if (perspective === "worker") {
    return (
      <div className="divide-y divide-line">
        {row(
          `Job value${quote.surgeApplied ? " (incl. surge ×1.2)" : ""}`,
          inr(quote.serviceAmount),
        )}
        {row("KAAM platform fee (15%)", `− ${inr(quote.platformFee)}`, "text-mid")}
        {row("TDS @1% (Sec 194-O)", `− ${inr(quote.tds)}`, "text-mid")}
        {row("You receive", inr(quote.workerPayout), "text-base font-extrabold text-good")}
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {row(
        `Service amount${quote.surgeApplied ? " (incl. surge ×1.2)" : ""}`,
        inr(quote.serviceAmount),
      )}
      {row("GST @18%", `+ ${inr(quote.gst)}`, "text-mid")}
      {quote.cess > 0 && row("State welfare cess", `+ ${inr(quote.cess)}`, "text-mid")}
      {row("Total you pay", inr(quote.totalUserPays), "text-base font-extrabold text-kaam")}
    </div>
  );
}
