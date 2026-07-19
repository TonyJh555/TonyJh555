"use client";

import { useSyncExternalStore } from "react";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { smsLink, statusMessage, useTrustedContacts, waLink } from "@/lib/safety";

/**
 * Auto-share prompt (Uber's "share my trip"): the moment a worker starts a
 * job in the customer's home, offer one-tap WhatsApp/SMS updates to the
 * trusted contacts marked auto-share. Appears once per booking.
 */

const PROMPTED_KEY = "kaam.safetyprompted.v1";
const listeners = new Set<() => void>();
let cache: string[] | null = null;
const EMPTY: string[] = [];

function readPrompted(): string[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = JSON.parse(window.localStorage.getItem(PROMPTED_KEY) ?? "[]") as string[];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function markPrompted(bookingId: string) {
  cache = [...readPrompted(), bookingId];
  try {
    window.localStorage.setItem(PROMPTED_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function usePrompted(): string[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    readPrompted,
    () => EMPTY,
  );
}

export function SafetyShare() {
  const customer = useCustomer();
  const bookings = useBookings();
  const contacts = useTrustedContacts().filter((c) => c.autoNotify);
  const prompted = usePrompted();

  if (contacts.length === 0) return null;

  const job = bookings.find(
    (b) =>
      (customer ? b.customerId === customer.id : !b.customerId) &&
      b.status === "in_progress" &&
      !prompted.includes(b.id),
  );
  if (!job) return null;

  const text = statusMessage(job);

  return (
    <div className="fixed inset-x-0 bottom-20 z-[300] mx-auto w-full max-w-[430px] px-4">
      <div className="fade-up rounded-2xl border border-kaam-mid bg-white p-3.5 shadow-pop">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold">
            🛡️ {job.workerName.split(" ")[0]} started the job — let your family know
          </p>
          <button onClick={() => markPrompted(job.id)} aria-label="Dismiss" className="text-sm text-dim">
            ✕
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {contacts.map((c) => (
            <a
              key={c.id}
              href={waLink(c.phone, text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => markPrompted(job.id)}
              className="rounded-xl bg-kaam px-3 py-2 text-[11px] font-bold text-white"
            >
              💬 WhatsApp {c.name}
            </a>
          ))}
          {contacts[0] && (
            <a
              href={smsLink(contacts[0].phone, text)}
              onClick={() => markPrompted(job.id)}
              className="rounded-xl border border-line bg-surf px-3 py-2 text-[11px] font-bold text-mid"
            >
              ✉️ SMS
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
