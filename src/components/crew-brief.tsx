"use client";

import { crewSummary, splitPayout } from "@/lib/crew";
import { inr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/**
 * A crew job, on both sides of it.
 *
 * The worker's copy exists because the payout on a crew job is not theirs —
 * it is the crew's, and a lead who reads ₹43,000 and pays out by memory is how
 * a team stops turning up. So the split is stated before they accept: what
 * each person gets, what the lead gets for carrying it, and the fact that
 * the lead pays their crew.
 *
 * The customer's copy never shows any of that. What KAAM takes is not their
 * business, and it has never been shown to them anywhere else in the app.
 */

/** Worker side: what you're being asked to bring, and how the money divides. */
export function CrewBrief({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const crew = booking.crew;
  if (!crew || crew.heads < 2) return null;

  const split = splitPayout(booking.quote.workerPayout, crew.heads);
  const others = crew.heads - 1;

  return (
    <div className="mt-2 rounded-xl border border-kaam-mid bg-kaam-light p-2.5">
      <p className="text-[11px] font-extrabold text-kaam">
        🎪 {ml ? "സംഘ ജോലി" : "Crew job"} · {crew.heads} {ml ? "പേർ" : "people"}
        {crew.guests ? ` · ${crew.guests} ${ml ? "അതിഥികൾ" : "guests"}` : ""}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-ink">
        {crewSummary(crew.roles, ml)}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {ml
          ? `നിങ്ങളാണ് ലീഡ്. ${others} പേരെ കൂടി കൊണ്ടുവരണം.`
          : `You're the lead — you bring ${others} more ${others === 1 ? "person" : "people"}.`}
      </p>

      <div className="mt-2 rounded-lg border border-line bg-white px-2.5 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold text-ink">
            {ml ? "നിങ്ങൾക്ക്" : "You get"}
          </span>
          <span className="text-sm font-extrabold text-good tabular-nums">
            {inr(split.leadTotal)}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-mid">
          {ml
            ? `${inr(split.eachShare)} നിങ്ങളുടെ വിഹിതം + ${inr(split.leadAllowance)} ലീഡ് അലവൻസ്`
            : `${inr(split.eachShare)} your share + ${inr(split.leadAllowance)} lead allowance`}
        </p>
        <div className="mt-1.5 flex items-baseline justify-between border-t border-line pt-1.5">
          <span className="text-[11px] font-bold text-ink">
            {ml ? `മറ്റ് ${others} പേർക്ക്` : `Each of the other ${others}`}
          </span>
          <span className="text-[11px] font-extrabold tabular-nums text-ink">
            {inr(split.eachShare)}
          </span>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-dim">
          {ml
            ? "മുഴുവൻ തുക നിങ്ങൾക്ക് വരും — സംഘത്തിന് നിങ്ങൾ നൽകണം."
            : "The whole amount comes to you. Paying your crew is on you."}
        </p>
      </div>
    </div>
  );
}

/** Customer side: what you booked, and what one place at the table costs. */
export function CrewLine({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const crew = booking.crew;
  if (!crew || crew.heads < 2) return null;

  const perHead = Math.round(booking.quote.totalUserPays / crew.heads);
  const first = booking.workerName.split(" ")[0];

  return (
    <div className="mt-2 rounded-xl border border-line bg-surf px-2.5 py-2">
      <p className="text-[11px] font-extrabold text-ink">
        🎪 {crew.heads} {ml ? "പേരുടെ സംഘം" : "person crew"}
        {crew.guests ? ` · ${crew.guests} ${ml ? "അതിഥികൾ" : "guests"}` : ""}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-mid">
        {crewSummary(crew.roles, ml)} · {inr(perHead)} {ml ? "ഒരാൾക്ക്" : "each"}
      </p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-dim">
        {ml
          ? `${first} സംഘത്തെ കൊണ്ടുവരും — എല്ലാവരും എത്തുന്നതിന് ${first} ഉത്തരവാദി.`
          : `${first} brings the crew and is answerable for everyone turning up.`}
      </p>
    </div>
  );
}
