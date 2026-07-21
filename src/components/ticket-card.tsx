"use client";

import { useState } from "react";
import { addNote, replyToTicket, resolveTicket, TICKET_CATEGORIES, type SupportTicket, type TicketReply } from "@/lib/support";
import { refund } from "@/lib/wallet";
import { inr } from "@/lib/format";
import { PRIORITY_META, ticketSla } from "@/lib/support-sla";
import { cannedFor } from "@/lib/canned-replies";
import { Card, Tag } from "@/components/ui";

const SLA_STATE: Record<string, { label: string; cls: string }> = {
  breached: { label: "Past SLA", cls: "bg-kaam-light text-kaam" },
  due_soon: { label: "Due soon", cls: "bg-warn-light text-warn" },
  on_track: { label: "On track", cls: "bg-info-light text-info" },
  met: { label: "Met SLA", cls: "bg-good-light text-good" },
};

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
  const [note, setNote] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const cat = TICKET_CATEGORIES.find((c) => c.id === ticket.category);
  const s = STATUS[ticket.status];
  // Support can settle a customer's money complaint by crediting KAAM Cash.
  const canRefund = as === "support" && ticket.raisedBy === "customer";
  // SLA is an ops concern — only the support desk sees it.
  const sla = as === "support" ? ticketSla(ticket) : null;
  const prio = sla ? PRIORITY_META[sla.priority] : null;

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

      {sla && prio && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          <span className="rounded-full bg-surf px-2 py-0.5 text-mid">
            {prio.emoji} {prio.label} · {sla.targetHours}h SLA
          </span>
          <span className={`rounded-full px-2 py-0.5 ${SLA_STATE[sla.state].cls}`}>
            {SLA_STATE[sla.state].label}
            {ticket.status !== "resolved" &&
              (sla.hoursLeft >= 0
                ? ` · ${sla.hoursLeft < 1 ? `${Math.round(sla.hoursLeft * 60)}m` : `${Math.round(sla.hoursLeft)}h`} left`
                : ` · ${Math.round(-sla.hoursLeft)}h over`)}
          </span>
        </div>
      )}

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

      {/* Internal notes — agent-only, private (e.g. "refund initiated") */}
      {as === "support" && (ticket.notes?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {ticket.notes!.map((n, i) => (
            <div key={i} className="rounded-lg border border-warn-mid bg-warn-light px-3 py-1.5 text-[11px] text-warn">
              🔒 {n.text} <span className="text-dim">· {when(n.at)}</span>
            </div>
          ))}
        </div>
      )}

      {ticket.status !== "resolved" && (
        <>
          {as === "support" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cannedFor(ticket.category).slice(0, 4).map((r) => (
                <button
                  key={r.label}
                  onClick={() => setText(r.text)}
                  title={r.text}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-bold text-mid hover:border-kaam"
                >
                  ⚡ {r.label}
                </button>
              ))}
            </div>
          )}
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
          </div>
        </>
      )}

      {/* Agent controls — internal note + resolve with a reason */}
      {as === "support" && ticket.status !== "resolved" && (
        <div className="mt-2 rounded-xl border border-line bg-surf p-2.5">
          <p className="mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">Agent tools</p>
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note (private)…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-kaam"
            />
            <button
              onClick={() => {
                if (!note.trim()) return;
                addNote(ticket, note.trim());
                setNote("");
              }}
              disabled={!note.trim()}
              className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-mid disabled:opacity-40"
            >
              🔒 Note
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Resolution note (e.g. ₹500 refunded)…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-kaam"
            />
            <button
              onClick={() => {
                resolveTicket(ticket.id, resolveNote.trim() || undefined);
                setResolveNote("");
              }}
              className="rounded-lg border border-good-mid bg-good-light px-3 py-2 text-xs font-bold text-good"
            >
              ✅ Resolve
            </button>
          </div>
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
