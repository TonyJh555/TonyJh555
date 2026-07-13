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

/** Generate a 4-digit job-start OTP. */
export function generateStartCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Short unique id for client-side records. */
export function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
