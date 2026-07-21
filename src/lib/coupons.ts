/**
 * KAAM promo codes. A tiny, self-contained coupon engine — enough to run
 * launch offers (flat ₹ off or a capped %) without a backend. Codes are
 * matched case-insensitively at checkout.
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
}

export const COUPONS: Coupon[] = [
  { code: "KAAM50", label: "₹50 off", kind: "flat", value: 50, min: 300, note: "₹50 off bookings over ₹300" },
  { code: "FIRST100", label: "₹100 off", kind: "flat", value: 100, min: 500, note: "₹100 off your first booking" },
  { code: "CARE20", label: "20% off care", kind: "percent", value: 20, maxDiscount: 400, note: "20% off, up to ₹400" },
  { code: "ONAM25", label: "Onam 25% off", kind: "percent", value: 25, maxDiscount: 500, note: "Festive 25% off, up to ₹500" },
  { code: "VISHU25", label: "Vishu 25% off", kind: "percent", value: 25, maxDiscount: 500, note: "Vishu 25% off, up to ₹500" },
  { code: "DIWALI20", label: "Diwali 20% off", kind: "percent", value: 20, maxDiscount: 400, note: "Diwali 20% off, up to ₹400" },
  { code: "NEWYEAR15", label: "New Year 15% off", kind: "percent", value: 15, maxDiscount: 300, note: "New Year 15% off, up to ₹300" },
  { code: "MONSOON15", label: "Monsoon 15% off", kind: "percent", value: 15, maxDiscount: 300, note: "Monsoon home-care 15% off, up to ₹300" },
];

export function findCoupon(code: string): Coupon | undefined {
  const c = code.trim().toUpperCase();
  return COUPONS.find((x) => x.code === c);
}

/** The rupee discount a coupon yields on an order amount (0 if not eligible). */
export function couponDiscount(coupon: Coupon, amount: number): number {
  if (coupon.min && amount < coupon.min) return 0;
  const raw = coupon.kind === "flat" ? coupon.value : (amount * coupon.value) / 100;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.min(Math.round(capped), amount);
}

export interface CouponResult {
  ok: boolean;
  discount: number;
  message: string;
  coupon?: Coupon;
}

/** Validate + price a code against an order amount. */
export function applyCoupon(code: string, amount: number): CouponResult {
  const coupon = findCoupon(code);
  if (!coupon) return { ok: false, discount: 0, message: "Invalid code" };
  if (coupon.min && amount < coupon.min) {
    return { ok: false, discount: 0, message: `Spend ₹${coupon.min}+ to use ${coupon.code}` };
  }
  const discount = couponDiscount(coupon, amount);
  return { ok: true, discount, message: `${coupon.label} applied — you save ₹${discount}`, coupon };
}
