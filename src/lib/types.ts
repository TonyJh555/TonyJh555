/** Core domain types for the KAAM marketplace. */

import type { CareNote } from "./care-notes";
import type { CrewPlan } from "./crew";
import type { IntakeAnswers } from "./intake";

export type CategoryId =
  | "elec" | "plumb" | "mech" | "ac" | "nurse" | "driver" | "tutor"
  | "cook" | "clean" | "beauty" | "carp" | "pest" | "physio" | "painter"
  | "movers" | "yoga" | "photo" | "cctv" | "ro" | "massage"
  | "nails" | "mehendi" | "hair" | "makeup"
  | "violin" | "piano" | "guitar" | "singer" | "dance"
  | "babysitter" | "maid" | "eldercare" | "catering" | "events";

export type GroupId =
  | "maintenance" | "care" | "art" | "hospitality" | "wellness" | "everyday";

export interface CategoryGroup {
  id: GroupId;
  label: string;
  icon: string;
  tagline: string;
}

export interface Category {
  id: CategoryId;
  /** Sector this service belongs to (Maintenance, Care, Art & Music…). */
  group: GroupId;
  label: string;
  icon: string;
  /** Base price in ₹ for one hour / one visit. */
  basePrice: number;
  subServices: string[];
  /** Only female workers serve this category. */
  femaleWorkersOnly?: boolean;
}

export type TenureId = "hr" | "hd" | "day" | "wk" | "mo" | "3mo";

export interface Tenure {
  id: TenureId;
  label: string;
  duration: string;
  /** Multiplier applied to the worker's hourly/visit rate. */
  multiplier: number;
}

export type PriceUnit = "visit" | "hr" | "day" | "session";

/** Kerala's 14 districts — KAAM operates statewide. */
export type KeralaDistrict =
  | "Thiruvananthapuram" | "Kollam" | "Pathanamthitta" | "Alappuzha"
  | "Kottayam" | "Idukki" | "Ernakulam" | "Thrissur" | "Palakkad"
  | "Malappuram" | "Kozhikode" | "Wayanad" | "Kannur" | "Kasaragod";

export interface Worker {
  id: string;
  name: string;
  categoryId: CategoryId;
  rating: number;
  reviewCount: number;
  /** Rate in ₹ per `unit`. */
  rate: number;
  unit: PriceUnit;
  /**
   * Typical distance shown before a location is known. In search/home this is
   * overwritten with the live distance from the customer's location, so the
   * list can be ranked nearest-first like Uber/Swiggy.
   */
  distanceKm: number;
  /** District the worker serves. */
  district: KeralaDistrict;
  /** Home/base coordinates, used to compute live distance to the customer. */
  coords: { lat: number; lng: number };
  initials: string;
  verified: boolean;
  experienceYears: number;
  city: string;
  etaMinutes: number;
  jobsDone: number;
  bio: string;
  skills: string[];
  surge: boolean;
  online: boolean;
  /** Woman worker — powers the optional women-preference search filter. */
  female?: boolean;
  /** Fraction of offered jobs this worker accepts, 0..1. */
  acceptRate: number;
  /** Optional public profiles — mainly for artists showcasing their work. */
  social?: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
    website?: string;
  };
}

/** Kerala-only launch. The cess engine stays for future state expansion. */
export type StateId = "KL";

export interface IndianState {
  id: StateId;
  name: string;
  /** Gig-worker welfare cess as a percentage of the service amount. */
  cessPercent: number;
}

export type BookingStatus =
  | "requested" | "accepted" | "in_progress" | "completed" | "cancelled"
  /** Worker can't make the proposed time — user must pick a new slot. */
  | "reschedule";

/** When the customer wants the worker to come. */
export type BookingSchedule =
  | { when: "asap" }
  | { when: "scheduled"; date: string; time: string }; // date: YYYY-MM-DD, time: "15:00"

