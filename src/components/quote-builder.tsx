"use client";

import { useState } from "react";
import { inr } from "@/lib/format";
import {
  balanceMilestones,
  daysToEvent,
  EVENT_KINDS,
  linesSubtotal,
  milestoneProblem,
  quoteTotals,
  SUGGESTED_MILESTONES,
  type EventQuote,
  type EventRequest,
  type QuoteLine,
  type QuoteMilestone,
} from "@/lib/events";
import { createQuote, updateEventQuote } from "@/lib/event-store";
import { offsiteWarning } from "@/lib/offsite";
import { useLanguage } from "@/components/language-provider";

/**
 * How a company prices an event: one line at a time, then the payment stages.
 *
 * A wedding has no rate. It has a stage, lights, a crew and food, each with
 * its own number, and the only quote worth trusting is the one that shows
 * them separately — a customer comparing three companies on a single lump sum
 * is comparing nothing.
 *
 * The stages are the company's own. Nobody blocks a December date for a
 * stranger on a percentage a platform picked, and a decorator buying flowers a
 * week ahead needs the money a week ahead. KAAM suggests a plan and gets out
 * of the way; the only rule enforced is that the stages add up to the quoted
 * price exactly, so the customer is never asked for a rupee more than they
 * agreed to.
 */
export function QuoteBuilder({
  request,
  companyId,
  companyName,
  existing,
  onDone,
}: {
  request: EventRequest;
  companyId: string;
  companyName: string;
  existing?: EventQuote;
  onDone: () => void;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [lines, setLines] = useState<QuoteLine[]>(existing?.lines ?? []);
  const [milestones, setMilestones] = useState<QuoteMilestone[]>(
    existing?.milestones ?? SUGGESTED_MILESTONES,
  );
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const totals = quoteTotals(lines, request.stateId);
  const kind = EVENT_KINDS.find((k) => k.id === request.kind);
  const days = daysToEvent(request);

  const addLine = () => {
    const value = Math.round(Number(amount));
    if (!label.trim() || !Number.isFinite(value) || value <= 0) return;
    setLines([...lines, { label: label.trim(), amount: value }]);
    setLabel("");
    setAmount("");
    setError(null);
  };

  const setPercent = (i: number, percent: number) =>
    setMilestones(milestones.map((m, x) => (x === i ? { ...m, percent } : m)));

  // A phone number in the note is how a ₹45,000 commission walks out of the
  // door — and how the customer loses the payment plan, the refund and the
  // dispute desk at the same time. Checked before sending, never after.
  const leak = offsiteWarning(note, "company");

  const send = () => {
    if (leak) {
      setError(ml ? leak.titleMl : leak.title);
      return;
    }
    if (lines.length === 0) {
      setError(ml ? "ഒരു വിലയെങ്കിലും ചേർക്കൂ." : "Add at least one line to the quote.");
      return;
    }
    const problem = milestoneProblem(milestones, totals.totalUserPays);
    if (problem) {
      setError(problem);
      return;
    }
    const payload = {
      requestId: request.id,
      companyId,
      companyName,
      lines,
      milestones,
      note: note.trim() || undefined,
      status: "sent" as const,
      sentAt: new Date().toISOString(),
    };
    if (existing) updateEventQuote(existing.id, payload);
    else createQuote(payload);
    onDone();
  };

  const spread = balanceMilestones(milestones, totals.totalUserPays);

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      {/* What they're pricing */}
      <p className="text-xs font-extrabold text-ink">
        {kind?.icon} {ml ? kind?.labelMl : kind?.label} · {request.guests}{" "}
        {ml ? "അതിഥികൾ" : "guests"}
      </p>
      <p className="mt-0.5 text-[11px] text-mid">
        {request.venue}, {request.district} · {request.date}
        {days >= 0 && ` · ${days} ${ml ? "ദിവസം ബാക്കി" : days === 1 ? "day away" : "days away"}`}
      </p>
      {request.budget > 0 && (
        <p className="mt-0.5 text-[11px] font-semibold text-info">
          💰 {ml ? "അവരുടെ ബജറ്റ്: " : "Their budget: "}
          {inr(request.budget)}
        </p>
      )}
      {request.notes && (
        <p className="mt-1 rounded-lg bg-surf px-2.5 py-1.5 text-[11px] leading-relaxed text-mid">
          {request.notes}
        </p>
      )}

      {/* ── The price, one line at a time ───────────────────────── */}
      <p className="mt-4 text-xs font-extrabold text-ink">
        🧾 {ml ? "നിങ്ങളുടെ വില — ഓരോന്നായി ചേർക്കൂ" : "Your price — add it one line at a time"}
      </p>

      {lines.length > 0 && (
        <table className="mt-2 w-full text-sm">
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="py-1.5 text-mid">{l.label}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{inr(l.amount)}</td>
                <td className="w-8 py-1.5 text-right">
                  <button
                    onClick={() => setLines(lines.filter((_, x) => x !== i))}
                    aria-label={ml ? "നീക്കം ചെയ്യൂ" : "Remove"}
                    className="text-xs font-bold text-kaam"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-2 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={ml ? "എന്ത്? ഉദാ: സ്റ്റേജ്" : "What? e.g. Stage & backdrop"}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          placeholder="₹"
          className="w-24 rounded-lg border border-line bg-surf px-3 py-2 text-right text-xs tabular-nums outline-none focus:border-kaam"
        />
        <button
          onClick={addLine}
          disabled={!label.trim() || !amount}
          className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white disabled:opacity-30"
        >
          +
        </button>
      </div>

      {lines.length > 0 && (
        <div className="mt-3 rounded-xl bg-surf p-3 text-xs">
          <Row label={ml ? "ജോലിയുടെ വില" : "Your work"} value={inr(linesSubtotal(lines))} />
          <Row label="GST @18%" value={`+ ${inr(totals.gst)}`} />
          {totals.cess > 0 && (
            <Row label={ml ? "ക്ഷേമ സെസ്" : "Welfare cess"} value={`+ ${inr(totals.cess)}`} />
          )}
          <Row
            label={ml ? "ഉപഭോക്താവ് നൽകുന്നത്" : "Customer pays"}
            value={inr(totals.totalUserPays)}
            strong
          />
          <div className="mt-2 border-t border-line pt-2">
            <Row label={ml ? "കാം ഫീസ് (15%)" : "KAAM fee (15%)"} value={`− ${inr(totals.platformFee)}`} />
            <Row label="TDS @1%" value={`− ${inr(totals.tds)}`} />
            <Row
              label={ml ? "നിങ്ങൾക്ക് ലഭിക്കുന്നത്" : "You receive"}
              value={inr(totals.workerPayout)}
              strong
              good
            />
          </div>
        </div>
      )}

      {/* ── The company's own payment stages ────────────────────── */}
      <p className="mt-4 text-xs font-extrabold text-ink">
        📆 {ml ? "എപ്പോൾ പണം വേണം — നിങ്ങൾ തീരുമാനിക്കൂ" : "When you want paying — your call"}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-mid">
        {ml
          ? "കാം ഒരു നിർദ്ദേശം മാത്രം നൽകുന്നു. നിങ്ങളുടെ ജോലിക്ക് അനുസരിച്ച് മാറ്റാം — ആകെ 100% ആയാൽ മതി."
          : "KAAM only suggests. Change it to suit your work — the stages just have to add up to 100%."}
      </p>

      <div className="mt-2 flex flex-col gap-1.5">
        {milestones.map((m, i) => (
          <div key={i} className="rounded-lg border border-line bg-surf p-2.5">
            <div className="flex items-center gap-2">
              <input
                value={m.label}
                onChange={(e) =>
                  setMilestones(milestones.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                className="min-w-0 flex-1 rounded border border-line bg-white px-2 py-1.5 text-[11px] font-bold outline-none focus:border-kaam"
              />
              <input
                value={String(m.percent)}
                onChange={(e) => setPercent(i, Number(e.target.value.replace(/[^\d.]/g, "")) || 0)}
                inputMode="decimal"
                className="w-14 rounded border border-line bg-white px-2 py-1.5 text-right text-[11px] tabular-nums outline-none focus:border-kaam"
              />
              <span className="text-[11px] font-bold text-mid">%</span>
              <button
                onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}
                aria-label={ml ? "നീക്കം ചെയ്യൂ" : "Remove"}
                className="text-xs font-bold text-kaam"
              >
                ✕
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                value={m.when}
                onChange={(e) =>
                  setMilestones(milestones.map((x, j) => (j === i ? { ...x, when: e.target.value } : x)))
                }
                placeholder={ml ? "എപ്പോൾ?" : "When is it due?"}
                className="min-w-0 flex-1 rounded border border-line bg-white px-2 py-1.5 text-[10px] outline-none focus:border-kaam"
              />
              <span className="shrink-0 text-[11px] font-extrabold text-ink tabular-nums">
                {inr(spread[i]?.amount ?? 0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() =>
          setMilestones([...milestones, { label: "", percent: 0, when: "" }])
        }
        className="mt-2 w-full rounded-lg border border-line bg-white py-1.5 text-[11px] font-bold text-mid"
      >
        + {ml ? "ഒരു ഘട്ടം കൂടി" : "Add another stage"}
      </button>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={ml ? "ഉപഭോക്താവിനോട് പറയാനുള്ളത് (ഓപ്ഷണൽ)" : "Anything to tell the customer (optional)"}
        className="mt-3 w-full rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
      />

      {leak && (
        <div className="mt-2 rounded-lg border border-warn-mid bg-warn-light p-2.5 text-[11px] leading-relaxed text-warn">
          <p className="font-extrabold">⚠️ {ml ? leak.titleMl : leak.title}</p>
          <p className="mt-0.5">{ml ? leak.bodyMl : leak.body}</p>
          <p className="mt-1 font-semibold">
            {ml ? "നീക്കം ചെയ്യേണ്ടത്: " : "Remove: "}
            {leak.hits.map((h) => h.text).join(", ")}
          </p>
        </div>
      )}

      {error && !leak && (
        <p className="mt-2 rounded-lg border border-kaam-mid bg-kaam-light p-2.5 text-[11px] font-semibold text-kaam">
          {error}
        </p>
      )}

      <button
        onClick={send}
        disabled={Boolean(leak)}
        className="mt-3 w-full rounded-2xl bg-kaam py-3.5 text-sm font-extrabold text-white shadow-kaam disabled:opacity-40"
      >
        {existing
          ? ml ? "വില പുതുക്കൂ" : "Update my quote"
          : ml ? "വില അയയ്ക്കൂ" : "Send this quote"}
      </button>
      <button onClick={onDone} className="mt-2 w-full text-center text-[11px] font-bold text-mid">
        {ml ? "പിന്നീട്" : "Not now"}
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  good,
}: {
  label: string;
  value: string;
  strong?: boolean;
  good?: boolean;
}) {
  return (
    <div className={`flex justify-between py-0.5 ${strong ? "border-t border-line pt-1.5" : ""}`}>
      <span className={strong ? "font-bold text-ink" : "text-mid"}>{label}</span>
      <span
        className={`tabular-nums ${strong ? "font-extrabold" : "font-semibold"} ${good ? "text-good" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
