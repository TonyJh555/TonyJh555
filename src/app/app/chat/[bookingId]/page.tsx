"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { getWorker } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { Avatar, BackLink, Tag } from "@/components/ui";
import { ChatPanel } from "@/components/chat-panel";

/**
 * Chat thread page. Two thread kinds share this route:
 * - booking threads: /app/chat/<bookingId>
 * - pre-booking enquiries: /app/chat/enquiry-<workerId> (ask before you book)
 */
export default function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const bookings = useBookings();

  const enquiryWorker = bookingId.startsWith("enquiry-")
    ? getWorker(bookingId.slice("enquiry-".length))
    : undefined;
  const booking = enquiryWorker ? undefined : bookings.find((b) => b.id === bookingId);

  if (!booking && !enquiryWorker) {
    return (
      <main className="px-4 pt-5">
        <header className="mb-4 flex items-center gap-3">
          <BackLink href="/app/bookings" />
          <h1 className="font-display text-lg font-bold">Chat</h1>
        </header>
        <p className="py-16 text-center text-sm text-dim">
          Conversation not found.{" "}
          <Link href="/app/bookings" className="font-bold text-kaam">
            Back to bookings →
          </Link>
        </p>
      </main>
    );
  }

  const worker = enquiryWorker ?? getWorker(booking!.workerId);
  const title = enquiryWorker ? enquiryWorker.name : booking!.workerName;
  const subtitle = enquiryWorker
    ? `${getCategory(enquiryWorker.categoryId).icon} Ask anything before you book`
    : `${getCategory(booking!.categoryId).icon} ${booking!.subService}`;
  const backHref = enquiryWorker ? `/app/worker/${enquiryWorker.id}` : "/app/bookings";

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href={backHref} />
        <Avatar initials={worker?.initials ?? "W"} size={40} online={worker?.online} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold">{title}</h1>
          <p className="text-[11px] text-mid">{subtitle}</p>
        </div>
        <Tag color="blue">🔒 In-app chat</Tag>
      </header>

      <ChatPanel bookingId={bookingId} side="user" heightClass="h-[52vh]" />

      {enquiryWorker && (
        <Link
          href={`/app/book/${enquiryWorker.id}`}
          className="mt-3 block rounded-xl bg-kaam py-3 text-center text-sm font-bold text-white shadow-kaam"
        >
          Book {enquiryWorker.name.split(" ")[0]} →
        </Link>
      )}

      <p className="mt-3 text-center text-[10px] leading-relaxed text-dim">
        🛡️ For your safety, keep all conversations and payments inside KAAM.
        <br />
        Production build: end-to-end encrypted (Signal Protocol) + masked calling via Exotel.
      </p>
    </main>
  );
}
