"use client";

import { useState } from "react";
import { replyToTicket, resolveTicket, TICKET_CATEGORIES, type SupportTicket, type TicketReply } from "@/lib/support";
import { refund } from "@/lib/wallet";
import { inr } from "@/lib/format";
import { Card, Tag } from "@/components/ui";

const COMPENSATION_PRESETS = [50, 100, 200, 500];

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
  const [comp, setComp] = useState("");
  const cat = TICKET_CATEGORIES.find((c) => c.id === ticket.category);
  const s = STATUS[ticket.status];
  // Support can settle a customer's money complaint by crediting KAAM Cash.
  const canRefund = as === "support" && ticket.raisedBy === "customer";

  const send = () => {
    if (!text.trim()) return;
    replyToTicket(ticket, as, text.trim());
    setText("");
  };

  const issueRefund = () => {
    const amount = Number(comp);
    if (!amount || amount <= 0) return;
    refund(amount, `Support resolution · ${ticket.subject}`);
    replyToTicket(
      ticket,
      "support",
      `We've credited ${inr(amount)} to your KAAM Cash as resolution. Sorry for the trouble — thank you for your patience. 💚`,
    );
    resolveTicket(ticket.id);
    setComp("");
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

      {/* Money resolution — credit KAAM Cash for a customer's refund/payment issue */}
      {canRefund && ticket.status !== "resolved" && (
        <div className="mt-2 rounded-lg border border-line bg-surf p-2.5">
          <p className="mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">
            💸 Issue refund / goodwill credit
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {COMPENSATION_PRESETS.map((amt) => (
              <button
                key={amt}
                onClick={() => setComp(String(amt))}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                  comp === String(amt) ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
                }`}
              >
                {inr(amt)}
              </button>
            ))}
            <input
              value={comp}
              onChange={(e) => setComp(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="₹"
              className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-[11px] outline-none focus:border-kaam"
            />
            <button
              onClick={issueRefund}
              disabled={!Number(comp)}
              className="ml-auto rounded-lg bg-kaam px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
            >
              Credit &amp; resolve
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
