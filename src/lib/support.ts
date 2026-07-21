"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { isSerious, slaTargetHours } from "./support-sla";

/**
 * Support & disputes — the customer-care backbone. Customers and workers raise
 * tickets (refunds, payment/fund-transfer issues, safety or bad-experience
 * reports, service quality, account help); the admin support desk replies and
 * resolves. Cloud-synced via Supabase when configured, with a localStorage
 * fallback so it always works.
 */

export type TicketCategory = "refund" | "payment" | "safety" | "quality" | "account" | "other";
export type TicketStatus = "open" | "in_review" | "resolved";
export type TicketParty = "customer" | "worker";

export const TICKET_CATEGORIES: { id: TicketCategory; label: string; icon: string }[] = [
  { id: "refund", label: "Refund request", icon: "💸" },
  { id: "payment", label: "Payment / fund transfer", icon: "🏦" },
  { id: "safety", label: "Safety / bad experience", icon: "🛡️" },
  { id: "quality", label: "Service quality", icon: "⭐" },
  { id: "account", label: "Account help", icon: "👤" },
  { id: "other", label: "Something else", icon: "💬" },
];

export interface TicketReply {
  from: TicketParty | "support";
  text: string;
  at: string;
}

export interface SupportTicket {
  id: string;
  raisedBy: TicketParty;
  /** customerId or workerId of the raiser (for per-user filtering). */
  raiserId?: string;
  raiserName: string;
  /** Email for the acknowledgement / escalation mail (not persisted to cloud). */
  raiserEmail?: string;
  /** Related booking, if the ticket is about one. */
  bookingId?: string;
  category: TicketCategory;
  subject: string;
  message: string;
  status: TicketStatus;
  replies: TicketReply[];
  createdAt: string;
  resolvedAt?: string;
}

const STORAGE_KEY = "kaam.support.v1";
const listeners = new Set<() => void>();
let cache: SupportTicket[] | null = null;
let cloudInit = false;

function readLocal(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SupportTicket[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(tickets: SupportTicket[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    // ignore
  }
}

function read(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  if (cache === null) cache = readLocal();
  return cache;
}

function setCache(next: SupportTicket[]) {
  cache = next;
  writeLocal(next);
  listeners.forEach((fn) => fn());
}

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toRow(t: SupportTicket): Row {
  return {
    id: t.id,
    raised_by: t.raisedBy,
    raiser_id: t.raiserId ?? null,
    raiser_name: t.raiserName,
    booking_id: t.bookingId ?? null,
    category: t.category,
    subject: t.subject,
    message: t.message,
    status: t.status,
    replies: t.replies,
    created_at: t.createdAt,
    resolved_at: t.resolvedAt ?? null,
  };
}

function fromRow(r: Row): SupportTicket {
  return {
    id: r.id as string,
    raisedBy: r.raised_by as TicketParty,
    raiserId: (r.raiser_id as string) ?? undefined,
    raiserName: r.raiser_name as string,
    bookingId: (r.booking_id as string) ?? undefined,
    category: r.category as TicketCategory,
    subject: r.subject as string,
    message: r.message as string,
    status: r.status as TicketStatus,
    replies: (r.replies as TicketReply[]) ?? [],
    createdAt: r.created_at as string,
    resolvedAt: (r.resolved_at as string) ?? undefined,
  };
}

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return;
    setCache(data.map(fromRow));
  } catch {
    // keep local
  }
}

