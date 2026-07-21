import type { SupportTicket, TicketCategory } from "./support";

/**
 * Support SLA — the operational spine that makes customer care trustworthy.
 * Every ticket gets a priority from how serious it is, a response-time
 * target, and a live SLA state (on track / due soon / breached). Serious
 * categories also trigger email escalation. Pure and unit-tested so the
 * admin desk and the notifier share one source of truth.
 */

export type Priority = "critical" | "high" | "normal" | "low";

/** How serious each complaint type is. */
export const CATEGORY_PRIORITY: Record<TicketCategory, Priority> = {
  safety: "critical", // someone felt unsafe — respond fastest
  refund: "high",
  payment: "high", // money problems erode trust quickly
  quality: "normal",
  account: "low",
  other: "low",
};

/** Response-time target (hours) per priority. */
export const PRIORITY_HOURS: Record<Priority, number> = {
  critical: 2,
  high: 8,
  normal: 24,
  low: 48,
};

export const PRIORITY_META: Record<Priority, { label: string; emoji: string; serious: boolean }> = {
  critical: { label: "Critical", emoji: "🔴", serious: true },
  high: { label: "High", emoji: "🟠", serious: true },
  normal: { label: "Normal", emoji: "🟡", serious: false },
  low: { label: "Low", emoji: "⚪", serious: false },
};

export function ticketPriority(t: Pick<SupportTicket, "category">): Priority {
  return CATEGORY_PRIORITY[t.category];
}

export function slaTargetHours(t: Pick<SupportTicket, "category">): number {
  return PRIORITY_HOURS[ticketPriority(t)];
}

/** Serious tickets (safety/refund/payment) warrant an email escalation. */
export function isSerious(t: Pick<SupportTicket, "category">): boolean {
  return PRIORITY_META[ticketPriority(t)].serious;
}

export type SlaState = "met" | "on_track" | "due_soon" | "breached";

export interface Sla {
  priority: Priority;
  targetHours: number;
  /** Hours until the target (negative = overdue). 0 for resolved. */
  hoursLeft: number;
  state: SlaState;
  dueAt: string; // ISO
}

/** Live SLA for a ticket. Resolved tickets report whether they met the target. */
export function ticketSla(t: SupportTicket, now: Date = new Date()): Sla {
  const priority = ticketPriority(t);
  const targetHours = PRIORITY_HOURS[priority];
  const created = new Date(t.createdAt).getTime();
  const dueAt = new Date(created + targetHours * 3_600_000).toISOString();

  if (t.status === "resolved" && t.resolvedAt) {
    const resolvedInHours = (new Date(t.resolvedAt).getTime() - created) / 3_600_000;
    return { priority, targetHours, hoursLeft: 0, state: resolvedInHours <= targetHours ? "met" : "breached", dueAt };
  }

  const elapsedHours = (now.getTime() - created) / 3_600_000;
  const hoursLeft = targetHours - elapsedHours;
  const state: SlaState = hoursLeft < 0 ? "breached" : hoursLeft < targetHours * 0.25 ? "due_soon" : "on_track";
  return { priority, targetHours, hoursLeft, state, dueAt };
}

/**
 * Sort key for the admin queue: most-overdue first, then soonest-due, with
 * resolved tickets sinking to the bottom. Ascending sort.
 */
export function slaSortRank(t: SupportTicket, now: Date = new Date()): number {
  if (t.status === "resolved") return Number.MAX_SAFE_INTEGER;
  return ticketSla(t, now).hoursLeft;
}

/** Count of unresolved tickets past their SLA target. */
export function breachingCount(tickets: SupportTicket[], now: Date = new Date()): number {
  return tickets.filter((t) => t.status !== "resolved" && ticketSla(t, now).state === "breached").length;
}
