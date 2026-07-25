"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { getCategory } from "@/data/categories";
import { formatSchedule, inr } from "@/lib/format";
import {
  inferTicketCategory,
  raiseTicket,
  TICKET_CATEGORIES,
  type TicketCategory,
  type TicketParty,
} from "@/lib/support";
import { slaTargetHours } from "@/lib/support-sla";
import { Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * Support chatbot — the guided intake world-class apps use, but type-first.
 * The user can simply type their problem from the very first message; tagging a
 * topic or attaching a booking is optional and one tap. It grabs the user's
 * details automatically and files a clean, structured ticket for the agent
 * desk — routing a free-typed complaint to the right queue when no topic is
 * picked. No forced steps, no raw IDs on screen.
 */
interface Msg {
  from: "bot" | "user";
  text: string;
}

/** Human-readable booking label — service, worker, when, price. No raw IDs. */
function bookingLabel(b: Booking): string {
  const cat = getCategory(b.categoryId);
  const worker = b.workerName?.split(" ")[0];
  return `${cat.icon} ${b.subService}${worker ? ` · ${worker}` : ""} · ${formatSchedule(b.schedule)} · ${inr(b.quote.totalUserPays)}`;
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
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const firstName = raiserName.split(" ")[0];
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "bot",
      text: ml
        ? `നമസ്കാരം ${firstName} 👋 ഞാൻ കാം അസിസ്റ്റ്. എന്താണ് പ്രശ്നമെന്ന് താഴെ ടൈപ്പ് ചെയ്യൂ. വിഷയം തിരഞ്ഞെടുക്കുകയോ ബുക്കിംഗ് ചേർക്കുകയോ ചെയ്യാം — നിർബന്ധമല്ല.`
        : `Hi ${firstName} 👋 I'm KAAM Assist. Tell me what's wrong — just type below. You can tag a topic or attach a booking if you like, but you don't have to.`,
    },
  ]);
  const [category, setCategory] = useState<TicketCategory | null>(defaultCategory ?? null);
  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [desc, setDesc] = useState("");
  const [done, setDone] = useState(false);

  const say = (from: Msg["from"], text: string) => setMsgs((m) => [...m, { from, text }]);

  const recent = bookings.slice(0, 4);
  const catMeta = (c: TicketCategory) => TICKET_CATEGORIES.find((x) => x.id === c)!;

  const submit = () => {
    const message = desc.trim();
    if (!message) return;
    // If the user never tagged a topic, route from what they typed.
    const finalCategory = category ?? inferTicketCategory(message);
    const catLabel = catMeta(finalCategory).label;
    raiseTicket({
      raisedBy,
      raiserId,
      raiserName,
      raiserEmail,
      bookingId: booking?.id,
      category: finalCategory,
      subject: `${catLabel}${booking ? ` · ${booking.subService}` : ""}`,
      message,
    });
    say("user", message);
    const hours = slaTargetHours({ category: finalCategory });
    say(
      "bot",
      ml
        ? `പൂർത്തിയായി ✅ നിങ്ങളുടെ അഭ്യർത്ഥന${booking ? ` (${booking.subService} ബുക്കിംഗ്)` : ""} രേഖപ്പെടുത്തി. ${hours} മണിക്കൂറിനുള്ളിൽ ഞങ്ങളുടെ ടീം മറുപടി നൽകും. അപ്ഡേറ്റുകൾ ഇവിടെയും ഇമെയിലിലും ലഭിക്കും.`
        : `Done ✅ Your request is logged${booking ? ` for your ${booking.subService} booking` : ""} and our team will respond within ${hours} hours. You'll get updates here and by email.`,
    );
    setDesc("");
    setDone(true);
  };

  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kaam text-sm text-white">🤖</span>
        <div>
          <p className="text-sm font-bold">KAAM Assist</p>
          <p className="text-[10px] text-good">● {ml ? "ഓൺലൈൻ · ഉടൻ മറുപടി" : "Online · replies now"}</p>
        </div>
        {onSwitchToForm && (
          <button onClick={onSwitchToForm} className="ml-auto text-[11px] font-bold text-kaam">
            {ml ? "ഫോം ഉപയോഗിക്കൂ →" : "Use a form →"}
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

      {/* Controls */}
      {!done ? (
        <div className="flex flex-col gap-2.5 border-t border-line p-3">
          {/* Optional topic tags — shown until one is picked */}
          {!category && (
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-wide text-dim uppercase">
                {ml ? "വിഷയം (നിർബന്ധമല്ല)" : "Topic (optional)"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TICKET_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink hover:border-kaam"
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional booking attach — shown until one is attached */}
          {!booking && recent.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-wide text-dim uppercase">
                {ml ? "ബുക്കിംഗ് ചേർക്കൂ (നിർബന്ധമല്ല)" : "Attach a booking (optional)"}
              </p>
              <div className="flex flex-col gap-1.5">
                {recent.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBooking(b)}
                    className="rounded-xl border border-line bg-white px-3 py-2 text-left text-[11px] font-bold text-ink hover:border-kaam"
                  >
                    {bookingLabel(b)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* What's selected, with a way to clear */}
          {(category || booking) && (
            <div className="flex flex-wrap gap-1.5">
              {category && (
                <button
                  onClick={() => setCategory(null)}
                  className="rounded-full bg-kaam-light px-2.5 py-1 text-[10px] font-bold text-kaam"
                >
                  {catMeta(category).icon} {catMeta(category).label} ✕
                </button>
              )}
              {booking && (
                <button
                  onClick={() => setBooking(undefined)}
                  className="rounded-full bg-info-light px-2.5 py-1 text-[10px] font-bold text-info"
                >
                  📎 {booking.subService} ✕
                </button>
              )}
            </div>
          )}

          {/* Always-on text box — type from the very first message */}
          <div className="flex gap-2">
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
              placeholder={ml ? "നിങ്ങളുടെ പ്രശ്നം ഇവിടെ എഴുതൂ…" : "Type your problem here…"}
              className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-kaam"
            />
            <button
              onClick={submit}
              disabled={!desc.trim()}
              className="rounded-xl bg-kaam px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {ml ? "അയക്കൂ" : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-line p-3">
          <p className="text-center text-[11px] text-dim">
            {ml
              ? "നിങ്ങളുടെ അഭ്യർത്ഥന ഞങ്ങളുടെ ടീമിന്റെ പക്കലാണ്. മറുപടികൾ താഴെയോ ഇമെയിലിലോ കാണാം."
              : "Your request is with our team. Track replies below or in your email."}
          </p>
        </div>
      )}
    </Card>
  );
}
