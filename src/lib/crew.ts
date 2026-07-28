import { getCategory } from "@/data/categories";
import { computeQuote } from "./pricing";
import type { CategoryId, Quote, StateId, TenureId } from "./types";

/**
 * Booking a crew — the shape a Kerala function actually has.
 *
 * A sadya for two hundred people is not one cook. It is four cooks, six
 * people serving, and someone to set up and clear away. KAAM could only book
 * one person, so a family planning a wedding lunch had to make six separate
 * bookings, chase six acceptances, and pay six times — or give up and call
 * the cook they always call, which is where this business is lost.
 *
 * The design follows how it already works here rather than inventing a
 * marketplace: a head cook has his own team. So KAAM books the LEAD, and the
 * lead brings the crew. One booking, one acceptance, one payment, and one
 * person accountable for whether ten people turn up. The alternative —
 * assembling ten strangers who have never worked together for somebody's
 * daughter's wedding — is worse in every way that matters on the day.
 *
 * Above a certain size this stops being a crew and becomes an event, which
 * KAAM already handles properly with companies quoting for the whole job.
 * This deliberately refuses to compete with that.
 *
 * Pure and framework-free: the money can be tested.
 */

/** More heads than this is an event, not a crew — see src/lib/events.ts. */
export const MAX_CREW = 20;

/** The lead's cut for recruiting the crew, coordinating, and carrying it. */
export const LEAD_SHARE = 0.1;

export interface CrewRoleDef {
  categoryId: CategoryId;
  label: string;
  labelMl: string;
  /** What this role does, in the customer's words. */
  hint: string;
  hintMl: string;
  /** One person per this many guests — a starting point, not a rule. */
  perGuests: number;
  /** Fewest that makes sense when the role is used at all. */
  min: number;
  /** Suggested by default; others are added by the customer if they want them. */
  suggested: boolean;
}

/**
 * The three jobs a function needs done. Ratios are the ones caterers here
 * work to; they are only ever a first guess the customer edits, because the
 * family knows whether it is a sit-down sadya or a stand-up reception and
 * KAAM does not.
 */
export const CREW_ROLES: CrewRoleDef[] = [
  {
    categoryId: "cook",
    label: "Cooks",
    labelMl: "പാചകക്കാർ",
    hint: "Cooking, from prep to the last serving",
    hintMl: "ഒരുക്കം മുതൽ അവസാന വിളമ്പ് വരെ പാചകം",
    perGuests: 50,
    min: 1,
    suggested: true,
  },
  {
    categoryId: "events",
    label: "Serving & setup staff",
    labelMl: "വിളമ്പാനും ഒരുക്കാനും",
    hint: "Serving, ushering, setting up and clearing away",
    hintMl: "വിളമ്പൽ, സ്വീകരണം, ഒരുക്കവും വൃത്തിയാക്കലും",
    perGuests: 25,
    min: 2,
    suggested: true,
  },
  {
    categoryId: "catering",
    label: "Catering staff",
    labelMl: "കാറ്ററിംഗ് സ്റ്റാഫ്",
    hint: "Live counters and buffet — only if you're having them",
    hintMl: "ലൈവ് കൗണ്ടർ, ബഫേ — വേണമെങ്കിൽ മാത്രം",
    perGuests: 60,
    min: 1,
    suggested: false,
  },
];

/** One line of the crew: how many of this trade. */
export interface CrewRole {
  categoryId: CategoryId;
  count: number;
}

/** What a booking carries when it is a crew job. */
export interface CrewPlan {
  roles: CrewRole[];
  /** How many people are being fed / hosted, for the record. */
  guests?: number;
  /** Total people including the lead. */
  heads: number;
}

export function crewRoleDef(categoryId: CategoryId): CrewRoleDef | undefined {
  return CREW_ROLES.find((r) => r.categoryId === categoryId);
}

/** Trades where a function is booked as a crew rather than one person. */
export function crewCapable(categoryId: CategoryId): boolean {
  return CREW_ROLES.some((r) => r.categoryId === categoryId);
}

/**
 * A first guess at the crew for this many guests, with the lead's own trade
 * always present — you are booking that person, so they are on the job.
 */
export function suggestCrew(guests: number, leadCategoryId?: CategoryId): CrewRole[] {
  const out: CrewRole[] = [];
  for (const role of CREW_ROLES) {
    const isLeadTrade = role.categoryId === leadCategoryId;
    if (!role.suggested && !isLeadTrade) continue;
    const scaled = Math.ceil(Math.max(0, guests) / role.perGuests);
    out.push({ categoryId: role.categoryId, count: Math.max(role.min, scaled) });
  }
  return out;
}

export function crewHeads(roles: CrewRole[]): number {
  return roles.reduce((sum, r) => sum + Math.max(0, r.count), 0);
}

/** Drop the empty lines — a role with nobody in it is not part of the crew. */
export function activeRoles(roles: CrewRole[]): CrewRole[] {
  return roles.filter((r) => r.count > 0);
}

/**
 * Why this crew can't be booked, or null when it can. One message at a time:
 * a form that lists four problems at once gets abandoned.
 */
