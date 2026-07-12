"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getWorker } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { computeQuote, STATES, TENURES } from "@/lib/pricing";
import { addBooking, PAY_METHODS } from "@/lib/bookings";
import { generateStartCode, inr, shortId } from "@/lib/format";
import type { StateId, TenureId } from "@/lib/types";
import { Avatar, BackLink, Card } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";

type Step = "configure" | "review" | "pay" | "done";

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const worker = getWorker(id);

  const [step, setStep] = useState<Step>("configure");
  const [subService, setSubService] = useState<string>("");
  const [tenureId, setTenureId] = useState<TenureId>("hr");
  const [stateId, setStateId] = useState<StateId>("DL");
  const [payMethod, setPayMethod] = useState<string>("gpay");
  const [processing, setProcessing] = useState(false);
  const [startCode, setStartCode] = useState<string>("");

  const quote = useMemo(
    () =>
      worker
        ? computeQuote({ rate: worker.rate, tenureId, stateId, surge: worker.surge })
        : null,
    [worker, tenureId, stateId],
  );

  if (!worker || !quote) notFound();
  const category = getCategory(worker.categoryId);

  const confirmAndPay = () => {
    setProcessing(true);
    // Simulates the Razorpay round-trip; in production this creates a
    // payment link and waits for the webhook before confirming.
    setTimeout(() => {
      const code = generateStartCode();
      addBooking({
        id: shortId(),
        workerId: worker.id,
        workerName: worker.name,
        categoryId: worker.categoryId,
        subService: subService || category.subServices[0],
        tenureId,
        stateId,
        quote,
        paymentMethod: payMethod,
        status: "requested",
        startCode: code,
        createdAt: new Date().toISOString(),
      });
      setStartCode(code);
      setProcessing(false);
      setStep("done");
    }, 900);
  };

  if (step === "done") {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <div className="fade-up">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-good-light text-4xl">
            ✅
          </div>
          <h1 className="font-display text-xl font-extrabold">Booking Confirmed!</h1>
          <p className="mt-1 text-sm text-mid">
            {worker.name} is on the way · ETA ~{worker.etaMinutes} min
          </p>
          <Card className="mt-5">
            <p className="text-xs font-semibold text-mid">
              Share this code with your worker to start the job
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-[0.4em] text-kaam">
              {startCode}
            </p>
          </Card>
          <Link
            href="/app/bookings"
            className="mt-6 inline-block rounded-xl bg-kaam px-8 py-3.5 text-sm font-bold text-white shadow-kaam"
          >
            Track Booking →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href={`/app/worker/${worker.id}`} />
        <div>
          <h1 className="font-display text-lg font-bold">Book {worker.name.split(" ")[0]}</h1>
          <p className="text-[11px] text-dim">
            {["configure", "review", "pay"].indexOf(step) + 1} of 3 ·{" "}
            {step === "configure" ? "Choose service" : step === "review" ? "Review price" : "Payment"}
          </p>
        </div>
      </header>

      <Card className="mb-4 flex items-center gap-3">
        <Avatar initials={worker.initials} size={40} online={worker.online} />
        <div>
          <p className="text-sm font-bold">{worker.name}</p>
          <p className="text-xs text-mid">
            {category.icon} {category.label} · {inr(worker.rate)}/{worker.unit}
          </p>
        </div>
      </Card>

      {step === "configure" && (
        <div className="fade-up">
          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
            What do you need?
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            {category.subServices.map((sub) => (
              <button
                key={sub}
                onClick={() => setSubService(sub)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold ${
                  (subService || category.subServices[0]) === sub
                    ? "border-kaam bg-kaam-light text-kaam"
                    : "border-line bg-white text-mid"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">For how long?</p>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {TENURES.map((tenure) => (
              <button
                key={tenure.id}
                onClick={() => setTenureId(tenure.id)}
                className={`rounded-xl border p-2.5 text-center ${
                  tenureId === tenure.id
                    ? "border-kaam bg-kaam-light"
                    : "border-line bg-white"
                }`}
              >
                <p className={`text-xs font-bold ${tenureId === tenure.id ? "text-kaam" : "text-ink"}`}>
                  {tenure.label}
                </p>
                <p className="text-[10px] text-dim">{tenure.duration}</p>
                <p className="mt-0.5 text-[11px] font-bold text-mid">
                  {inr(worker.rate * tenure.multiplier * (worker.surge ? 1.2 : 1))}
                </p>
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
            Your state (for welfare cess)
          </p>
          <select
            value={stateId}
            onChange={(e) => setStateId(e.target.value as StateId)}
            className="mb-6 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold shadow-card outline-none"
          >
            {STATES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.cessPercent > 0 ? ` (+${s.cessPercent}% worker welfare cess)` : ""}
              </option>
            ))}
          </select>

          <button
            onClick={() => setStep("review")}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
          >
            Review Price → {inr(quote.totalUserPays)}
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="fade-up">
          <Card className="mb-4">
            <p className="mb-1 text-xs font-bold tracking-wide text-dim uppercase">Tax invoice preview</p>
            <p className="mb-3 text-sm font-bold">
              {subService || category.subServices[0]} · {TENURES.find((t) => t.id === tenureId)?.label}
            </p>
            <QuoteBreakdown quote={quote} />
          </Card>
          <p className="mb-4 rounded-xl bg-info-light p-3 text-[11px] leading-relaxed text-info">
            🛡️ Fair & transparent: GST is remitted to the government as TCS and 1% TDS
            (Section 194-O) is deposited on the worker&apos;s behalf. Your worker takes home{" "}
            <strong>{inr(quote.workerPayout)}</strong> — no middlemen.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("configure")}
              className="flex-1 rounded-xl border border-line bg-surf py-3.5 text-sm font-bold text-mid"
            >
              ← Edit
            </button>
            <button
              onClick={() => setStep("pay")}
              className="flex-[2] rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {step === "pay" && (
        <div className="fade-up">
          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Payment method</p>
          <div className="mb-5 flex flex-col gap-2">
            {PAY_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setPayMethod(method.id)}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left ${
                  payMethod === method.id ? "border-kaam bg-kaam-light" : "border-line bg-white"
                }`}
              >
                <span className="text-2xl">{method.icon}</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{method.label}</span>
                  <span className="block text-[11px] text-mid">{method.sub}</span>
                </span>
                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    payMethod === method.id ? "border-kaam bg-kaam" : "border-line"
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            onClick={confirmAndPay}
            disabled={processing}
            className="w-full rounded-xl bg-good py-3.5 text-sm font-bold text-white shadow-[0_6px_24px_rgba(21,128,61,0.22)] disabled:opacity-50"
          >
            {processing ? "Processing…" : `Pay ${inr(quote.totalUserPays)} Securely`}
          </button>
          <p className="mt-3 text-center text-[10px] text-dim">
            🔒 Payments processed by Razorpay · auto-split 85% to worker
          </p>
        </div>
      )}
    </main>
  );
}