export interface Booking {
  id: string;
  /** The customer who made this booking (for per-user filtering in cloud mode). */
  customerId?: string;
  workerId: string;
  workerName: string;
  categoryId: CategoryId;
  subService: string;
  tenureId: TenureId;
  stateId: StateId;
  /** Customer's area / address so the worker can judge the trip. */
  address?: string;
  /** Exact map-picked coordinates, when the customer dropped a pin. */
  coords?: { lat: number; lng: number };
  /** Requested visit time (optional for bookings made before this field existed). */
  schedule?: BookingSchedule;
  /** Full price breakdown frozen at booking time. */
  quote: Quote;
  paymentMethod: string;
  status: BookingStatus;
  /** 4-digit OTP the user shares with the worker to start the job. */
  startCode: string;
  createdAt: string; // ISO timestamp
  /** Customer's rating of the worker (1–5). */
  rating?: number;
  /** Worker's rating of the customer (1–5) — powers two-way trust. */
  customerRating?: number;
  /** Why the booking was cancelled (feeds cancellation analytics). */
  cancelReason?: string;
  /**
   * Set when this is a crew job for a function: the booked worker is the lead
   * and brings the rest. See src/lib/crew.ts.
   */
  crew?: CrewPlan;
  /** Uber-style dispatch state while the job hunts for a worker. */
  dispatch?: DispatchState;
  /** When the worker entered the OTP and the job clock started (ISO). */
  startedAt?: string;
  /** When the job was marked complete (ISO). */
  completedAt?: string;
  /** Worked milliseconds banked across pause/resume cycles (paused reschedules). */
  bankedMs?: number;
  /** Set while the meter is paused for a reschedule (ISO); absent = running. */
  pausedAt?: string;
  /** A mid-job reschedule awaiting the other side's 4-digit code. */
  reschedule?: RescheduleRequest;
  /** "Work is done" awaiting the other side's 4-digit code (see completion.ts). */
  completion?: CompletionRequest;
  /** How many times this job has been rescheduled (capped at MAX_RESCHEDULES). */
  rescheduleCount?: number;
  /** Tip the customer paid the worker after the job — 100% goes to the worker. */
  tip?: number;
  /** When the tip was actually paid (ISO). A tip without this was never charged. */
  tipPaidAt?: string;
  /** Metered-billing outcome for hourly jobs (see src/lib/metered.ts). */
  settlement?: Settlement;
  /**
   * ₹ owed to the worker for a job that ended before the work was done —
   * they travelled out and gave up the slot. Written when the booking is
   * cancelled; 0 or absent whenever the failure was the worker's own.
   * See `calloutPayFor` in src/lib/payment-policy.ts.
   */
  calloutPay?: number;
  /** When money moves for this booking (see src/lib/payment-policy.ts). */
  payment?: BookingPayment;
  /**
   * Health answers for trades that work on the body. Visible to the assigned
   * worker and nobody else — see src/lib/intake.ts.
   */
  intake?: IntakeAnswers;
}

/**
 * A mid-job pause-and-reschedule proposal (e.g. an electrician needs parts and
 * returns tomorrow). One side proposes a new time; the other agrees by entering
 * the 4-digit code. The meter is frozen while this is pending/approved.
 */
/**
 * "The work is finished" — raised by either side. The billing clock stops at
 * `at` (not when the other side confirms), so a slow confirmation never costs
 * anyone money; the code proves both parties agree the job really ended.
 */
export interface CompletionRequest {
  /** Who declared the work finished. */
  by: "customer" | "worker";
  /** The moment the clock stopped (ISO) — the timestamp both sides are shown. */
  at: string;
  /** 4-digit code the OTHER side enters to confirm. */
  code: string;
}

export interface RescheduleRequest {
  /** Who proposed the new time. */
  by: "customer" | "worker";
  /** New visit date (YYYY-MM-DD) and time (HH:MM). */
  date: string;
  time: string;
  /** 4-digit code the OTHER side must enter to agree. */
  code: string;
  /** When it was proposed (ISO). */
  requestedAt: string;
}

/** Payment-timing record frozen on the booking. */
export interface BookingPayment {
  timing: "full_prepay" | "base_then_settle" | "advance_then_balance";
  /** ₹ actually collected so far (0 until a worker accepts and the customer confirms). */
  paidNow: number;
  /**
   * ₹ the customer pays to confirm, collected only AFTER a worker accepts —
   * never at booking, so no money is held for a job nobody has taken yet.
   */
  dueOnAccept?: number;
  /** Deadline to pay after acceptance (ISO); past it the job returns to the queue. */
  confirmBy?: string;
  /** When the customer paid to confirm (ISO) — the job is locked in from here. */
  confirmedAt?: string;
  /** KAAM Cash the customer chose to apply — also only spent on confirmation. */
  walletApplied?: number;
  /** ₹ off for being a KAAM Plus member (KAAM absorbs it; the worker is unaffected). */
  memberDiscount?: number;
  /** Coupon applied at checkout, and what it took off. */
  couponCode?: string;
  couponDiscount?: number;
  /** ₹ still due (advance balance; metered extras are added at settle time). */
  balanceDue: number;
  /** Set when the completion-time collection happened (ISO). */
  balancePaidAt?: string;
  /**
   * Cash job: when the CUSTOMER said they handed the money over. It is a
   * claim, not a settlement — the worker confirms receipt before the money
   * counts (see `awaitingCashConfirmation`).
   */
  cashClaimedAt?: string;
}

/**
 * Fair-billing settlement for an hourly job: the base price covers the
 * first hour; past a short grace the user pays only the minutes actually
 * worked — and the worker is paid for every one of them.
 */
export interface Settlement {
  /** Real minutes from OTP start to completion. */
  actualMinutes: number;
  /** Minutes billed (the base hour, or the real minutes past grace). */
  billedMinutes: number;
  /** billedMinutes − 60. */
  extraMinutes: number;
  /** ₹ the user pays beyond the original quote (incl. GST). */
  extraUserPays: number;
  /** ₹ added to the worker's payout for the extra minutes. */
  extraWorkerPayout: number;
}