export function crewProblem(roles: CrewRole[], ml = false): string | null {
  const heads = crewHeads(activeRoles(roles));
  if (roles.some((r) => r.count < 0)) {
    return ml ? "എണ്ണം ശരിയല്ല." : "That headcount isn't right.";
  }
  if (heads < 2) {
    return ml
      ? "രണ്ട് പേരെങ്കിലും വേണം — ഒരാൾ മാത്രമെങ്കിൽ സാധാരണ ബുക്കിംഗ് മതി."
      : "A crew needs at least 2 people — for one person, book them normally.";
  }
  if (heads > MAX_CREW) {
    return ml
      ? `${MAX_CREW}-ൽ കൂടുതൽ പേരുണ്ടെങ്കിൽ അത് ഒരു ഇവന്റാണ്. ഇവന്റ് കമ്പനികളോട് വില ചോദിക്കൂ.`
      : `Over ${MAX_CREW} people is an event, not a crew — ask event companies for a price instead.`;
  }
  return null;
}

/** True when the customer should be sent to the event-company flow instead. */
export function tooBigForCrew(roles: CrewRole[]): boolean {
  return crewHeads(activeRoles(roles)) > MAX_CREW;
}

/**
 * What one crew member of a given trade costs, in the lead's own pricing unit.
 *
 * Everything is expressed relative to the person the customer actually chose.
 * A worker's rate is per their own unit — Sunita is ₹900 a day, an electrician
 * is ₹400 an hour — so adding a per-day rate to a per-hour list price would
 * quietly mix units and produce a number that means nothing. Scaling by the
 * ratio of the two trades' list prices keeps one unit throughout and keeps the
 * trades in their right proportion to each other: on a ₹900-a-day cook's crew,
 * another cook is ₹900 a day and a serving hand is ₹787.
 */
function headRate(categoryId: CategoryId, lead: { categoryId: CategoryId; rate: number }): number {
  const leadBase = getCategory(lead.categoryId).basePrice;
  if (leadBase <= 0) return lead.rate;
  return Math.round(lead.rate * (getCategory(categoryId).basePrice / leadBase));
}

/**
 * The crew's combined rate per the lead's pricing unit.
 *
 * The lead is charged at exactly their own rate — you chose that person and
 * their profile said what they cost — and everyone else relative to it by
 * trade. Anything else would either overcharge for nine people you never
 * picked, or quietly discount the person you did.
 */
export function crewRate(
  roles: CrewRole[],
  lead: { categoryId: CategoryId; rate: number },
): number {
  let total = 0;
  let leadCounted = false;
  for (const role of activeRoles(roles)) {
    const standard = headRate(role.categoryId, lead);
    for (let i = 0; i < role.count; i++) {
      if (!leadCounted && role.categoryId === lead.categoryId) {
        total += lead.rate;
        leadCounted = true;
      } else {
        total += standard;
      }
    }
  }
  return total;
}

export interface CrewQuoteInput {
  roles: CrewRole[];
  lead: { categoryId: CategoryId; rate: number; unit?: "hr" | "day" | "session" | "visit" };
  tenureId: TenureId;
  stateId: StateId;
  surge?: boolean;
}

/** The whole crew, priced through the same engine as everything else. */
export function crewQuote({ roles, lead, tenureId, stateId, surge = false }: CrewQuoteInput): Quote {
  return computeQuote({
    rate: crewRate(roles, lead),
    tenureId,
    stateId,
    unit: lead.unit ?? "hr",
    surge,
  });
}

export interface CrewSplit {
  heads: number;
  /** The lead's cut for putting the crew together and carrying it. */
  leadAllowance: number;
  /** What each person on the crew takes, the lead included. */
  eachShare: number;
  /** What the lead ends up with: allowance + their own share. */
  leadTotal: number;
  /** Everything paid out — equals the booking's worker payout, to the rupee. */
  total: number;
}

/**
 * How the crew's money divides.
 *
 * Equal shares, plus an allowance for the lead — they found the crew, they
 * answer for whether ten people arrive, and a lead paid the same as everyone
 * else stops leading. Rounding always lands on the lead, so no crew member is
 * ever quietly paid a rupee less than the person beside them, and the parts
 * always add back to exactly what the booking pays out.
 */
export function splitPayout(workerPayout: number, heads: number): CrewSplit {
  const safeHeads = Math.max(1, Math.floor(heads));
  const leadAllowance = safeHeads > 1 ? Math.round(workerPayout * LEAD_SHARE) : 0;
  const pool = workerPayout - leadAllowance;
  const eachShare = Math.floor(pool / safeHeads);
  // Whatever the division leaves over goes to the lead, never off the books.
  const leftover = pool - eachShare * safeHeads;

  return {
    heads: safeHeads,
    leadAllowance: leadAllowance + leftover,
    eachShare,
    leadTotal: leadAllowance + leftover + eachShare,
    total: workerPayout,
  };
}

/** "4 cooks · 6 serving & setup staff" — the crew in one line. */
export function crewSummary(roles: CrewRole[], ml = false): string {
  return activeRoles(roles)
    .map((r) => {
      const def = crewRoleDef(r.categoryId);
      const label = def ? (ml ? def.labelMl : def.label) : getCategory(r.categoryId).label;
      return `${r.count} ${label.toLowerCase()}`;
    })
    .join(" · ");
}
