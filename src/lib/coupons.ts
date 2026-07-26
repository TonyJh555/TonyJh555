import type { CategoryId } from "./types";

/**
 * KAAM promo codes — a small, self-contained offer engine: flat ₹ off or a
 * capped percentage, optionally limited to a date window and to particular
 * services. Codes are matched case-insensitively at checkout.
 *
 * The list below is the built-in default. The owner edits the live list in
 * Admin → Content → Offers, and every function here takes the list as an
 * argument so the rules stay pure and testable while the data is editable.
 */

export interface Coupon {
  code: string;
  label: string;
  kind: "flat" | "percent";
  /** ₹ for flat, percentage for percent. */
  value: number;
  /** Minimum order value (₹) to qualify. */
  min?: number;
  /** Cap on the discount (₹) for percentage coupons. */
  maxDiscount?: number;
  note: string;
  /** Switched off in the admin console — kept, but not accepted. */
  active?: boolean;
  /** Optional live window, YYYY-MM-DD. Absent = always. */
  startsOn?: string;
  endsOn?: string;
  /** Limit to particular services. Absent/empty = every service. */
  categories?: CategoryId[];
}

export const DEFAULT_COUPONS: Coupon[] = [
  { code: "KAAM50", label: "₹50 off", kind: "flat", value: 50, min: 300, note: "₹50 off bookings over ₹300" },
  { code: "FIRST100", label: "₹100 off", kind: "flat", value: 100, min: 500, note: "₹100 off your first booking" },
  { code: "CARE20", label: "20% off care", kind: "percent", value: 20, maxDiscount: 400, note: "20% off, up to ₹400" },
  { code: "ONAM25", label: "Onam 25% off", kind: "percent", value: 25, maxDiscount: 500, note: "Festive 25% off, up to ₹500" },
  { code: "VISHU25", label: "Vishu 25% off", kind: "percent", value: 25, maxDiscount: 500, note: "Vishu 25% off, up to ₹500" },
  { code: "DIWALI20", label: "Diwali 20% off", kind: "percent", value: 20, maxDiscount: 400, note: "Diwali 20% off, up to ₹400" },
  { code: "NEWYEAR15", label: "New Year 15% off", kind: "percent", value: 15, maxDiscount: 300, note: "New Year 15% off, up to ₹300" },
  { code: "MONSOON15", label: "Monsoon 15% off", kind: "percent", value: 15, maxDiscount: 300, note: "Monsoon home-care 15% off, up to ₹300" },
];

/** Kept for older imports; prefer passing the live list explicitly. */
export const COUPONS = DEFAULT_COUPONS;

/** Where the editable coupon list lives (see src/lib/content.ts). */
export const COUPONS_KEY = "offers.coupons";

export interface CouponContext {
  /** The live list — defaults to the built-ins. */
  coupons?: Coupon[];
  now?: Date;
  /** The service being booked, for category-limited offers. */
  categoryId?: CategoryId;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Is this code live right now, for this service? Separate from the money
 * maths so "why won't my code work" has one clear answer.
 */
export function couponUsable(coupon: Coupon, ctx: CouponContext = {}): boolean {
  if (coupon.active === false) return false;
  const today = ymd(ctx.now ?? new Date());
  if (coupon.startsOn && today < coupon.startsOn) return false;
  if (coupon.endsOn && today > coupon.endsOn) return false;
  if (coupon.categories?.length && ctx.categoryId && !coupon.categories.includes(ctx.categoryId)) {
    return false;
  }
  return true;
}

export function findCoupon(code: string, coupons: Coupon[] = DEFAULT_COUPONS): Coupon | undefined {
  const c = code.trim().toUpperCase();
  return coupons.find((x) => x.code.trim().toUpperCase() === c);
}

/** The rupee discount a coupon yields on an order amount (0 if not eligible). */
export function couponDiscount(coupon: Coupon, amount: number): number {
  if (coupon.min && amount < coupon.min) return 0;
  const raw = coupon.kind === "flat" ? coupon.value : (amount * coupon.value) / 100;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(Math.round(capped), amount));
}

export interface CouponResult {
  ok: boolean;
  discount: number;
  message: string;
  coupon?: Coupon;
}

/** Validate + price a code against an order amount. */
export function applyCoupon(code: string, amount: number, ctx: CouponContext = {}): CouponResult {
  const coupon = findCoupon(code, ctx.coupons ?? DEFAULT_COUPONS);
  if (!coupon) return { ok: false, discount: 0, message: "Invalid code" };
  if (!couponUsable(coupon, ctx)) {
    const today = ymd(ctx.now ?? new Date());
    const message =
      coupon.endsOn && today > coupon.endsOn
        ? `${coupon.code} has expired`
        : coupon.startsOn && today < coupon.startsOn
          ? `${coupon.code} starts on ${coupon.startsOn}`
          : coupon.categories?.length
            ? `${coupon.code} isn't valid for this service`
            : `${coupon.code} isn't available right now`;
    return { ok: false, discount: 0, message };
  }
  if (coupon.min && amount < coupon.min) {
    return { ok: false, discount: 0, message: `Spend ₹${coupon.min}+ to use ${coupon.code}` };
  }
  const discount = couponDiscount(coupon, amount);
  return { ok: true, discount, message: `${coupon.label} applied — you save ₹${discount}`, coupon };
}
