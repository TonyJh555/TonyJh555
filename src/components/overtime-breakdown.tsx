"use client";

import type { OvertimeLine } from "@/lib/overtime";
import { inr } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

/**
 * How the overtime charge was worked out — every step, both sides.
 *
 * The customer sees where their extra rupees went; the worker sees what those
 * minutes earned them. Same numbers, same source, so neither has to take the
 * other's word for it. A marketplace that hides its arithmetic is asking to be
 * distrusted.
 */
export function OvertimeBreakdown({
  line,
  perspective,
}: {
  line: OvertimeLine;
  perspective: "customer" | "worker";
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";

  const row = (label: string, value: string, strong = false) => (
    <div className={`flex justify-between py-1 ${strong ? "border-t border-warn-mid pt-1.5" : ""}`}>
      <span className={strong ? "font-extrabold" : "opacity-90"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-extrabold" : "font-semibold"}`}>{value}</span>
    </div>
  );

  return (
    <div className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-3 text-[11px] leading-relaxed text-warn">
      <p className="font-extrabold">
        ⏱ {ml ? "അധിക സമയം എങ്ങനെ കണക്കാക്കി" : "How the extra time was worked out"}
      </p>

      <div className="mt-2">
        {row(
          ml ? "ജോലി ചെയ്ത സമയം" : "Time worked",
          `${line.actualMinutes} ${ml ? "മിനിറ്റ്" : "min"}`,
        )}
        {row(
          ml ? `ബേസ് അവർ (ആദ്യ ${line.baseMinutes} മിനിറ്റ്)` : `Base hour (first ${line.baseMinutes} min)`,
          ml ? "വിലയിൽ ഉൾപ്പെട്ടു" : "already paid",
        )}
        {row(
          ml ? "അധിക മിനിറ്റ്" : "Extra minutes",
          `${line.extraMinutes} ${ml ? "മിനിറ്റ്" : "min"}`,
        )}
        {row(
          ml ? "മിനിറ്റ് നിരക്ക്" : "Per-minute rate",
          `${inr(line.ratePerHour)}/${ml ? "മണിക്കൂർ" : "hr"} ÷ 60 = ₹${line.ratePerMinute.toFixed(2)}`,
        )}
        {line.surgeApplied && row(ml ? "സർജ്" : "Surge", "×1.2")}
        {row(
          `${line.extraMinutes} × ₹${line.ratePerMinute.toFixed(2)}`,
          inr(line.extraService),
        )}
      </div>

      {perspective === "customer" ? (
        <div className="mt-1">
          {row("GST @18%", `+ ${inr(line.extraGst)}`)}
          {line.extraCess > 0 &&
            row(ml ? "സംസ്ഥാന ക്ഷേമ സെസ്" : "State welfare cess", `+ ${inr(line.extraCess)}`)}
          {row(ml ? "അധികമായി അടയ്ക്കുന്നത്" : "Extra you pay", inr(line.extraTotal), true)}
        </div>
      ) : (
        <div className="mt-1">
          {row(ml ? "കാം ഫീസ് (15%)" : "KAAM fee (15%)", `− ${inr(line.platformFee)}`)}
          {row("TDS @1%", `− ${inr(line.tds)}`)}
          {row(ml ? "അധികമായി നിങ്ങൾക്ക്" : "Extra you earn", inr(line.workerExtra), true)}
        </div>
      )}

      <p className="mt-2 opacity-80">
        {ml
          ? "ജോലി ചെയ്ത മിനിറ്റുകൾക്ക് മാത്രം — ഒരിക്കലും മുഴുവൻ മണിക്കൂറായി കൂട്ടില്ല."
          : "Only the minutes actually worked — never rounded up to a full hour."}
      </p>
    </div>
  );
}
