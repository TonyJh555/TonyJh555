"use client";

import { useState } from "react";
import { useCustomer } from "@/lib/auth";
import { inr } from "@/lib/format";
import { useSearchLocation } from "@/lib/location";
import { haversineKm, KERALA_DISTRICTS } from "@/lib/geo";
import {
  canInvite,
  comparableQuotes,
  daysToEvent,
  EVENT_KINDS,
  MAX_INVITES,
  balanceMilestones,
  paidSoFar,
  payMilestonePatch,
  quoteTotals,
  type EventKind,
  type EventQuote,
  type EventRequest,
} from "@/lib/events";
import {
  approvedCompanies,
  awardQuote,
  createEventRequest,
  requestsFor,
  updateEventQuote,
  updateEventRequest,
  useCompanies,
  useEventQuotes,
  useEventRequests,
  type EventCompany,
} from "@/lib/event-store";
import { offsiteWarning } from "@/lib/offsite";
import { PaySheet } from "@/components/pay-sheet";
import { PortfolioStrip } from "@/components/company-portfolio";
import { Avatar, Card, Tag } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * Planning a function on KAAM.
 *
 * The customer writes the brief once, then invites the few companies they like
 * the look of. Writing it four times to four companies is what sends a
 * three-lakh booking to WhatsApp; letting every company in the district pile
 * in turns good companies into price-bidders and loses them. Inviting is the
 * middle: the customer still chooses by name, and still gets to compare real
 * prices side by side.
 *
 * Nothing is charged here. A quote is a quote until the customer accepts one.
 */
export function EventPlanner() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const customer = useCustomer();
  const requests = useEventRequests();
  const quotes = useEventQuotes();
  const [creating, setCreating] = useState(false);

  const mine = requestsFor(requests, customer?.id);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-base font-extrabold text-ink">
          🎪 {ml ? "ഫംഗ്ഷൻ പ്ലാൻ ചെയ്യൂ" : "Plan a function"}
        </h2>
        {mine.length > 0 && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-[11px] font-bold text-kaam"
          >
            + {ml ? "പുതിയത്" : "New"}
          </button>
        )}
      </div>

      {creating || mine.length === 0 ? (
        <NewRequest onDone={() => setCreating(false)} canCancel={mine.length > 0} />
      ) : null}

      <div className="mt-3 flex flex-col gap-3">
        {mine.map((r) => (
          <RequestCard key={r.id} request={r} quotes={quotes} />
        ))}
      </div>
    </section>
  );
}

/* ── The brief ────────────────────────────────────────────────────── */

