"use client";

import { useState } from "react";
import { useCustomer } from "@/lib/auth";
import {
  useSubscriptions,
  subscriptionsFor,
  cancelSubscription,
  setAutoRenew,
  daysUntil,
} from "@/lib/subscriptions";
import { getCategory } from "@/data/categories";
import { inr } from "@/lib/format";
import type { Subscription } from "@/lib/types";
import { Card, Tag } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";
import { PlanSessions } from "@/components/plan-sessions";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_TAG: Record<
  Subscription["status"],
  { label: string; labelMl: string; color: "green" | "yellow" | "gray" }
> = {
  active: { label: "● Active", labelMl: "● സജീവം", color: "green" },
  cancelled: { label: "Cancelling", labelMl: "റദ്ദാക്കുന്നു", color: "yellow" },
  expired: { label: "Ended", labelMl: "അവസാനിച്ചു", color: "gray" },
};

function PlanCard({ sub }: { sub: Subscription }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const category = getCategory(sub.categoryId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const days = daysUntil(sub.renewsOn);
  const tag = STATUS_TAG[sub.status];

  return (
    <Card className="fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {category.icon} {sub.service}
          </p>
          <p className="text-xs text-mid">
            {sub.workerName} · {sub.months}-month plan
            {sub.online ? " · 💻 Online" : ""}
          </p>
        </div>
        <Tag color={tag.color}>{ml ? tag.labelMl : tag.label}</Tag>
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
        <div>
          <p className="text-lg font-extrabold text-kaam">{inr(sub.monthlyAmount)}</p>
          <p className="text-[10px] text-dim">{ml ? "പ്രതിമാസം" : "per month"} · {inr(sub.termAmount)} / {ml ? "ടേം" : "term"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-dim uppercase">
            {sub.status === "active" && sub.autoRenew ? (ml ? "പുതുക്കും" : "Renews") : ml ? "വരെ" : "Runs until"}
          </p>
          <p className="text-xs font-bold text-ink">{fmtDate(sub.renewsOn)}</p>
          {sub.status === "active" && days >= 0 && (
            <p className="text-[10px] text-mid">{ml ? `${days} ദിവസത്തിനുള്ളിൽ` : `in ${days} day${days === 1 ? "" : "s"}`}</p>
          )}
        </div>
      </div>

      {sub.status === "active" && <PlanSessions sub={sub} />}

      {sub.status === "active" && (
        <>
          {/* Auto-renew toggle */}
          <button
            onClick={() => setAutoRenew(sub.id, !sub.autoRenew)}
            className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
              sub.autoRenew ? "border-good bg-good-light" : "border-line bg-white"
            }`}
          >
            <span className="text-lg">♻️</span>
            <span className="flex-1">
              <span className="block text-xs font-bold text-ink">{ml ? "സ്വയം പുതുക്കൽ" : "Auto-renew"}</span>
              <span className="block text-[10px] text-mid">
                {sub.autoRenew
                  ? ml ? "അടുത്ത ടേമിലും അതേ തൊഴിലാളിയും വിലയും" : "Keeps the same worker & price for the next term"
                  : ml ? "മുകളിലെ തീയതിയിൽ ഈ പ്ലാൻ അവസാനിക്കും" : "This plan will end on the date above"}
              </span>
            </span>
            <span
              className={`relative flex h-5 w-9 items-center rounded-full transition-colors ${
                sub.autoRenew ? "bg-good" : "bg-line"
              }`}
            >
              <span
                className={`absolute h-4 w-4 rounded-full bg-white transition-all ${
                  sub.autoRenew ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
          </button>

          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="mt-2 w-full rounded-xl border border-line bg-surf py-2 text-xs font-bold text-mid"
            >
              {ml ? "പ്ലാൻ റദ്ദാക്കൂ" : "Cancel plan"}
            </button>
          ) : (
            <div className="mt-2 rounded-xl border border-kaam-mid bg-kaam-light p-3">
              <p className="text-xs font-bold text-kaam">{ml ? "ഈ കെയർ പ്ലാൻ റദ്ദാക്കണോ?" : "Cancel this Care Plan?"}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-mid">
                {ml
                  ? `നിലവിലെ ടേം ${fmtDate(sub.renewsOn)} വരെ സജീവമാണ് — അടച്ച പണത്തിന്റെ എല്ലാ ആനുകൂല്യവും ലഭിക്കും. അതിനുശേഷം പുതുക്കില്ല എന്ന് മാത്രം.`
                  : `Your current term stays active until ${fmtDate(sub.renewsOn)} — you keep everything you've paid for. It just won't renew after that.`}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => cancelSubscription(sub.id)}
                  className="flex-1 rounded-lg bg-kaam py-2 text-xs font-bold text-white"
                >
                  {ml ? "അതെ, പുതുക്കൽ വേണ്ട" : "Yes, cancel renewal"}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 rounded-lg border border-line bg-white py-2 text-xs font-bold text-mid"
                >
                  {ml ? "പ്ലാൻ തുടരൂ" : "Keep plan"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Billing history */}
      <button
        onClick={() => setShowHistory((v) => !v)}
        className="mt-3 flex w-full items-center justify-between border-t border-line pt-3 text-xs font-bold text-mid"
      >
        <span>🧾 {ml ? "ബില്ലിംഗ് ചരിത്രം" : "Billing history"} ({sub.history.length})</span>
        <span>{showHistory ? "▲" : "▼"}</span>
      </button>
      {showHistory && (
        <div className="mt-2 flex flex-col gap-1.5">
          {sub.history.map((c, i) => (
            <div
              key={`${c.ref}-${i}`}
              className="flex items-center justify-between rounded-lg bg-surf px-3 py-2 text-[11px]"
            >
              <span className="font-semibold text-mid">{fmtDate(c.date)}</span>
              <span className="font-bold text-ink">{inr(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Customer's active & past Care Plans. Renders nothing when there are none. */
export function MyPlans() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const customer = useCustomer();
  const subs = subscriptionsFor(useSubscriptions(), customer?.id);
  if (subs.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-base font-extrabold">♻️ {ml ? "എന്റെ കെയർ പ്ലാനുകൾ" : "My Care Plans"}</h2>
        <span className="rounded-full bg-good-light px-2 py-0.5 text-[10px] font-extrabold text-good">
          {subs.filter((s) => s.status === "active").length} {ml ? "സജീവം" : "active"}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {subs.map((sub) => (
          <PlanCard key={sub.id} sub={sub} />
        ))}
      </div>
    </section>
  );
}
