/** Format a rupee amount with Indian digit grouping, e.g. ₹1,00,800. */
export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Generate a 4-digit job-start OTP. */
export function generateStartCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Short unique id for client-side records. */
export function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
