"use client";

import { useState } from "react";
import { replyToTicket, resolveTicket, TICKET_CATEGORIES, type SupportTicket, type TicketReply } from "@/lib/support";
import { Card, Tag } from "@/components/ui";

const STATUS: Record<SupportTicket["status"], { label: string; color: "yellow" | "blue" | "green" }> = {
  open: { label: "🟡 Open", color: "yellow" },
  in_review: { label: "🔵 In review", color: "blue" },
  resolved: { label: "✅ Resolved", color: "green" },
};

const FROM_LABEL: Record<TicketReply["from"], string> = {
  customer: "You",
  worker: "You",
  support: "KAAM Support",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** A support ticket thread with a reply box. `as` is who is viewing/replying. */
export function TicketCard({ ticket, as }: { ticket: SupportTicket; as: TicketReply["from"] }) {
  const [text, setText] = useState("");
  const cat = TICKET_CATEGORIES.find((c) => c.id === ticket.category);
  const s = STATUS[ticket.status];

  const send = () => {
    if (!text.trim()) return;
    replyToTicket(ticket, as, text.trim());
    setText("");
  };

  return (
    <Card className="fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {cat?.icon} {ticket.subject}
          </p>
          <p className="text-[11px] text-mid">
            {cat?.label} · {ticket.raisedBy === "worker" ? "👷" : "👤"} {ticket.raiserName}
            {ticket.bookingId ? ` · booking #${ticket.bookingId}` : ""} · {when(ticket.createdAt)}
          </p>
        </div>
        <Tag color={s.color}>{s.label}</Tag>
      </div>

      <p className="mt-2 rounded-lg bg-surf px-3 py-2 text-xs text-ink">{ticket.message}</p>

      {ticket.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {ticket.replies.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-xs ${
                r.from === "support" ? "bg-info-light text-info" : "bg-kaam-light text-ink"
              }`}
            >
              <span className="font-bold">{FROM_LABEL[r.from]}</span> · {when(r.at)}
              <p className="mt-0.5">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {ticket.status !== "resolved" && (
        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={as === "support" ? "Reply to the customer…" : "Add a reply…"}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surf px-3 py-2 text-xs outline-none focus:border-kaam"
          />
          <button onClick={send} disabled={!text.trim()} className="rounded-lg bg-kaam px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
            Send
          </button>
          {as === "support" && (
            <button
              onClick={() => resolveTicket(ticket.id)}
              className="rounded-lg border border-good-mid bg-good-light px-3 py-2 text-xs font-bold text-good"
            >
              Resolve
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