function ensureCloud() {
  if (cloudInit || typeof window === "undefined" || !isSupabaseConfigured()) return;
  cloudInit = true;
  const sb = getSupabase();
  if (!sb) return;
  refetchCloud();
  try {
    sb.channel("kaam-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // realtime unavailable
  }
}

/* ── Public API ──────────────────────────────────────────────────── */
export interface NewTicket {
  raisedBy: TicketParty;
  raiserId?: string;
  raiserName: string;
  /** For the acknowledgement / SLA-escalation email (best-effort). */
  raiserEmail?: string;
  bookingId?: string;
  category: TicketCategory;
  subject: string;
  message: string;
}

/** Insert a fully-formed ticket (used by raiseTicket and demo seeding). */
export function addTicket(ticket: SupportTicket) {
  setCache([ticket, ...read()]);
  const sb = getSupabase();
  if (sb) {
    sb.from("support_tickets")
      .insert(toRow(ticket))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud ticket insert failed, using local", error.message);
      });
  }
}

export function raiseTicket(input: NewTicket): SupportTicket {
  const ticket: SupportTicket = {
    ...input,
    id: shortId(),
    status: "open",
    replies: [],
    createdAt: new Date().toISOString(),
  };
  addTicket(ticket);
  // Acknowledge by email and escalate serious (safety/refund/payment) ones,
  // with the SLA target. Best-effort — no-ops without RESEND_API_KEY.
  if (typeof fetch !== "undefined") {
    fetch("/api/support-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.raiserEmail,
        name: input.raiserName,
        raisedBy: input.raisedBy,
        category: input.category,
        subject: input.subject,
        serious: isSerious(input),
        targetHours: slaTargetHours(input),
      }),
    }).catch(() => {});
  }
  return ticket;
}

export function removeTicket(id: string) {
  setCache(read().filter((t) => t.id !== id));
  const sb = getSupabase();
  if (sb) {
    sb.from("support_tickets")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud ticket delete failed, using local", error.message);
      });
  }
}

/** Non-reactive snapshot (client-only). */
export function listTickets(): SupportTicket[] {
  return read();
}

export function updateTicket(id: string, patch: Partial<SupportTicket>) {
  setCache(read().map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const sb = getSupabase();
  if (sb) {
    const row: Row = {};
    if ("status" in patch) row.status = patch.status;
    if ("replies" in patch) row.replies = patch.replies;
    if ("resolvedAt" in patch) row.resolved_at = patch.resolvedAt ?? null;
    if (Object.keys(row).length) {
      sb.from("support_tickets")
        .update(row)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("KAAM: cloud ticket update failed, using local", error.message);
        });
    }
  }
}

/** Append a reply from the raiser or the support desk. */
export function replyToTicket(ticket: SupportTicket, from: TicketReply["from"], text: string) {
  const reply: TicketReply = { from, text, at: new Date().toISOString() };
  updateTicket(ticket.id, {
    replies: [...ticket.replies, reply],
    status: from === "support" ? "in_review" : ticket.status === "resolved" ? "in_review" : ticket.status,
  });
}

export function resolveTicket(id: string) {
  updateTicket(id, { status: "resolved", resolvedAt: new Date().toISOString() });
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: SupportTicket[] = [];

export function useTickets(): SupportTicket[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Tickets raised by a given customer/worker (or local unowned ones). */
export function ticketsFor(all: SupportTicket[], raiserId?: string): SupportTicket[] {
  return all.filter((t) => (raiserId ? t.raiserId === raiserId : !t.raiserId));
}

export function openTicketCount(all: SupportTicket[]): number {
  return all.filter((t) => t.status !== "resolved").length;
}

export interface SupportMetrics {
  open: number;
  inReview: number;
  resolved: number;
  /** Average hours from raise to resolve across resolved tickets (0 if none). */
  avgResolutionHours: number;
}

/** Pure desk-health summary for the admin overview. */
export function supportMetrics(all: SupportTicket[]): SupportMetrics {
  const resolved = all.filter((t) => t.status === "resolved" && t.resolvedAt);
  const totalHours = resolved.reduce(
    (s, t) => s + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 3_600_000,
    0,
  );
  return {
    open: all.filter((t) => t.status === "open").length,
    inReview: all.filter((t) => t.status === "in_review").length,
    resolved: resolved.length,
    avgResolutionHours: resolved.length ? totalHours / resolved.length : 0,
  };
}
