import type { BookingSchedule } from "./types";

/** Human-readable visit time, e.g. "⚡ ASAP" or "Sat, 19 Jul · 3:00 PM". */
export function formatSchedule(schedule?: BookingSchedule): string {
  if (!schedule || schedule.when === "asap") return "⚡ ASAP — as soon as possible";
  const [hour, minute] = schedule.time.split(":").map(Number);
  const date = new Date(`${schedule.date}T00:00:00`);
  date.setHours(hour, minute);
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a rupee amount with Indian digit grouping, e.g. ₹1,00,800. */
export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/**
 * A window in words — "5 minutes", "1 hour".
 *
 * So a deadline is never typed into a sentence. A message once promised "2
 * minutes" while the real limit was five, and stayed wrong for as long as
 * nobody happened to compare the two.
 */
export function describeWindow(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** Generate a 4-digit job-start OTP. */
export function generateStartCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Short unique id for client-side records. */
export function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * The reference a customer can quote back at us.
 *
 * The same string the emailed tax invoice prints, so a notification, a receipt
 * and a support ticket all name the job the same way. Without it a phone
 * holding six KAAM alerts says "Fan Repair: nearly an hour worked" six times
 * and identifies nothing.
 */
export function jobRef(bookingId: string): string {
  return `KAAM-${bookingId.slice(-8).toUpperCase()}`;
}

/** "8:12 pm, 2 Aug" — enough to tell this alert from yesterday's. */
export function jobStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${time}, ${day}`;
}

/**
 * One line that says exactly which job this is: what, who, when, and the
 * reference. Every job notification leads with this.
 */
export function jobStampLine(args: {
  bookingId: string;
  workerName?: string;
  at?: string;
}): string {
  const parts = [args.workerName, args.at ? jobStamp(args.at) : "", jobRef(args.bookingId)];
  return parts.filter(Boolean).join(" · ");
}
