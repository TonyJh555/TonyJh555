"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { getCategory } from "@/data/categories";
import { formatSchedule } from "@/lib/format";
import { raiseTicket, TICKET_CATEGORIES, type TicketCategory, type TicketParty } from "@/lib/support";
import { slaTargetHours } from "@/lib/support-sla";
import { Card } from "@/components/ui";

/**
 * Support chatbot — the guided intake world-class apps use. It greets the
 * user, grabs their details automatically, asks what the issue is about and
 * which booking (job ID) it concerns, then files a clean, structured ticket
 * for the agent desk. No blank forms, no missing job IDs.
 */
type Step = "category" | "booking" | "describe" | "done";

interface Msg {
  from: "bot" | "user";
  text: string;
}

export function SupportChatbot({
  raisedBy,
  raiserId,
  raiserName,
  raiserEmail,
  bookings,
  defaultCategory,
  onSwitchToForm,
}: {
  raisedBy: TicketParty;
  raiserId?: string;
  raiserName: string;
  raiserEmail?: string;
  bookings: Booking[];
  defaultCategory?: TicketCategory;
  onSwitchToForm?: () => void;
}) {
  const firstName = raiserName.split(" ")[0];
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: `Hi ${firstName} 👋 I'm KAAM Assist. What can we help you with?` },
  ]);
  const [step, setStep] = useState<Step>(defaultCategory ? "booking" : "category");
  const [category, setCategory] = useState<TicketCategory | null>(defaultCategory ?? null);
  const [bookingId, setBookingId] = useState<string | undefined>(undefined);
  const [desc, setDesc] = useState("");

  const say = (from: Msg["from"], text: string) => setMsgs((m) => [...m, { from, text }]);

  const pickCategory = (c: TicketCategory) => {
    const label = TICKET_CATEGORIES.find((x) => x.id === c)!.label;
    setCategory(c);
    say("user", label);
    say("bot", "Got it. Is this about a specific booking? Pick one, or skip.");
    setStep("booking");
  };

  const pickBooking = (b?: Booking) => {
    setBookingId(b?.id);
    say("user", b ? `${getCategory(b.categoryId).icon} ${b.subService} · #${b.id}` : "Not about a booking");
    say("bot", "Thanks. Please describe the issue in a few words and I'll raise it for you.");
    setStep("describe");
  };

  const submit = () => {
    if (!category || !desc.trim()) return;
    const catLabel = TICKET_CATEGORIES.find((x) => x.id === category)!.label;
    raiseTicket({
      raisedBy,
      raiserId,
      raiserName,
      raiserEmail,
      bookingId,
      category,
      subject: `${catLabel}${bookingId ? ` · #${bookingId}` : ""}`,
      message: desc.trim(),
    });
    say("user", desc.trim());
    say(
      "bot",
      `Done ✅ Your request is logged and our team will respond within ${slaTargetHours({ category })} hours. You'll get updates here and by email.`,
    );
    setDesc("");
    setStep("done");
  };

  const recent = bookings.slice(0, 4);

  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kaam text-sm text-white">🤖</span>
        <div>
          <p className="text-sm font-bold">KAAM Assist</p>
          <p className="text-[10px] text-good">● Online · replies now</p>
        </div>
        {onSwitchToForm && (
          <button onClick={onSwitchToForm} className="ml-auto text-[11px] font-bold text-kaam">
            Use a form →
          </button>
        )}
      </div>

      {/* Conversation */}
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              m.from === "bot"
                ? "self-start rounded-bl-sm bg-surf text-ink"
                : "self-end rounded-br-sm bg-kaam text-white"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Controls per step */}
      <div className="border-t border-line p-3">
        {step === "category" && (
          <div className="flex flex-wrap gap-2">
            {TICKET_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink"
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        )}

        {step === "booking" && (
          <div className="flex flex-wrap gap-2">
            {recent.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBooking(b)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-left text-[11px] font-bold text-ink"
              >
                {getCategory(b.categoryId).icon} {b.subService}
                <span className="block text-[10px] font-normal text-dim">
                  #{b.id} · {formatSchedule(b.schedule)}
                </span>
              </button>
            ))}
            <button
              onClick={() => pickBooking(undefined)}
              className="rounded-xl border border-line bg-surf px-3 py-2 text-xs font-bold text-mid"
            >
              Not about a booking
            </button>
          </div>
        )}

        {step === "describe" && (
          <div className="flex gap-2">
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Describe your issue…"
              className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
            />
            <button
              onClick={submit}
              disabled={!desc.trim()}
              className="rounded-xl bg-kaam px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
        )}

        {step === "done" && (
          <p className="text-center text-[11px] text-dim">
            Your request is with our team. Track replies below or in your email.
          </p>
        )}
      </div>
    </Card>
  );
}
