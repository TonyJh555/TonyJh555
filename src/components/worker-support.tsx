"use client";

import { useState } from "react";
import { ticketsFor, useTickets } from "@/lib/support";
import { useBookings } from "@/lib/bookings";
import { SupportForm } from "@/components/support-form";
import { SupportChatbot } from "@/components/support-chatbot";
import { TicketCard } from "@/components/ticket-card";
import { Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";
import type { Worker } from "@/lib/types";

/** Worker support: raise payment/fund-transfer, safety or other issues + track them. */
export function WorkerSupport({ worker }: { worker: Worker }) {
  const mine = ticketsFor(useTickets(), worker.id);
  const myJobs = useBookings().filter((b) => b.workerId === worker.id);
  const [mode, setMode] = useState<"idle" | "chat" | "form">("idle");
  const { lang } = useLanguage();
  const ml = lang === "ml";

  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-bold">
          🎧 {ml ? "സഹായവും പരാതികളും" : "Support & disputes"}
        </h2>
        {mode !== "idle" && (
          <button
            onClick={() => setMode("idle")}
            className="rounded-lg border border-line bg-surf px-3 py-1.5 text-xs font-bold text-mid"
          >
            {ml ? "അടയ്ക്കൂ" : "Close"}
          </button>
        )}
      </div>

      {mode === "idle" && (
        <button
          onClick={() => setMode("chat")}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-kaam py-2.5 text-sm font-bold text-white"
        >
          🤖 {ml ? "KAAM Assist-നോട് ചോദിക്കൂ" : "Chat with KAAM Assist"}
        </button>
      )}

      {mode === "chat" && (
        <div className="mb-3">
          <SupportChatbot
            raisedBy="worker"
            raiserId={worker.id}
            raiserName={worker.name}
            bookings={myJobs}
            defaultCategory="payment"
            onSwitchToForm={() => setMode("form")}
          />
        </div>
      )}

      {mode === "form" && (
        <div className="mb-3">
          <SupportForm
            raisedBy="worker"
            raiserId={worker.id}
            raiserName={worker.name}
            defaultCategory="payment"
            onDone={() => setMode("idle")}
          />
        </div>
      )}

      {mine.length === 0 ? (
        <Card>
          <p className="text-xs text-mid">
            {ml
              ? "പണം കിട്ടിയില്ലേ? ബുദ്ധിമുട്ടുള്ള ഒരാളെ കിട്ടിയോ? ഇവിടെ പറഞ്ഞാൽ KAAM സഹായിക്കും."
              : "Payment or fund-transfer problem? A difficult customer? Raise a request and KAAM support will help."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {mine.map((t) => (
            <TicketCard key={t.id} ticket={t} as="worker" />
          ))}
        </div>
      )}
    </section>
  );
}
