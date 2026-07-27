import { getState, GST_RATE, PLATFORM_FEE_RATE, TDS_RATE } from "./pricing";
import type { Quote, StateId } from "./types";

/**
 * Event work — weddings, functions, corporate days — and why it needs its own
 * shape.
 *
 * Every other category on KAAM is "pick a person at a known rate". An event
 * company cannot have a rate: a wedding is two to five lakh assembled from a
 * stage, lights, a crew and food, and the only honest price is the one they
 * write for that specific function. So the customer describes the event once,
 * invites the few companies they like the look of, and each writes an itemised
 * quote against it.
 *
 * Inviting rather than open tendering is deliberate. On a three-lakh purchase
 * a customer is going to compare — if KAAM doesn't let them they will do it on
 * WhatsApp and the booking leaves the platform. But an open pit turns good
 * companies into price-bidders and they leave too. Being chosen by name, then
 * quoting, keeps both sides.
 *
 * Milestones are the company's own, not KAAM's. Nobody blocks a wedding date
 * for a stranger on a fixed 30%, and a decorator who buys flowers a week ahead
 * needs money a week ahead. Each company states its own stages inside its
 * quote and the customer sees them before accepting — a payment plan agreed in
 * advance beats a fair-sounding one imposed by a platform that isn't carrying
 * the risk.
 *
 * Pure and framework-free: every rupee here is unit-tested.
 */

export type EventKind =
  | "wedding"
  | "reception"
  | "birthday"
  | "corporate"
  | "housewarming"
  | "other";

export const EVENT_KINDS: { id: EventKind; label: string; labelMl: string; icon: string }[] = [
  { id: "wedding", label: "Wedding", labelMl: "വിവാഹം", icon: "💍" },
  { id: "reception", label: "Reception", labelMl: "റിസപ്ഷൻ", icon: "🎊" },
  { id: "birthday", label: "Birthday", labelMl: "പിറന്നാൾ", icon: "🎂" },
  { id: "corporate", label: "Corporate", labelMl: "കോർപ്പറേറ്റ്", icon: "🏢" },
  { id: "housewarming", label: "Housewarming", labelMl: "ഗൃഹപ്രവേശം", icon: "🏡" },
  { id: "other", label: "Something else", labelMl: "മറ്റൊന്ന്", icon: "🎪" },
];

/** How many companies a customer may invite to one event. */
export const MAX_INVITES = 4;

export type EventRequestStatus = "open" | "awarded" | "cancelled";

/** The customer's brief — written once, sent to the companies they picked. */
export interface EventRequest {
  id: string;
  customerId?: string;
  kind: EventKind;
  /** YYYY-MM-DD of the function. */
  date: string;
  /** Where it is — venue name or area. */
  venue: string;
  district: string;
  guests: number;
  /** ₹ the customer has in mind, 0 when they'd rather not say. */
  budget: number;
  /** Anything else the companies should know. */
  notes?: string;
  /** Companies invited to quote — the customer's choice, never the app's. */
  invitedIds: string[];
  status: EventRequestStatus;
  /** The quote the customer accepted, once they have. */
  awardedQuoteId?: string;
  stateId: StateId;
  createdAt: string;
}

/** One line a company adds to their quote — "stage & backdrop, ₹45,000". */
export interface QuoteLine {
  label: string;
  /** ₹ before tax. */
  amount: number;
}

/** One payment stage the company asks for, as a share of the total. */
export interface QuoteMilestone {
  label: string;
  /** Percentage of the total, 0–100. The stages must add up to 100. */
  percent: number;
  /** When this stage falls due, in the company's own words. */
  when: string;
  /** Set once the customer has actually paid this stage. */
  paidAt?: string;
  /** ₹ actually taken — recorded, never recomputed. */
  paidAmount?: number;
}

export type EventQuoteStatus = "draft" | "sent" | "accepted" | "declined" | "withdrawn";

/** A company's priced answer to one request. */
export interface EventQuote {
  id: string;
  requestId: string;
  companyId: string;
  companyName: string;
  /** The itemised price, added one line at a time. */
  lines: QuoteLine[];
  /** The company's own payment stages. */
  milestones: QuoteMilestone[];
  /** What the company wants to say alongside the numbers. */
  note?: string;
  status: EventQuoteStatus;
  sentAt?: string;
  createdAt: string;
}

/* ── Money ──────────────────────────────────────────────────────────── */

/** ₹ of work quoted, before any tax. */
export function linesSubtotal(lines: QuoteLine[]): number {
  return lines.reduce((sum, l) => sum + Math.max(0, Math.round(l.amount)), 0);
}

/**
 * The full breakdown for a quote, in exactly the shape every other booking on
 * KAAM uses — so the invoice, the ledger and the GST report need no special
 * case for events.
 */
