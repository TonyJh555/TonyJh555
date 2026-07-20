"use client";

import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { PRICE_MODEL_LIST } from "@/lib/price-model";

/**
 * "How you pay on KAAM" — the fairness story in one place. The dashboard's
 * pricing promise, spelled out: base hour covers time & travel, you pay only
 * for the minutes actually worked, and payment timing follows the nature of
 * the work. Everything here mirrors the live payment-policy + metered
 * engines, so what customers read is exactly what checkout does.
 */
export default function PricingPage() {
  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">How you pay</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="font-display text-base font-extrabold">Fair by design ⚖️</p>
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          You never pay for a minute not worked, and you never pay for work before the worker
          has committed to it. Every price is all-inclusive — GST shown upfront, nothing extra
          to hand the worker directly.
        </p>
      </Card>

      {/* The three payment models */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        Payment follows the work
      </h2>
      <div className="mb-5 flex flex-col gap-3">
        {PRICE_MODEL_LIST.map((m) => (
          <Card key={m.nature}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-extrabold">{m.title}</p>
                  <span className="shrink-0 rounded-full bg-kaam-light px-2 py-0.5 text-[10px] font-bold text-kaam">
                    {m.tag}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex items-start gap-2 text-[11px]">
                    <span className="mt-px shrink-0 rounded bg-good-light px-1.5 py-0.5 font-bold text-good">
                      At booking
                    </span>
                    <span className="leading-relaxed text-mid">{m.payNow}</span>
                  </div>
                  {m.payAfter ? (
                    <div className="flex items-start gap-2 text-[11px]">
                      <span className="mt-px shrink-0 rounded bg-info-light px-1.5 py-0.5 font-bold text-info">
                        After the job
                      </span>
                      <span className="leading-relaxed text-mid">{m.payAfter}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-[11px]">
                      <span className="mt-px shrink-0 rounded bg-surf px-1.5 py-0.5 font-bold text-dim">
                        After the job
                      </span>
                      <span className="leading-relaxed text-dim">Nothing more to pay.</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 rounded-lg bg-surf px-2.5 py-1.5 text-[10px] leading-relaxed text-mid">
                  {m.note}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* The metered example, made concrete */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
        Example — a ₹600/hr electrician
      </h2>
      <Card className="mb-5">
        <div className="flex flex-col gap-2 text-xs">
          <Row label="You pay to confirm (base hour)" value="₹600 + GST" tone="now" />
          <Row label="Worker fixes it in 1h 08m" value="8 extra minutes" tone="plain" />
          <Row label="Extra billed after (8 × ₹10/min)" value="₹80 + GST" tone="after" />
          <div className="mt-1 border-t border-line pt-2">
            <Row label="Total for 68 minutes" value="₹680 + GST" tone="total" />
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-good-light px-2.5 py-2 text-[11px] leading-relaxed text-good">
          ✅ A 5-minute grace means a 1h 03m job still bills as one hour — no nickel-and-diming.
          Quick 40-minute fix? The base hour is the minimum, so the worker&apos;s time & travel are
          always covered.
        </p>
      </Card>

      {/* Two-way fairness */}
      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Fair to both sides</h2>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-lg">🙋 You</p>
          <p className="mt-1 text-[11px] leading-relaxed text-mid">
            Never pay for a phantom hour. No hidden charges. Refunds return to KAAM Cash if a job
            can&apos;t happen.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-lg">🛠️ The worker</p>
          <p className="mt-1 text-[11px] leading-relaxed text-mid">
            Time & travel always covered by the base hour, and paid for every extra minute they
            work. No unpaid call-outs.
          </p>
        </div>
      </div>

      <Link
        href="/app/search"
        className="flex items-center justify-center gap-2 rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
      >
        🔍 Find a worker
      </Link>
    </main>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "now" | "after" | "plain" | "total";
}) {
  const valueClass =
    tone === "total"
      ? "font-extrabold text-ink"
      : tone === "now"
        ? "font-bold text-good"
        : tone === "after"
          ? "font-bold text-info"
          : "font-semibold text-mid";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={tone === "total" ? "font-bold text-ink" : "text-mid"}>{label}</span>
      <span className={`shrink-0 tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
