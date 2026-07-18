"use client";

import { useState } from "react";
import { ticketsFor, useTickets } from "@/lib/support";
import { SupportForm } from "@/components/support-form";
import { TicketCard } from "@/components/ticket-card";
import { Card } from "@/components/ui";
import type { Worker } from "@/lib/types";

/** Worker support: raise payment/fund-transfer, safety or other issues + track them. */
export function WorkerSupport({ worker }: { worker: Worker }) {
  const mine = ticketsFor(useTickets(), worker.id);
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-bold">🎧 Support & disputes</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-kaam px-3 py-1.5 text-xs font-bold text-white"
        >
          {showForm ? "Close" : "＋ New request"}
        </button>
      </div>

      {showForm && (
        <div className="mb-3">
          <SupportForm
            raisedBy="worker"
            raiserId={worker.id}
            raiserName={worker.name}
            defaultCategory="payment"
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {mine.length === 0 ? (
        <Card>
          <p className="text-xs text-mid">
            Payment or fund-transfer problem? A difficult customer? Raise a request and KAAM support
            will help.
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
