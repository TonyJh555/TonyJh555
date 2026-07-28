"use client";

import Link from "next/link";
import {
  activeRoles,
  crewHeads,
  crewProblem,
  crewSummary,
  suggestCrew,
  tooBigForCrew,
  CREW_ROLES,
  MAX_CREW,
  type CrewRole,
} from "@/lib/crew";
import { inr } from "@/lib/format";
import type { CategoryId } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/**
 * "It's a function" — booking a crew instead of one person.
 *
 * A sadya for two hundred is four cooks, six people serving, and somebody to
 * set up and clear away. Booking that one worker at a time meant six separate
 * bookings, six acceptances and six payments, so families called the cook they
 * always call instead. This is the same booking with a headcount on it.
 *
 * The guest count fills the crew in as a first guess and then gets out of the
 * way: the family knows whether it is a sit-down sadya or a stand-up
 * reception, and every number here can be changed.
 */
export function CrewPicker({
  leadName,
  leadCategoryId,
  guests,
  roles,
  onGuests,
  onRoles,
  /** ₹ per person per booked tenure, for the "each" line. */
  perHead,
}: {
  leadName: string;
  leadCategoryId: CategoryId;
  guests: number;
  roles: CrewRole[];
  onGuests: (guests: number) => void;
  onRoles: (roles: CrewRole[]) => void;
  perHead: number;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";

  const heads = crewHeads(activeRoles(roles));
  const problem = crewProblem(roles, ml);
  const oversized = tooBigForCrew(roles);
  const first = leadName.split(" ")[0];

  const setCount = (categoryId: CategoryId, count: number) => {
    const next = roles.some((r) => r.categoryId === categoryId)
      ? roles.map((r) => (r.categoryId === categoryId ? { ...r, count: Math.max(0, count) } : r))
      : [...roles, { categoryId, count: Math.max(0, count) }];
    onRoles(next);
  };

  const countOf = (categoryId: CategoryId) =>
    roles.find((r) => r.categoryId === categoryId)?.count ?? 0;

  return (
    <div className="mb-5 rounded-xl border border-kaam-mid bg-kaam-light p-3">
      <p className="text-xs font-extrabold text-kaam">
        🎪 {ml ? "ഒരു ഫംഗ്‌ഷനാണോ? സംഘത്തെ ബുക്ക് ചെയ്യൂ" : "It's a function — book a crew"}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {ml
          ? `${first} സംഘത്തെ കൊണ്ടുവരും. ഒരു ബുക്കിംഗ്, ഒരു പേയ്‌മെന്റ്, ഉത്തരവാദിത്തം ${first}-ന്.`
          : `${first} brings the crew. One booking, one payment, and ${first} is answerable for everyone turning up.`}
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[11px] font-bold text-ink">{ml ? "എത്ര പേർക്ക്?" : "How many guests?"}</span>
        <input
          inputMode="numeric"
          value={guests || ""}
          onChange={(e) => onGuests(Number(e.target.value.replace(/\D/g, "")) || 0)}
          placeholder="200"
          className="w-20 rounded-lg border border-line bg-white px-2 py-1.5 text-center text-xs font-bold outline-none focus:border-kaam"
        />
        <button
          onClick={() => onRoles(suggestCrew(guests, leadCategoryId))}
          className="rounded-lg border border-kaam-mid bg-white px-2.5 py-1.5 text-[11px] font-bold text-kaam"
        >
          {ml ? "സംഘത്തെ നിർദ്ദേശിക്കൂ" : "Suggest a crew"}
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {CREW_ROLES.map((role) => {
          const count = countOf(role.categoryId);
          const isLead = role.categoryId === leadCategoryId;
          return (
            <div
              key={role.categoryId}
              className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-ink">
                  {ml ? role.labelMl : role.label}
                  {isLead && (
                    <span className="ml-1 text-[10px] font-bold text-kaam">
                      {ml ? `(${first} ഇതിൽ)` : `(incl. ${first})`}
                    </span>
                  )}
                </p>
                <p className="text-[10px] leading-relaxed text-mid">{ml ? role.hintMl : role.hint}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setCount(role.categoryId, count - 1)}
                  disabled={count === 0}
                  aria-label={`fewer ${role.label}`}
                  className="h-7 w-7 rounded-lg border border-line text-sm font-bold text-mid disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-5 text-center text-xs font-extrabold tabular-nums text-ink">
                  {count}
                </span>
                <button
                  onClick={() => setCount(role.categoryId, count + 1)}
                  aria-label={`more ${role.label}`}
                  className="h-7 w-7 rounded-lg border border-kaam-mid bg-white text-sm font-bold text-kaam"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {heads >= 2 && !oversized && (
        <div className="mt-2.5 rounded-lg border border-line bg-white px-2.5 py-2">
          <p className="text-[11px] font-extrabold text-ink">
            👥 {heads} {ml ? "പേർ" : "people"} · {crewSummary(roles, ml)}
          </p>
          <p className="mt-0.5 text-[11px] text-mid">
            {ml ? "ഒരാൾക്ക് " : "That's "}
            <span className="font-bold text-ink">{inr(perHead)}</span>
            {ml ? " വീതം (നികുതി ഉൾപ്പെടെ)" : " per person, tax included"}
          </p>
        </div>
      )}

      {problem && (
        <div className="mt-2.5 rounded-lg border border-warn-mid bg-warn-light px-2.5 py-2">
          <p className="text-[11px] font-bold leading-relaxed text-warn">{problem}</p>
          {oversized && (
            <Link
              href="/events"
              className="mt-1.5 block rounded-lg bg-kaam py-2 text-center text-[11px] font-extrabold text-white"
            >
              {ml
                ? `${MAX_CREW}+ പേർ — ഇവന്റ് കമ്പനികളോട് വില ചോദിക്കൂ →`
                : `Over ${MAX_CREW} — ask event companies for a price →`}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
