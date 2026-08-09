"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { useChatMessages } from "@/lib/chat";
import { useCustomer } from "@/lib/auth";
import { markSeen } from "@/lib/seen";
import { categoryLabel, getCategory } from "@/data/categories";
import { useLanguage } from "@/components/language-provider";
import { BackLink, Card } from "@/components/ui";

function timeAgo(iso: string, ml: boolean): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return ml ? "ഇപ്പോൾ" : "just now";
  if (mins < 60) return ml ? `${mins} മിനിറ്റ് മുൻപ്` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return ml ? `${hrs} മണിക്കൂർ മുൻപ്` : `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(ml ? "ml-IN" : "en-IN", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const customer = useCustomer();
  const bookings = useBookings();
  const messages = useChatMessages();
  const { lang } = useLanguage();
  const ml = lang === "ml";

  // Opening the page clears the unread badge.
  useEffect(() => {
    markSeen();
  }, [messages.length]);

  const myBookings = bookings.filter((b) => (customer ? b.customerId === customer.id : !b.customerId));
  const myIds = new Set(myBookings.map((b) => b.id));
  const byId = new Map(myBookings.map((b) => [b.id, b]));

  const feed = messages
    .filter((m) => myIds.has(m.bookingId) && m.sender !== "user")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app" />
        <h1 className="font-display text-lg font-bold">{ml ? "അറിയിപ്പുകൾ" : "Notifications"}</h1>
      </header>

      {feed.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-2 text-4xl">🔔</p>
          <p className="text-sm font-semibold text-mid">{ml ? "അറിയിപ്പുകൾ ഒന്നുമില്ല" : "No notifications yet"}</p>
          <p className="mt-1 text-xs text-dim">
            {ml ? "ബുക്കിംഗ് അപ്ഡേറ്റുകളും സന്ദേശങ്ങളും ഇവിടെ കാണാം." : "Booking updates and messages will appear here."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {feed.map((m) => {
            const b = byId.get(m.bookingId);
            const cat = b ? getCategory(b.categoryId) : null;
            return (
              <Link key={m.id} href={`/app/chat/${m.bookingId}`}>
                <Card className="fade-up flex items-start gap-3 transition-shadow hover:shadow-pop">
                  <span className="text-xl">{m.sender === "system" ? "📣" : "💬"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold">
                        {cat ? `${cat.icon} ${categoryLabel(cat, ml)}` : ml ? "ബുക്കിംഗ്" : "Booking"}
                        {b ? ` · ${b.workerName.split(" ")[0]}` : ""}
                      </p>
                      <span className="shrink-0 text-[10px] text-dim">{timeAgo(m.createdAt, ml)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-mid">
                      {m.text ?? (m.kind === "image" ? (ml ? "📷 ഫോട്ടോ" : "📷 Photo") : m.kind === "video" ? (ml ? "🎥 വീഡിയോ" : "🎥 Video") : "")}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