export function quoteTotals(lines: QuoteLine[], stateId: StateId): Quote {
  const serviceAmount = linesSubtotal(lines);
  const gst = Math.round(serviceAmount * GST_RATE);
  const cess = Math.round((serviceAmount * getState(stateId).cessPercent) / 100);
  const platformFee = Math.round(serviceAmount * PLATFORM_FEE_RATE);
  const tds = Math.round(serviceAmount * TDS_RATE);
  return {
    serviceAmount,
    surgeApplied: false, // surge is a here-and-now idea; a wedding is booked months out
    gst,
    cess,
    totalUserPays: serviceAmount + gst + cess,
    platformFee,
    tds,
    workerPayout: serviceAmount - platformFee - tds,
  };
}

/** What one stage costs, in rupees. */
export function milestoneAmount(total: number, milestone: QuoteMilestone): number {
  return Math.round((total * milestone.percent) / 100);
}

/**
 * Stages must account for the whole price and nothing more.
 *
 * Returns the reason it is not sendable, or null when it is. Rounding is
 * checked against the rupee total rather than the percentages alone, so a
 * customer can never be asked for one rupee more than the quote says.
 */
export function milestoneProblem(milestones: QuoteMilestone[], total: number): string | null {
  if (milestones.length === 0) return "Add at least one payment stage.";
  if (milestones.some((m) => !m.label.trim())) return "Every stage needs a name.";
  if (milestones.some((m) => m.percent <= 0)) return "Every stage must be more than 0%.";
  const percent = milestones.reduce((s, m) => s + m.percent, 0);
  if (Math.round(percent) !== 100) {
    return `The stages add up to ${Math.round(percent)}% — they must total 100%.`;
  }
  const summed = milestones.reduce((s, m) => s + milestoneAmount(total, m), 0);
  if (summed !== total) {
    return `Rounding leaves ${summed > total ? "an extra" : "a shortfall of"} ₹${Math.abs(summed - total)}. Adjust a stage.`;
  }
  return null;
}

/**
 * Spread rounding onto the last stage so the stages always sum to the total
 * exactly. Companies think in round percentages; the customer must still be
 * charged the quoted rupee and not a paisa more.
 */
export function balanceMilestones(
  milestones: QuoteMilestone[],
  total: number,
): { milestone: QuoteMilestone; amount: number }[] {
  if (milestones.length === 0) return [];
  const out = milestones.map((m) => ({ milestone: m, amount: milestoneAmount(total, m) }));
  const drift = total - out.reduce((s, x) => s + x.amount, 0);
  out[out.length - 1].amount += drift;
  return out;
}

/* ── State ──────────────────────────────────────────────────────────── */

/** A quote the company has finished and the customer can act on. */
export function isLive(quote: EventQuote): boolean {
  return quote.status === "sent";
}

/** Quotes the customer should be comparing, cheapest first. */
export function comparableQuotes(quotes: EventQuote[], requestId: string, stateId: StateId): EventQuote[] {
  return quotes
    .filter((q) => q.requestId === requestId && isLive(q))
    .sort(
      (a, b) =>
        quoteTotals(a.lines, stateId).totalUserPays - quoteTotals(b.lines, stateId).totalUserPays,
    );
}

/** Can this company still be invited to this request? */
export function canInvite(request: Pick<EventRequest, "invitedIds" | "status">, companyId: string): boolean {
  if (request.status !== "open") return false;
  if (request.invitedIds.includes(companyId)) return false;
  return request.invitedIds.length < MAX_INVITES;
}

/** Whether the company may write or change a quote for this request. */
export function canQuote(
  request: Pick<EventRequest, "invitedIds" | "status">,
  companyId: string,
): boolean {
  // Only companies the customer actually picked. An uninvited quote would be
  // exactly the open-tender pit this design avoids.
  return request.status === "open" && request.invitedIds.includes(companyId);
}

/** Days between now and the function — negative once it has passed. */
export function daysToEvent(request: Pick<EventRequest, "date">, now: Date = new Date()): number {
  const day = new Date(`${request.date}T00:00`);
  if (Number.isNaN(day.getTime())) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

/** The next stage the customer owes, or null when the plan is settled. */
export function nextDueMilestone(quote: EventQuote): QuoteMilestone | null {
  return quote.milestones.find((m) => !m.paidAt) ?? null;
}

/** ₹ collected so far across the stages actually paid. */
export function paidSoFar(quote: EventQuote): number {
  return quote.milestones.reduce((s, m) => s + (m.paidAt ? (m.paidAmount ?? 0) : 0), 0);
}

/** Record a stage as paid. The amount is stored, never recomputed later. */
export function payMilestonePatch(
  quote: EventQuote,
  index: number,
  amount: number,
  now: Date = new Date(),
): Pick<EventQuote, "milestones"> {
  return {
    milestones: quote.milestones.map((m, i) =>
      i === index ? { ...m, paidAt: now.toISOString(), paidAmount: amount } : m,
    ),
  };
}

/** A sensible starting plan a company can edit — never imposed. */
export const SUGGESTED_MILESTONES: QuoteMilestone[] = [
  { label: "To confirm the date", percent: 30, when: "On accepting this quote" },
  { label: "Before the function", percent: 50, when: "One week before" },
  { label: "After the function", percent: 20, when: "Once the work is done" },
];
