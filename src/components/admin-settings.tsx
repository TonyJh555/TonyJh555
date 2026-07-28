"use client";

import { useState } from "react";
import { resetContent, saveContent, useContent } from "@/lib/content";
import {
  sanitisePlusPrices,
  sanitiseRewards,
  DEFAULT_PLUS,
  DEFAULT_REWARDS,
  PLUS_KEY,
  PLUS_LIMITS,
  REWARDS_KEY,
  REWARD_LIMITS,
  type Limit,
} from "@/lib/site-settings";
import { DEFAULT_FAQS, FAQ_KEY, sanitiseFaqs, type Faq } from "@/lib/faqs";

/**
 * The owner's console for the numbers and answers that change without warning.
 *
 * Referral bonuses, the membership price, and the Help centre's questions all
 * move for commercial reasons — a competitor's offer, a policy change, the
 * question forty people asked this week. Waiting on a developer for those is
 * how a marketplace loses a week it cannot afford.
 *
 * What is NOT here, and will not be: GST, TDS, the platform fee, the
 * fair-billing meter, and the service catalogue. The first four are law and
 * arithmetic; the last is structure the whole app is keyed to. Those change in
 * code, with a test and a review.
 *
 * Every edit is one JSON document, and "reset" deletes it rather than writing
 * the defaults back — so a bad edit can never be permanent, and a fresh
 * install with an empty table looks exactly like this one.
 */

function Row({
  limit,
  value,
  onChange,
}: {
  limit: Limit;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-bold text-ink">{limit.label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-mid">{limit.note}</p>
        <p className="mt-0.5 text-[10px] text-dim">
          ₹{limit.min}–₹{limit.max} · default ₹{limit.fallback}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs font-bold text-mid">₹</span>
        <input
          inputMode="numeric"
          aria-label={limit.label}
          value={value}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
          className="w-20 rounded-lg border border-line px-2 py-1.5 text-right text-xs font-bold outline-none focus:border-kaam"
        />
      </div>
    </div>
  );
}

