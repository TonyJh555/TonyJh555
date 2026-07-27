"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import type { EventQuote, EventRequest } from "./events";
import type { KeralaDistrict } from "./types";
import { SEED_COMPANIES } from "@/data/event-companies";

/**
 * Event companies, the briefs customers write, and the quotes that come back.
 *
 * Three small stores rather than one, because they are read by three different
 * people: a customer looking at their own event, a company looking at the
 * invitations it received, and the admin desk approving businesses. Keeping
 * them apart means a screen never loads what it has no business reading.
 *
 * Local-first like every other KAAM store; the Supabase mapping mirrors the
 * explicit column lists used elsewhere so a column can never be added on one
 * side only.
 */

export type CompanyStatus = "pending" | "approved" | "rejected";

/** An event management business on KAAM — a company, not an individual. */
export interface EventCompany {
  id: string;
  name: string;
  /** Person KAAM actually talks to. */
  contactName: string;
  phone: string;
  email?: string;
  district: KeralaDistrict;
  city: string;
  /** Years the business has been running. */
  yearsRunning: number;
  /** How many people they can put on the ground. */
  crewSize: number;
  /** What they do — "wedding stages, lighting, live counters". */
  services: string[];
  about: string;
  /** GST number, if registered. Businesses of this size usually are. */
  gstin?: string;
  /** Past work — the thing that actually wins a wedding booking. */
  portfolio: { kind: "image" | "video"; dataUrl: string }[];
  social?: { instagram?: string; youtube?: string; website?: string };
  status: CompanyStatus;
  rejectReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  /** Earned from completed events, like every other rating on KAAM. */
  rating?: number;
  reviewCount?: number;
  eventsDone?: number;
}

/* ── A tiny store factory, so the three below cannot drift apart ──── */

function makeStore<T extends { id: string }>(key: string) {
  const listeners = new Set<() => void>();
  let cache: T[] | null = null;

  const read = (): T[] => {
    if (typeof window === "undefined") return [];
    if (cache === null) {
      try {
        const raw = window.localStorage.getItem(key);
        cache = raw ? (JSON.parse(raw) as T[]) : [];
      } catch {
        cache = [];
      }
    }
    return cache;
  };

  const write = (rows: T[]): boolean => {
    const previous = cache;
    cache = rows;
    try {
      window.localStorage.setItem(key, JSON.stringify(rows));
    } catch {
      cache = previous;
      return false;
    }
    listeners.forEach((fn) => fn());
    return true;
  };

  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return {
    list: read,
    add: (row: T) => write([...read(), row]),
    update: (id: string, patch: Partial<T>) =>
      write(read().map((r) => (r.id === id ? { ...r, ...patch } : r))),
    remove: (id: string) => write(read().filter((r) => r.id !== id)),
    use: () => useSyncExternalStore(subscribe, read, () => [] as T[]),
  };
}

const companies = makeStore<EventCompany>("kaam.event.companies.v1");

/**
 * Seeded businesses sit alongside registered ones rather than being written
 * into storage, so a demo company can never be edited into a real record and
 * the seed file stays the single source for them.
 */
function allCompanies(): EventCompany[] {
  const registered = companies.list();
  const seededIds = new Set(SEED_COMPANIES.map((c) => c.id));
  return [...SEED_COMPANIES, ...registered.filter((c) => !seededIds.has(c.id))];
}
const requests = makeStore<EventRequest>("kaam.event.requests.v1");
const quotes = makeStore<EventQuote>("kaam.event.quotes.v1");

/* ── Companies ───────────────────────────────────────────────────── */

/** Every company a customer could see — seeds plus real registrations. */
export function useCompanies(): EventCompany[] {
  const registered = companies.use();
  const seededIds = new Set(SEED_COMPANIES.map((c) => c.id));
  return [...SEED_COMPANIES, ...registered.filter((c) => !seededIds.has(c.id))];
}
export const listCompanies = allCompanies;
export const updateCompany = companies.update;

export function registerCompany(
  input: Omit<EventCompany, "id" | "status" | "submittedAt">,
): EventCompany {
  const company: EventCompany = {
    ...input,
    id: `ec_${shortId()}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  companies.add(company);
  return company;
}

/** Only approved businesses are ever shown to a customer. */
export function approvedCompanies(all: EventCompany[], district?: string): EventCompany[] {
  return all
    .filter((c) => c.status === "approved" && (!district || c.district === district))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.eventsDone ?? 0) - (a.eventsDone ?? 0));
}

/* ── Requests ────────────────────────────────────────────────────── */

export const useEventRequests = requests.use;
export const listEventRequests = requests.list;
export const updateEventRequest = requests.update;

export function createEventRequest(
  input: Omit<EventRequest, "id" | "status" | "createdAt" | "invitedIds"> & {
    invitedIds?: string[];
  },
): EventRequest {
  const request: EventRequest = {
    ...input,
    invitedIds: input.invitedIds ?? [],
    id: `er_${shortId()}`,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  requests.add(request);
  return request;
}

export function requestsFor(all: EventRequest[], customerId?: string): EventRequest[] {
  return all
    .filter((r) => !customerId || !r.customerId || r.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The briefs one company has been invited to price. */
export function invitesFor(all: EventRequest[], companyId: string): EventRequest[] {
  return all
    .filter((r) => r.status === "open" && r.invitedIds.includes(companyId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ── Quotes ──────────────────────────────────────────────────────── */

export const useEventQuotes = quotes.use;
export const listEventQuotes = quotes.list;
export const updateEventQuote = quotes.update;

export function createQuote(
  input: Omit<EventQuote, "id" | "createdAt">,
): EventQuote {
  const q: EventQuote = { ...input, id: `eq_${shortId()}`, createdAt: new Date().toISOString() };
  quotes.add(q);
  return q;
}

/** This company's quote for this brief, if they have started one. */
export function quoteBy(all: EventQuote[], requestId: string, companyId: string): EventQuote | undefined {
  return all.find((q) => q.requestId === requestId && q.companyId === companyId);
}

/**
 * Award the job. The chosen quote is accepted and every other one is declined
 * in the same breath — a company should never be left refreshing a quote that
 * has quietly lost.
 */
export function awardQuote(requestId: string, quoteId: string) {
  for (const q of quotes.list()) {
    if (q.requestId !== requestId) continue;
    if (q.id === quoteId) quotes.update(q.id, { status: "accepted" });
    else if (q.status === "sent") quotes.update(q.id, { status: "declined" });
  }
  requests.update(requestId, { status: "awarded", awardedQuoteId: quoteId });
}
