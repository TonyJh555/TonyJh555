/** Core domain types for the KAAM marketplace. */

export type CategoryId =
  | "elec" | "plumb" | "mech" | "ac" | "nurse" | "driver" | "tutor"
  | "cook" | "clean" | "beauty" | "carp" | "pest" | "physio" | "painter"
  | "movers" | "yoga" | "photo" | "cctv" | "ro" | "massage"
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

export interface Worker {
  id: string;
  name: string;
  categoryId: CategoryId;
  rating: number;
  reviewCount: number;
  /** Rate in ₹ per `unit`. */
  rate: number;
  unit: PriceUnit;
  distanceKm: number;
  initials: string;
  verified: boolean;
  experienceYears: number;
  city: string;
  etaMinutes: number;
  jobsDone: number;
  bio: string;
  skills: string[];
  badges: string[];
  surge: boolean;
  online: boolean;
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
  rating?: number;
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
