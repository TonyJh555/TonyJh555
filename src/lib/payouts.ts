/**
 * Whether real money can actually leave KAAM.
 *
 * A worker tapping "withdraw" and being told "₹1,505 sent — arrives in
 * minutes" when nothing was sent is the worst lie the app could tell: they
 * will plan around that money. Until payout rails are configured, every
 * withdrawal screen says plainly that it is a demo.
 *
 * Set NEXT_PUBLIC_RAZORPAYX_ENABLED once RazorpayX (or another payout
 * provider) is wired to the withdrawal endpoint.
 */
export function payoutsAreLive(): boolean {
  return process.env.NEXT_PUBLIC_RAZORPAYX_ENABLED === "1";
}