/**
 * Live dispatch state on a `requested` booking. The customer's chosen worker
 * gets the first offer; if they don't respond inside the window (or decline),
 * the job cascades to the next nearest available worker automatically.
 */
export interface DispatchState {
  /** Workers who declined or let the offer expire, in order. */
  passedIds: string[];
  /** When the current worker's offer window closes (null = open offer, no timer). */
  offerExpiresAt: string | null;
  /** How many workers have held the offer so far (1 = the chosen one). */
  attempt: number;
  /**
   * What actually became of the last offer. Without this, a worker tapping
   * "Pass" and a worker never opening the app look identical — both just stop
   * the timer — and the customer gets told to keep waiting for someone who has
   * already said no.
   */
  lastOutcome?: DispatchOutcome;
}

/** Why an offer stopped being live, so the customer can be told the truth. */
export interface DispatchOutcome {
  workerId: string;
  workerName: string;
  /** `declined` = they tapped no. `no_reply` = the window simply ran out. */
  reason: "declined" | "no_reply";
  at: string; // ISO timestamp
}

export type SubscriptionStatus = "active" | "cancelled" | "expired";

/** One billing event on a subscription (the upfront charge, then renewals). */
/**
 * The weekly rhythm a plan runs on — "Mon, Wed, Fri at 16:00". The individual
 * visits are derived from this rather than stored, so the schedule can never
 * drift away from what was agreed (see src/lib/sessions.ts).
 */
export interface VisitPattern {
  /** Days of the week, 0 = Sunday, matching Date.getDay(). */
  days: number[];
  /** HH:MM, 24-hour. */
  time: string;
}

/** What actually happened at one visit — the part no formula can recreate. */
export interface SessionMark {
  /** YYYY-MM-DD of the session this records. */
  date: string;
  status: "done" | "missed";
  /** Who recorded it. */
  by: "worker" | "customer";
  /** Free note: what was covered in the lesson, how the patient was. */
  note?: string;
  /**
   * The handover for a care visit — food, medicines, mood, readings. Seen by
   * the family who pay for the plan and the carer who wrote it, nobody else.
   * See src/lib/care-notes.ts.
   */
  care?: CareNote;
  at: string; // ISO timestamp
}

export interface SubscriptionCharge {
  date: string; // ISO timestamp
  amount: number; // ₹ charged (incl. tax)
  ref: string; // payment / gateway reference
}

/**
 * A recurring Care Plan the customer committed to — the engine behind
 * predictable revenue. Paid upfront for the term at a commitment discount,
 * then auto-renews for the same term unless cancelled.
 */
export interface Subscription {
  id: string;
  customerId?: string;
  workerId: string;
  workerName: string;
  categoryId: CategoryId;
  /** Human label, e.g. "Elder Care · 3 Months plan". */
  service: string;
  /** Plan id: "m1" | "m3" | "m6" (kept as string to avoid a type cycle). */
  planId: string;
  /** Term length in months (1 / 3 / 6). */
  months: number;
  /** ₹ per month, tax-inclusive (for display). */
  monthlyAmount: number;
  /** ₹ for the whole term, tax-inclusive (what was charged). */
  termAmount: number;
  /** ₹ the worker takes home per month (after fee + TDS). */
  monthlyPayout: number;
  /** ₹ the worker takes home over the whole term. */
  termPayout: number;
  /** Whether lessons run online (teaching plans only). */
  online?: boolean;
  /** The agreed weekly rhythm; visits are derived from it. */
  visits?: VisitPattern;
  /** Visits that were actually recorded as done or missed. */
  sessions?: SessionMark[];
  startDate: string; // ISO — when the current term began
  renewsOn: string; // ISO — when the current term ends / next charge falls due
  autoRenew: boolean;
  status: SubscriptionStatus;
  /** Razorpay subscription id, or a simulated ref in demo mode. */
  paymentRef: string;
  history: SubscriptionCharge[];
  createdAt: string; // ISO timestamp
}

/** Complete money breakdown for one booking. All amounts in whole ₹. */
export interface Quote {
  /** rate × tenure multiplier (× surge if applicable). */
  serviceAmount: number;
  surgeApplied: boolean;
  /** GST collected from the user on top of the service amount. */
  gst: number;
  /** State gig-worker welfare cess collected from the user. */
  cess: number;
  /** serviceAmount + gst + cess — what the user pays. */
  totalUserPays: number;
  /** KAAM's 15% platform fee, retained from the service amount. */
  platformFee: number;
  /** 1% TDS under Section 194-O, deducted from the worker payout. */
  tds: number;
  /** serviceAmount − platformFee − tds — what the worker receives. */
  workerPayout: number;
}
