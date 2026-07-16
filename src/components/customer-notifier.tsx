"use client";

import { useEffect, useRef } from "react";
import { useChatMessages } from "@/lib/chat";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { notify } from "@/lib/notify";

/**
 * Watches the current customer's threads and fires a notification when the
 * worker (or the system) sends a new message while the app isn't in focus —
 * so a reply after booking reaches the customer like Swiggy/Uber updates.
 * Renders nothing.
 */
export function CustomerNotifier() {
  const customer = useCustomer();
  const messages = useChatMessages();
  const bookings = useBookings();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!customer) return;
    const myBookingIds = new Set(
      bookings.filter((b) => b.customerId === customer.id).map((b) => b.id),
    );
    const relevant = messages.filter(
      (m) => myBookingIds.has(m.bookingId) && m.sender !== "user",
    );

    // First pass: remember the backlog without alerting on old messages.
    if (seen.current === null) {
      seen.current = new Set(relevant.map((m) => m.id));
      return;
    }

    const visible =
      typeof document !== "undefined" && document.visibilityState === "visible";

    for (const m of relevant) {
      if (seen.current.has(m.id)) continue;
      seen.current.add(m.id);
      if (visible) continue; // in-app UI already shows it
      const body =
        m.text ||
        (m.kind === "image" ? "📷 Sent a photo" : m.kind === "video" ? "🎥 Sent a video" : "New message");
      notify("KAAM — new message", body, `/app/chat/${m.bookingId}`);
    }
  }, [messages, bookings, customer]);

  return null;
}
