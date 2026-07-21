import type { SupportTicket, TicketCategory } from "./support";
import { ticketPriority, ticketSla, type Priority } from "./support-sla";

/**
 * Support analytics — the owner's view of the care team's health. Answers
 * the questions that let you manage support, not just run it: are we hitting
 * SLA? how fast do we first respond? what's driving ticket volume? Pure and
 * unit-tested.
 */

export interface SupportAnalytics {
  total: number;
  /** Unresolved (open + in_review). */
  open: number;
  resolved: number;
  /** Of resolved tickets, the share that met their SLA target (0..1). */
  slaMetRate: number;
  /** Avg hours from raise → first support reply (tickets that got one). */
  avgFirstResponseHours: number;
  /** Avg hours from raise → resolved. */
  avgResolutionHours: number;
  byCategory: { category: TicketCategory; count: number }[];
  byPriority: { priority: Priority; count: number }[];
}

function firstSupportReplyAt(t: SupportTicket): string | undefined {
  return t.replies.find((r) => r.from === "support")?.at;
}

export function supportAnalytics(tickets: SupportTicket[], now: Date = new Date()): SupportAnalytics {
  const resolved = tickets.filter((t) => t.status === "resolved");

  const met = resolved.filter((t) => ticketSla(t, now).state === "met").length;

  const responded = tickets
    .map((t) => {
      const at = firstSupportReplyAt(t);
      return at ? (new Date(at).getTime() - new Date(t.createdAt).getTime()) / 3_600_000 : null;
    })
    .filter((h): h is number => h !== null && h >= 0);

  const resolutionHours = resolved
    .filter((t) => t.resolvedAt)
    .map((t) => (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 3_600_000);

  const catMap = new Map<TicketCategory, number>();
  const prioMap = new Map<Priority, number>();
  for (const t of tickets) {
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1);
    const p = ticketPriority(t);
    prioMap.set(p, (prioMap.get(p) ?? 0) + 1);
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status !== "resolved").length,
    resolved: resolved.length,
    slaMetRate: resolved.length ? met / resolved.length : 1,
    avgFirstResponseHours: avg(responded),
    avgResolutionHours: avg(resolutionHours),
    byCategory: [...catMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    byPriority: [...prioMap.entries()]
      .map(([priority, count]) => ({ priority, count }))
      .sort((a, b) => b.count - a.count),
  };
}