function NewRequest({ onDone, canCancel }: { onDone: () => void; canCancel: boolean }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const customer = useCustomer();
  const location = useSearchLocation();
  // The saved location is a point, not a district. Companies serve districts,
  // so resolve it to the nearest one rather than asking the customer twice.
  const district = KERALA_DISTRICTS.reduce((best, d) =>
    haversineKm(location.coords, d.coords) < haversineKm(location.coords, best.coords) ? d : best,
  ).name;
  const [kind, setKind] = useState<EventKind>("wedding");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  // Same guard as the company side, argued from the customer's own interest:
  // paying directly means no agreed stages and no refund if nobody turns up.
  const leak = offsiteWarning(`${notes} ${venue}`, "customer");
  const ready = date && venue.trim() && Number(guests) > 0 && !leak;

  const create = () => {
    if (!ready) return;
    createEventRequest({
      customerId: customer?.id,
      kind,
      date,
      venue: venue.trim(),
      district,
      guests: Number(guests),
      budget: Number(budget) || 0,
      notes: notes.trim() || undefined,
      stateId: "KL",
    });
    onDone();
  };

  return (
    <Card>
      <p className="text-[11px] leading-relaxed text-mid">
        {ml
          ? "ഒരിക്കൽ എഴുതൂ. പിന്നെ നിങ്ങൾക്ക് ഇഷ്ടപ്പെട്ട കമ്പനികളെ വിളിച്ച് വില ചോദിക്കാം — ഇപ്പോൾ ഒന്നും അടയ്ക്കേണ്ട."
          : "Write it once, then ask the companies you like for their price. Nothing is charged now."}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EVENT_KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
              kind === k.id ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
            }`}
          >
            {k.icon} {ml ? k.labelMl : k.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-mid">{ml ? "തീയതി" : "Date"}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-mid">
            {ml ? "എത്ര പേർ" : "Guests"}
          </span>
          <input
            value={guests}
            onChange={(e) => setGuests(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="400"
            className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
          />
        </label>
      </div>

      <label className="mt-2 block">
        <span className="mb-1 block text-[11px] font-bold text-mid">
          {ml ? "എവിടെ" : "Where"}
        </span>
        <input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder={ml ? "ഓഡിറ്റോറിയം / വീട് / സ്ഥലം" : "Auditorium, house or area"}
          className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
        />
      </label>

      <label className="mt-2 block">
        <span className="mb-1 block text-[11px] font-bold text-mid">
          {ml ? "ബജറ്റ് (ഓപ്ഷണൽ)" : "Budget (optional)"}
        </span>
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          placeholder="300000"
          className="w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
        />
      </label>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder={ml ? "എന്തെങ്കിലും പ്രത്യേകം? ഉദാ: സദ്യ വേണം" : "Anything particular? e.g. sadya, live counters"}
        className="mt-2 w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
      />

      {leak && (
        <div className="mt-2 rounded-lg border border-warn-mid bg-warn-light p-2.5 text-[11px] leading-relaxed text-warn">
          <p className="font-extrabold">⚠️ {ml ? leak.titleMl : leak.title}</p>
          <p className="mt-0.5">{ml ? leak.bodyMl : leak.body}</p>
        </div>
      )}

      <button
        onClick={create}
        disabled={!ready}
        className="mt-3 w-full rounded-2xl bg-kaam py-3 text-sm font-extrabold text-white shadow-kaam disabled:opacity-40"
      >
        {ml ? "തുടരൂ — കമ്പനികളെ തിരഞ്ഞെടുക്കൂ →" : "Next — choose companies →"}
      </button>
      {canCancel && (
        <button onClick={onDone} className="mt-2 w-full text-center text-[11px] font-bold text-mid">
          {ml ? "വേണ്ട" : "Cancel"}
        </button>
      )}
    </Card>
  );
}

/* ── One brief, its invitations and the quotes back ───────────────── */

function RequestCard({ request, quotes }: { request: EventRequest; quotes: EventQuote[] }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const companies = useCompanies();
  const kind = EVENT_KINDS.find((k) => k.id === request.kind);
  const days = daysToEvent(request);
  const back = comparableQuotes(quotes, request.id, request.stateId);
  const available = approvedCompanies(companies, request.district);
  const awarded = quotes.find((q) => q.id === request.awardedQuoteId);

  const invite = (companyId: string) =>
    updateEventRequest(request.id, { invitedIds: [...request.invitedIds, companyId] });

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">
            {kind?.icon} {ml ? kind?.labelMl : kind?.label}
          </p>
          <p className="text-[11px] text-mid">
            {request.venue} · {request.guests} {ml ? "പേർ" : "guests"}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-info">
            🕐 {request.date}
            {days >= 0 && ` · ${days} ${ml ? "ദിവസം ബാക്കി" : "days away"}`}
          </p>
        </div>
        {request.status === "awarded" ? (
          <Tag color="green">{ml ? "ഉറപ്പിച്ചു" : "Booked"}</Tag>
        ) : (
          <Tag color="yellow">
            {request.invitedIds.length}/{MAX_INVITES} {ml ? "ക്ഷണിച്ചു" : "asked"}
          </Tag>
        )}
      </div>

      {/* Awarded */}
      {awarded && (
        <div className="mt-3 rounded-xl border border-good-mid bg-good-light p-3">
          <p className="text-xs font-extrabold text-good">
            🎉 {awarded.companyName}
          </p>
          <p className="mt-0.5 text-[11px] text-good/90">
            {inr(quoteTotals(awarded.lines, request.stateId).totalUserPays)} ·{" "}
            {ml ? "പണം ഘട്ടം ഘട്ടമായി" : "paid in stages"}
          </p>
          <Milestones quote={awarded} stateId={request.stateId} />
          <PayMilestone quote={awarded} stateId={request.stateId} />
        </div>
      )}

      {/* Quotes back */}
      {!awarded && back.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-extrabold text-ink">
            💬 {back.length} {ml ? "വില വന്നു — താരതമ്യം ചെയ്യൂ" : back.length === 1 ? "quote back" : "quotes back"}
          </p>
          <div className="flex flex-col gap-2">
            {back.map((q, i) => (
              <QuoteCard
                key={q.id}
                quote={q}
                stateId={request.stateId}
                cheapest={i === 0 && back.length > 1}
                onAccept={() => awardQuote(request.id, q.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Who else to ask */}
      {!awarded && request.invitedIds.length < MAX_INVITES && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-extrabold text-ink">
            👥 {ml ? "ആരോട് വില ചോദിക്കണം?" : "Who should quote for you?"}
          </p>
          {available.filter((c) => !request.invitedIds.includes(c.id)).length === 0 ? (
            <p className="rounded-lg border border-line bg-surf p-2.5 text-[11px] leading-relaxed text-mid">
              {ml
                ? "ഈ ജില്ലയിൽ ഇപ്പോൾ അംഗീകൃത കമ്പനികളില്ല. ഉടൻ ചേർക്കും."
                : "No approved companies in this district yet. We're adding them."}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {available
                .filter((c) => !request.invitedIds.includes(c.id))
                .slice(0, 5)
                .map((c) => (
                  <CompanyRow
                    key={c.id}
                    company={c}
                    onInvite={() => invite(c.id)}
                    disabled={!canInvite(request, c.id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {!awarded && request.invitedIds.length > 0 && back.length === 0 && (
        <p className="mt-2 text-[11px] text-mid">
          {ml
            ? "വില വരുന്നതുവരെ കാത്തിരിക്കൂ — ഒന്നും അടച്ചിട്ടില്ല."
            : "Waiting on their prices — nothing has been charged."}
        </p>
      )}
    </Card>
  );
}

function CompanyRow({
  company,
  onInvite,
  disabled,
}: {
  company: EventCompany;
  onInvite: () => void;
  disabled: boolean;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  return (
    <div className="rounded-lg border border-line bg-white p-2.5">
      <div className="flex items-center gap-2.5">
      <Avatar initials={company.name.slice(0, 2).toUpperCase()} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold">{company.name}</span>
        <span className="block truncate text-[10px] text-mid">
          {company.rating ? `⭐ ${company.rating} · ` : ""}
          {company.eventsDone ? `${company.eventsDone} events · ` : ""}
          {company.services.slice(0, 2).join(", ")}
        </span>
      </span>
      <button
        onClick={onInvite}
        disabled={disabled}
        className="shrink-0 rounded-lg border border-kaam-mid bg-kaam-light px-2.5 py-1.5 text-[11px] font-bold text-kaam disabled:opacity-40"
      >
        {ml ? "വില ചോദിക്കൂ" : "Ask price"}
      </button>
      </div>
      {/* Past work, before the decision — an event happens once and cannot be
          re-done, so the photographs matter more than the star rating. */}
      <PortfolioStrip photos={company.portfolio} size={64} />
    </div>
  );
}

function QuoteCard({
  quote,
  stateId,
  cheapest,
  onAccept,
}: {
  quote: EventQuote;
  stateId: EventRequest["stateId"];
  cheapest: boolean;
  onAccept: () => void;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const totals = quoteTotals(quote.lines, stateId);

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-ink">{quote.companyName}</p>
          {cheapest && (
            <span className="text-[10px] font-bold text-good">
              {ml ? "ഏറ്റവും കുറഞ്ഞ വില" : "Lowest price"}
            </span>
          )}
        </div>
        <p className="shrink-0 font-display text-base font-extrabold text-kaam tabular-nums">
          {inr(totals.totalUserPays)}
        </p>
      </div>

      {quote.note && <p className="mt-1 text-[11px] leading-relaxed text-mid">{quote.note}</p>}

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-2 w-full rounded-lg border border-line bg-surf py-1.5 text-[11px] font-bold text-mid"
      >
        {open ? (ml ? "മറയ്ക്കൂ" : "Hide breakdown") : ml ? "വിശദാംശങ്ങൾ" : "See what's included"}
      </button>

      {open && (
        <div className="mt-2">
          <table className="w-full text-[11px]">
            <tbody>
              {quote.lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-0.5 text-mid">{l.label}</td>
                  <td className="py-0.5 text-right font-semibold tabular-nums">{inr(l.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="py-1 text-mid">GST @18%</td>
                <td className="py-1 text-right font-semibold tabular-nums">+ {inr(totals.gst)}</td>
              </tr>
              <tr>
                <td className="py-1 font-bold text-ink">{ml ? "ആകെ" : "Total"}</td>
                <td className="py-1 text-right font-extrabold tabular-nums">
                  {inr(totals.totalUserPays)}
                </td>
              </tr>
            </tbody>
          </table>
          <Milestones quote={quote} stateId={stateId} />
        </div>
      )}

      {confirming ? (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 rounded-lg bg-kaam py-2 text-[11px] font-extrabold text-white"
          >
            {ml ? "അതെ, ഇവരെ ഉറപ്പിക്കൂ" : "Yes, book them"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-lg border border-line bg-white py-2 text-[11px] font-bold text-mid"
          >
            {ml ? "വേണ്ട" : "Not yet"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-2 w-full rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white"
        >
          {ml ? "ഇവരെ തിരഞ്ഞെടുക്കൂ" : "Choose this company"}
        </button>
      )}
    </div>
  );
}

/**
 * Paying one stage of an awarded quote.
 *
 * Runs through the same PaySheet as every other charge in KAAM, so an event
 * stage takes two deliberate taps and says plainly when no gateway is wired
 * up. The amount comes from `balanceMilestones`, which absorbs rounding onto
 * the last stage — so the stages always sum to the quoted rupee and never one
 * more.
 */
function PayMilestone({
  quote,
  stateId,
}: {
  quote: EventQuote;
  stateId: EventRequest["stateId"];
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [method, setMethod] = useState("gpay");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const total = quoteTotals(quote.lines, stateId).totalUserPays;
  const stages = balanceMilestones(quote.milestones, total);
  const dueIndex = quote.milestones.findIndex((m) => !m.paidAt);
  if (dueIndex === -1) {
    return (
      <p className="mt-2 text-[11px] font-bold text-good">
        ✓ {ml ? "എല്ലാ ഘട്ടങ്ങളും അടച്ചു." : "Every stage is paid."}
      </p>
    );
  }

  const stage = stages[dueIndex];
  const paid = paidSoFar(quote);

  const confirm = () => {
    setBusy(true);
    // The amount charged is recorded on the stage, never recomputed later —
    // a quote edited afterwards must not rewrite what was actually taken.
    updateEventQuote(quote.id, payMilestonePatch(quote, dueIndex, stage.amount));
    setBusy(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-xl bg-kaam py-2.5 text-xs font-extrabold text-white"
      >
        {ml ? `${stage.milestone.label} — ${inr(stage.amount)} അടയ്ക്കൂ` : `Pay ${stage.milestone.label} — ${inr(stage.amount)}`}
      </button>
    );
  }

  return (
    <PaySheet
      title={`${stage.milestone.label} · ${quote.companyName}`}
      subtitle={ml ? `ഘട്ടം ${dueIndex + 1} / ${stages.length}` : `Stage ${dueIndex + 1} of ${stages.length}`}
      lines={[
        { label: ml ? "ഈ ഘട്ടം" : "This stage", amount: stage.amount, strong: true },
        ...(paid > 0 ? [{ label: ml ? "ഇതുവരെ അടച്ചത്" : "Paid so far", amount: paid }] : []),
        { label: ml ? "മൊത്തം വില" : "Full quote", amount: total },
      ]}
      total={stage.amount}
      method={method}
      onMethod={setMethod}
      onConfirm={confirm}
      busy={busy}
    />
  );
}

/** The company's own payment stages, shown before the customer commits. */
function Milestones({ quote, stateId }: { quote: EventQuote; stateId: EventRequest["stateId"] }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const total = quoteTotals(quote.lines, stateId).totalUserPays;
  const stages = balanceMilestones(quote.milestones, total);

  return (
    <div className="mt-2 rounded-lg border border-line bg-surf p-2.5">
      <p className="text-[10px] font-extrabold tracking-wide text-dim uppercase">
        {ml ? "എപ്പോൾ അടയ്ക്കണം" : "When you pay"}
      </p>
      {stages.map(({ milestone, amount }, i) => (
        <div key={i} className="mt-1 flex items-baseline justify-between gap-2">
          <span className="min-w-0 text-[11px] text-mid">
            <span className={milestone.paidAt ? "line-through" : ""}>{milestone.label}</span>
            {milestone.when && <span className="block text-[10px] text-dim">{milestone.when}</span>}
          </span>
          <span
            className={`shrink-0 text-[11px] font-bold tabular-nums ${
              milestone.paidAt ? "text-good" : "text-ink"
            }`}
          >
            {milestone.paidAt ? "✓ " : ""}
            {inr(amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
