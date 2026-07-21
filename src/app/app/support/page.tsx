"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCustomer } from "@/lib/auth";
import { ticketsFor, useTickets, type TicketCategory } from "@/lib/support";
import { SupportForm } from "@/components/support-form";
import { TicketCard } from "@/components/ticket-card";
import { BackLink, Card } from "@/components/ui";

function SupportContent() {
  const params = useSearchParams();
  const customer = useCustomer();
  const all = useTickets();
  const mine = ticketsFor(all, customer?.id);
  const bookingId = params.get("booking") ?? undefined;
  const defaultCategory = (params.get("category") as TicketCategory | null) ?? undefined;
  const [showForm, setShowForm] = useState(mine.length === 0 || Boolean(bookingId));

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">Help &amp; Support</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="text-sm font-bold">We&apos;re here to help 💚</p>
        <p className="mt-1 text-[11px] text-white/80">
          Refunds, payment or fund-transfer issues, a bad experience, or anything else — raise a
          request and our team will sort it out.
        </p>
      </Card>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 w-full rounded-xl bg-kaam py-3 text-sm font-bold text-white shadow-kaam"
        >
          ＋ New request
        </button>
      )}

      {showForm && (
        <div className="mb-5">
          <SupportForm
            raisedBy="customer"
            raiserId={customer?.id}
            raiserName={customer?.name ?? "Customer"}
            raiserEmail={customer?.identifier.type === "email" ? customer.identifier.value : undefined}
            bookingId={bookingId}
            defaultCategory={defaultCategory}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {mine.length > 0 && (
        <>
          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Your requests</p>
          <div className="flex flex-col gap-3">
            {mine.map((t) => (
              <TicketCard key={t.id} ticket={t} as="customer" />
            ))}
          </div>
        </>
      )}

      {mine.length === 0 && !showForm && (
        <p className="py-10 text-center text-sm text-dim">No requests yet.</p>
      )}

      <p className="mt-6 text-center text-[11px] text-dim">
        Prefer reading first? Visit the{" "}
        <Link href="/app/help" className="font-bold text-kaam">
          Help Center
        </Link>
        .
      </p>
    </main>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <SupportContent />
    </Suspense>
  );
}
