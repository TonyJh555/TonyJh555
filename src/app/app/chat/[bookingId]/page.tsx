"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { getWorker } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { Avatar, BackLink, Tag } from "@/components/ui";
import { ChatPanel } from "@/components/chat-panel";
import { useLanguage } from "@/components/language-provider";

/** Booking chat — available only after a booking is placed. */
export default function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const bookings = useBookings();
  const booking = bookings.find((b) => b.id === bookingId);
  const { lang } = useLanguage();
  const ml = lang === "ml";

  if (!booking) {
    return (
      <main className="px-4 pt-5">
        <header className="mb-4 flex items-center gap-3">
          <BackLink href="/app/bookings" />
          <h1 className="font-display text-lg font-bold">{ml ? "ചാറ്റ്" : "Chat"}</h1>
        </header>
        <p className="py-16 text-center text-sm text-dim">
          {ml ? "സംഭാഷണം കണ്ടെത്തിയില്ല. " : "Conversation not found. "}
          <Link href="/app/bookings" className="font-bold text-kaam">
            {ml ? "ബുക്കിംഗുകളിലേക്ക് →" : "Back to bookings →"}
          </Link>
        </p>
      </main>
    );
  }

  const worker = getWorker(booking.workerId);
  const category = getCategory(booking.categoryId);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/bookings" />
        <Avatar initials={worker?.initials ?? "W"} size={40} online={worker?.online} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold">{booking.workerName}</h1>
          <p className="text-[11px] text-mid">
            {category.icon} {booking.subService}
          </p>
        </div>
        <Tag color="blue">🔒 {ml ? "ആപ്പ് ചാറ്റ്" : "In-app chat"}</Tag>
      </header>

      <ChatPanel bookingId={booking.id} side="user" heightClass="h-[55vh]" />

      <p className="mt-3 text-center text-[10px] leading-relaxed text-dim">
        {ml
          ? "🛡️ നിങ്ങളുടെ സുരക്ഷയ്ക്കായി, എല്ലാ സംഭാഷണങ്ങളും പേയ്മെന്റുകളും കാമിനുള്ളിൽ സൂക്ഷിക്കൂ."
          : "🛡️ For your safety, keep all conversations and payments inside KAAM."}
      </p>
    </main>
  );
}
