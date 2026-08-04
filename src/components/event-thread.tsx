"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { sendMessage, useChatMessages } from "@/lib/chat";
import { eventThreadId, openingBrief } from "@/lib/event-talk";
import type { EventRequest } from "@/lib/events";
import { useLanguage } from "@/components/language-provider";

/**
 * The room where a function actually gets agreed.
 *
 * Collapsed by default and opened by name, because a customer comparing four
 * companies wants four conversations they can dip into, not four chat boxes
 * stacked down a page. The unread count is on the closed row — the one thing
 * they need to see without opening anything.
 *
 * The first message is planted the moment it opens, so a company never arrives
 * at an empty box wondering what it is for.
 */
export function EventThread({
  request,
  companyId,
  companyName,
  side,
}: {
  request: EventRequest;
  companyId: string;
  companyName: string;
  side: "user" | "worker";
}) {
  const ml = useLanguage().lang === "ml";
  const [open, setOpen] = useState(false);
  const all = useChatMessages();
  const threadId = eventThreadId(request.id, companyId);
  const messages = all.filter((m) => m.bookingId === threadId);
  const unread = messages.filter(
    (m) => m.sender !== (side === "user" ? "user" : "worker") && !(side === "user" ? m.readByUser : m.readByWorker),
  ).length;

  const start = () => {
    if (messages.length === 0) {
      sendMessage({ bookingId: threadId, sender: "system", text: openingBrief(request) });
    }
    setOpen(true);
  };

  if (!open) {
    return (
      <button
        onClick={start}
        className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-info-mid bg-info-light px-2.5 py-2 text-[11px] font-bold text-info"
      >
        <span>
          💬 {side === "user"
            ? ml ? `${companyName}-നോട് സംസാരിക്കൂ` : `Talk to ${companyName}`
            : ml ? "ഉപഭോക്താവിനോട് സംസാരിക്കൂ" : "Talk to the customer"}
          <span className="ml-1 font-semibold opacity-80">
            {ml ? "· സൗജന്യം" : "· free, before you decide"}
          </span>
        </span>
        {unread > 0 && (
          <span className="ml-2 shrink-0 rounded-full bg-kaam px-1.5 py-0.5 text-[10px] font-extrabold text-white">
            {unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border border-info-mid bg-white p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-extrabold text-info">
          💬 {side === "user" ? companyName : ml ? "ഉപഭോക്താവ്" : "The customer"}
        </p>
        <button onClick={() => setOpen(false)} className="text-[11px] font-bold text-mid">
          {ml ? "▲ മടക്കൂ" : "▲ Close"}
        </button>
      </div>
      {/* Questions before a price. A caterer cannot quote a wedding without
          asking whether it is vegetarian and whether the venue kitchen works,
          and until this existed there was nowhere on KAAM to ask. */}
      <ChatPanel bookingId={threadId} side={side} heightClass="h-56" />
    </div>
  );
}
