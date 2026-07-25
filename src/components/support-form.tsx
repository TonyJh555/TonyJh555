"use client";

import { useState } from "react";
import { raiseTicket, TICKET_CATEGORIES, type TicketCategory, type TicketParty } from "@/lib/support";
import { Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/** Raise a support ticket. Shared by the customer app and the worker portal. */
export function SupportForm({
  raisedBy,
  raiserId,
  raiserName,
  raiserEmail,
  bookingId,
  defaultCategory,
  onDone,
}: {
  raisedBy: TicketParty;
  raiserId?: string;
  raiserName: string;
  raiserEmail?: string;
  bookingId?: string;
  defaultCategory?: TicketCategory;
  onDone?: () => void;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [category, setCategory] = useState<TicketCategory>(defaultCategory ?? "refund");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!subject.trim() || !message.trim()) return;
    raiseTicket({ raisedBy, raiserId, raiserName, raiserEmail, bookingId, category, subject: subject.trim(), message: message.trim() });
    setDone(true);
    onDone?.();
  };

  if (done) {
    return (
      <Card className="border-good-mid bg-good-light text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-1 text-sm font-bold text-good">{ml ? "അഭ്യർത്ഥന സമർപ്പിച്ചു" : "Request submitted"}</p>
        <p className="mt-1 text-xs text-mid">
          {ml
            ? "ഞങ്ങളുടെ സപ്പോർട്ട് ടീം ഉടൻ മറുപടി നൽകും. അപ്ഡേറ്റുകൾ സഹായം & പിന്തുണയിൽ കാണാം."
            : "Our support team will reply here soon. You'll see updates in Help & Support."}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        {ml ? "എന്താണ് പ്രശ്നം?" : "What's the issue?"}
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TICKET_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
              category === c.id ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={ml ? "വിഷയം — ഒറ്റവരി സംഗ്രഹം" : "Subject — a short summary"}
        className="mb-2 w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder={ml ? "എന്താണ് സംഭവിച്ചതെന്ന് പറയൂ — തുകയും തീയതിയും ഉൾപ്പെടെ…" : "Tell us what happened, including any amounts or dates…"}
        className="mb-2 w-full resize-none rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
      />
      {bookingId && <p className="mb-2 text-[10px] text-dim">{ml ? "ബുക്കിംഗുമായി ബന്ധിപ്പിച്ചു" : "Linked to booking"} #{bookingId}</p>}
      <button
        onClick={submit}
        disabled={!subject.trim() || !message.trim()}
        className="w-full rounded-xl bg-kaam py-3 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
      >
        {ml ? "അഭ്യർത്ഥന നൽകൂ" : "Submit request"}
      </button>
    </Card>
  );
}
