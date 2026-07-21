"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { useCustomer } from "@/lib/auth";
import { useBookings } from "@/lib/bookings";
import { inr } from "@/lib/format";
import {
  cancelPlus,
  getPlusPlan,
  isMember,
  joinPlus,
  memberSavings,
  PLUS_PERKS,
  PLUS_PLANS,
  useMembership,
  type PlusPlan,
} from "@/lib/membership";

/**
 * KAAM Plus — the membership landing / management page. Non-members see the
 * pitch, perks, plans, and their potential savings; members see their status,
 * what they've saved, and manage/cancel.
 */
export default function PlusPage() {
  const customer = useCustomer();
  const bookings = useBookings();
  const membership = useMembership(customer?.id);
  const member = isMember(membership);
  const saved = memberSavings(bookings, customer?.id);
  const [planId, setPlanId] = useState<PlusPlan["id"]>("yearly");
  const [done, setDone] = useState(false);

  const plan = getPlusPlan(planId);

  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">KAAM Plus</h1>
      </header>

      {/* Hero */}
      <Card className="mb-4 bg-[linear-gradient(135deg,#7c3aed,#4c1d95)] text-white">
        <p className="font-display text-2xl font-extrabold">
          KAAM <span className="text-amber-300">Plus</span> ✦
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          {member
            ? "You're a Plus member — every booking is cheaper, fee-free, and priority-matched."
            : "One membership. Every booking cheaper, fee-free, and priority-matched. It pays for itself in a couple of jobs."}
        </p>
        {member && (
          <div className="mt-3 rounded-xl bg-white/15 p-3">
            <p className="text-[10px] font-bold tracking-wide text-white/70 uppercase">Saved with Plus</p>
            <p className="font-display text-xl font-extrabold">{inr(saved)}</p>
            <p className="text-[10px] text-white/70">
              {getPlusPlan(membership.planId ?? "yearly").label} · renews{" "}
              {membership.renewsOn
                ? new Date(membership.renewsOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—"}
            </p>
          </div>
        )}
      </Card>

      {/* Perks */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Every Plus perk</h2>
      <div className="mb-5 flex flex-col gap-2">
        {PLUS_PERKS.map((p) => (
          <div key={p.title} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
            <span className="text-lg">{p.icon}</span>
            <div>
              <p className="text-sm font-bold">{p.title}</p>
              <p className="text-[11px] leading-relaxed text-mid">{p.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {done && (
        <p className="mb-4 rounded-xl bg-good-light px-3 py-2.5 text-xs font-bold text-good">
          🎉 Welcome to KAAM Plus! Your 10% member discount now applies automatically at checkout.
        </p>
      )}

      {member ? (
        <button
          onClick={() => {
            cancelPlus(customer?.id);
            setDone(false);
          }}
          className="w-full rounded-xl border border-line bg-white py-3 text-sm font-bold text-mid"
        >
          Cancel membership
        </button>
      ) : (
        <>
          <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Choose your plan</h2>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {PLUS_PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={`rounded-2xl border p-3 text-left ${
                  planId === p.id ? "border-kaam bg-kaam-light" : "border-line bg-white"
                }`}
              >
                <p className="text-sm font-extrabold">{p.label}</p>
                <p className="font-display text-lg font-extrabold text-kaam">{inr(p.price)}</p>
                <p className="text-[10px] text-mid">{p.note}</p>
              </button>
            ))}
          </div>
          {saved > 0 && (
            <p className="mb-3 rounded-xl bg-surf px-3 py-2 text-[11px] text-mid">
              💡 On your past jobs, Plus would have saved you{" "}
              <span className="font-bold text-good">{inr(saved)}</span>.
            </p>
          )}
          <button
            onClick={() => {
              joinPlus(customer?.id, planId);
              setDone(true);
            }}
            className="w-full rounded-xl bg-[linear-gradient(135deg,#7c3aed,#4c1d95)] py-3.5 text-sm font-bold text-white shadow-pop"
          >
            ✦ Join KAAM Plus · {inr(plan.price)}
          </button>
          <p className="mt-2 text-center text-[10px] text-dim">
            Cancel anytime · auto-applied savings · no hidden charges
          </p>
        </>
      )}

      <Link href="/app/search" className="mt-5 block text-center text-xs font-bold text-kaam">
        Start booking with Plus →
      </Link>
    </main>
  );
}