/** Referral money and the membership price. */
export function SettingsEditor({ editor }: { editor?: string }) {
  const rewards = sanitiseRewards(useContent<unknown>(REWARDS_KEY, DEFAULT_REWARDS));
  const plus = sanitisePlusPrices(useContent<unknown>(PLUS_KEY, DEFAULT_PLUS));
  const [draftRewards, setDraftRewards] = useState<Record<string, number> | null>(null);
  const [draftPlus, setDraftPlus] = useState<Record<string, number> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const r: Record<string, number> = draftRewards ?? rewards;
  const p: Record<string, number> = draftPlus ?? plus;
  const dirty = draftRewards !== null || draftPlus !== null;

  // Out-of-range values are clamped on save anyway; saying so first is fairer
  // than silently correcting somebody's number after they press the button.
  const outside = (values: Record<string, number>, limits: Record<string, Limit>) =>
    Object.entries(limits).filter(([k, l]) => values[k] < l.min || values[k] > l.max);
  const outOfRange = [...outside(r, REWARD_LIMITS), ...outside(p, PLUS_LIMITS)];

  const save = () => {
    const okR = saveContent(REWARDS_KEY, sanitiseRewards(r), editor);
    const okP = saveContent(PLUS_KEY, sanitisePlusPrices(p), editor);
    setDraftRewards(null);
    setDraftPlus(null);
    setMsg(okR && okP ? "Saved — live on every device." : "Saved here, but the browser refused to store it.");
  };

  const reset = () => {
    resetContent(REWARDS_KEY);
    resetContent(PLUS_KEY);
    setDraftRewards(null);
    setDraftPlus(null);
    setMsg("Back to the amounts KAAM ships with.");
  };

  return (
    <section className="mb-6 rounded-2xl border border-line bg-white p-4">
      <h2 className="font-display text-base font-extrabold">💸 Offers & membership</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        Money KAAM gives away to grow, and what Plus costs. Changes apply to
        everything from the moment you save — bonuses already credited to a
        customer are untouched.
      </p>

      <div className="mt-3">
        {(Object.keys(REWARD_LIMITS) as (keyof typeof REWARD_LIMITS)[]).map((key) => (
          <Row
            key={key}
            limit={REWARD_LIMITS[key]}
            value={r[key]}
            onChange={(next) => setDraftRewards({ ...r, [key]: next })}
          />
        ))}
        {(Object.keys(PLUS_LIMITS) as (keyof typeof PLUS_LIMITS)[]).map((key) => (
          <Row
            key={key}
            limit={PLUS_LIMITS[key]}
            value={p[key]}
            onChange={(next) => setDraftPlus({ ...p, [key]: next })}
          />
        ))}
      </div>

      {outOfRange.length > 0 && (
        <p className="mt-2 rounded-lg border border-warn-mid bg-warn-light px-2.5 py-2 text-[11px] font-bold leading-relaxed text-warn">
          ⚠️ {outOfRange.map(([, l]) => l.label).join(", ")} — outside the safe
          range. Saving will pull{" "}
          {outOfRange.length === 1 ? "it" : "them"} back to the nearest limit.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={!dirty}
          className="flex-1 rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
        >
          {dirty ? "Save changes" : "Nothing to save"}
        </button>
        <button
          onClick={reset}
          className="rounded-xl border border-line px-3 py-2.5 text-xs font-bold text-mid"
        >
          Reset to default
        </button>
      </div>
      {msg && <p className="mt-2 text-[11px] font-semibold text-good">{msg}</p>}
    </section>
  );
}

const BLANK: Faq = { q: "", qMl: "", a: "", aMl: "" };

/** The Help centre's questions and answers, in both languages. */
export function FaqEditor({ editor }: { editor?: string }) {
  const saved = sanitiseFaqs(useContent<unknown>(FAQ_KEY, DEFAULT_FAQS));
  const [draft, setDraft] = useState<Faq[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const faqs = draft ?? saved;
  const dirty = draft !== null;
  // An entry with no question or no answer would silently vanish on save.
  const incomplete = faqs.filter((f) => !f.q.trim() || !f.a.trim()).length;

  const edit = (idx: number, patch: Partial<Faq>) =>
    setDraft(faqs.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const move = (idx: number, by: number) => {
    const to = idx + by;
    if (to < 0 || to >= faqs.length) return;
    const next = [...faqs];
    [next[idx], next[to]] = [next[to], next[idx]];
    setDraft(next);
    setOpenIdx(to);
  };

  const save = () => {
    const clean = sanitiseFaqs(faqs);
    const ok = saveContent(FAQ_KEY, clean, editor);
    setDraft(null);
    setOpenIdx(null);
    setMsg(
      ok
        ? `Saved — ${clean.length} question${clean.length === 1 ? "" : "s"} live.`
        : "Saved here, but the browser refused to store it.",
    );
  };

  return (
    <section className="mb-6 rounded-2xl border border-line bg-white p-4">
      <h2 className="font-display text-base font-extrabold">❓ Help centre questions</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        What customers see under Help. Leave the Malayalam blank and it falls
        back to the English — better a wrong-language answer than none.
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        {faqs.map((faq, idx) => (
          <div key={idx} className="rounded-xl border border-line">
            <div className="flex items-center gap-1 px-2.5 py-2">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-xs font-bold text-ink">
                  {faq.q || "(new question)"}
                </span>
                <span className="block truncate text-[10px] text-mid">{faq.a || "—"}</span>
              </button>
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="move up"
                className="h-7 w-7 rounded-lg border border-line text-xs text-mid disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === faqs.length - 1}
                aria-label="move down"
                className="h-7 w-7 rounded-lg border border-line text-xs text-mid disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => {
                  setDraft(faqs.filter((_, i) => i !== idx));
                  setOpenIdx(null);
                }}
                aria-label="delete question"
                className="h-7 w-7 rounded-lg border border-line text-xs text-kaam"
              >
                ✕
              </button>
            </div>

            {openIdx === idx && (
              <div className="border-t border-line p-2.5">
                {(
                  [
                    ["q", "Question (English)"],
                    ["qMl", "Question (Malayalam)"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="mb-2 block">
                    <span className="text-[10px] font-bold text-dim">{label}</span>
                    <input
                      value={faq[field]}
                      onChange={(e) => edit(idx, { [field]: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-line px-2 py-1.5 text-xs outline-none focus:border-kaam"
                    />
                  </label>
                ))}
                {(
                  [
                    ["a", "Answer (English)"],
                    ["aMl", "Answer (Malayalam)"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="mb-2 block">
                    <span className="text-[10px] font-bold text-dim">{label}</span>
                    <textarea
                      value={faq[field]}
                      onChange={(e) => edit(idx, { [field]: e.target.value })}
                      rows={3}
                      className="mt-0.5 w-full rounded-lg border border-line px-2 py-1.5 text-xs outline-none focus:border-kaam"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setDraft([...faqs, BLANK]);
          setOpenIdx(faqs.length);
        }}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-2 text-xs font-bold text-mid"
      >
        + Add a question
      </button>

      {incomplete > 0 && (
        <p className="mt-2 rounded-lg border border-warn-mid bg-warn-light px-2.5 py-2 text-[11px] font-bold leading-relaxed text-warn">
          ⚠️ {incomplete} entr{incomplete === 1 ? "y" : "ies"} missing a question
          or an answer — those will be dropped when you save.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={!dirty}
          className="flex-1 rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
        >
          {dirty ? "Save changes" : "Nothing to save"}
        </button>
        <button
          onClick={() => {
            resetContent(FAQ_KEY);
            setDraft(null);
            setOpenIdx(null);
            setMsg("Back to the questions KAAM ships with.");
          }}
          className="rounded-xl border border-line px-3 py-2.5 text-xs font-bold text-mid"
        >
          Reset to default
        </button>
      </div>
      {msg && <p className="mt-2 text-[11px] font-semibold text-good">{msg}</p>}
    </section>
  );
}
