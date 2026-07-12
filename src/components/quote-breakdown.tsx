import type { Quote } from "@/lib/types";
import { inr } from "@/lib/format";

/**
 * Full tax-invoice breakdown, matching the build guide §2.2.
 * `perspective` controls whether the user total or the worker payout is
 * highlighted as the bottom line.
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

  return (
    <div className="divide-y divide-line">
      {row(
        `Service amount${quote.surgeApplied ? " (incl. surge ×1.2)" : ""}`,
        inr(quote.serviceAmount),
      )}
      {row("GST @18% (remitted as TCS)", `+ ${inr(quote.gst)}`, "text-mid")}
      {quote.cess > 0 && row("State welfare cess", `+ ${inr(quote.cess)}`, "text-mid")}
      {row(
        "Total you pay",
        inr(quote.totalUserPays),
        perspective === "user"
          ? "text-base font-extrabold text-kaam"
          : "font-bold",
      )}
      {row("KAAM platform fee (15%)", `− ${inr(quote.platformFee)}`, "text-mid")}
      {row("TDS @1% (Sec 194-O)", `− ${inr(quote.tds)}`, "text-mid")}
      {row(
        "Worker receives",
        inr(quote.workerPayout),
        perspective === "worker"
          ? "text-base font-extrabold text-good"
          : "font-bold text-good",
      )}
    </div>
  );
}
