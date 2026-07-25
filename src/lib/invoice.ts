"use client";

import type { Booking, Quote, Settlement } from "./types";
import { getCategory } from "@/data/categories";
import { currentCustomer, invoiceEmailFor } from "./auth";
import { invoiceTotals } from "./payment-policy";
import { workerEmailFor } from "./applications";

/**
 * Invoice-on-completion — the receipt Uber/Ola/Urban Company email the moment
 * a job ends.
 *
 * The in-app invoice at /app/receipt/[id] has always existed; this adds the
 * emailed copy, so a customer has the tax invoice in their inbox and a worker
 * has a written earnings record for the same job. Everything here is
 * best-effort: the API route no-ops without RESEND_API_KEY, and a failed send
 * never blocks or changes the completion itself.
 */

/** Exactly what POST /api/invoice-email accepts. */
export interface InvoicePayload {
  bookingId: string;
  service: string;
  workerName: string;
  startedAt?: string;
  completedAt: string;
  actualMinutes?: number;
  billedMinutes?: number;
  serviceAmount: number;
  gst: number;
  cess: number;
  /** Deductions actually applied at checkout. */
  memberDiscount?: number;
  couponCode?: string;
  couponDiscount?: number;
  walletApplied?: number;
  /** What the customer really paid, after every deduction. */
  total: number;
  platformFee: number;
  tds: number;
  workerPayout: number;
  paymentMethod: string;
  customerEmail?: string;
  customerName?: string;
  workerEmail?: string;
  appUrl?: string;
}

/**
 * Build the invoice body for a finished job. Pure — the money always comes
 * from the *settled* quote (the metered one when the meter applied), never
 * the original booking quote, so an overtime job invoices what was really
 * charged.
 */
export function invoicePayload(args: {
  booking: Booking;
  /** The quote as settled at completion (falls back to the booking quote). */
  quote?: Quote | null;
  settlement?: Settlement | null;
  completedAt: string;
  service: string;
  customerEmail?: string;
  customerName?: string;
  workerEmail?: string;
  appUrl?: string;
}): InvoicePayload {
  const { booking, settlement, completedAt, service } = args;
  const q = args.quote ?? booking.quote;
  const totals = invoiceTotals({ quote: q, payment: booking.payment });
  return {
    bookingId: booking.id,
    service,
    workerName: booking.workerName,
    startedAt: booking.startedAt,
    completedAt,
    actualMinutes: settlement?.actualMinutes,
    billedMinutes: settlement?.billedMinutes,
    serviceAmount: q.serviceAmount,
    gst: q.gst,
    cess: q.cess,
    memberDiscount: totals.memberDiscount || undefined,
    couponCode: totals.couponCode,
    couponDiscount: totals.couponDiscount || undefined,
    walletApplied: totals.walletApplied || undefined,
    total: totals.totalPaid,
    platformFee: q.platformFee,
    tds: q.tds,
    workerPayout: q.workerPayout,
    paymentMethod: booking.paymentMethod,
    customerEmail: args.customerEmail,
    customerName: args.customerName,
    workerEmail: args.workerEmail,
    appUrl: args.appUrl,
  };
}

/** Human service label for the invoice line ("Fan repair · Electrician"). */
export function serviceLabel(booking: Booking): string {
  const category = getCategory(booking.categoryId);
  return category ? `${booking.subService} · ${category.label}` : booking.subService;
}

/* ── Send-once guard ──────────────────────────────────────────────
 * Both sides of the marketplace run the completion code, and the dispatch
 * heartbeat ticks every few seconds. One invoice per job, per device. */
const SENT_KEY = "kaam.invoiced.v1";

function alreadySent(bookingId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (ids.includes(bookingId)) return true;
    // Keep the list short — the last 200 jobs is plenty to stop a repeat.
    window.localStorage.setItem(SENT_KEY, JSON.stringify([bookingId, ...ids].slice(0, 200)));
    return false;
  } catch {
    return false;
  }
}

/**
 * Fire the completion invoice. Resolves both recipients from what the app
 * knows: the customer's email when they signed up with one (many sign up by
 * phone, and then only the in-app invoice applies), and the worker's email
 * from their approved KYC application.
 */
export function sendInvoiceEmail(args: {
  booking: Booking;
  quote?: Quote | null;
  settlement?: Settlement | null;
  completedAt: string;
}) {
  const { booking } = args;
  if (typeof window === "undefined" || typeof fetch === "undefined") return;
  if (alreadySent(booking.id)) return;

  const customer = currentCustomer();
  const body = invoicePayload({
    ...args,
    service: serviceLabel(booking),
    customerEmail: invoiceEmailFor(customer),
    customerName: customer?.name,
    workerEmail: workerEmailFor(booking.workerName),
    appUrl: window.location.origin,
  });
  if (!body.customerEmail && !body.workerEmail) return; // nobody to email

  fetch("/api/invoice-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
