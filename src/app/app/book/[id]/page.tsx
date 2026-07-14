"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCustomer } from "@/lib/auth";
import { getWorker } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { computeQuote, TENURES } from "@/lib/pricing";
import { addBooking, PAY_METHODS } from "@/lib/bookings";
import { sendMessage } from "@/lib/chat";
import { formatSchedule, generateStartCode, inr, shortId } from "@/lib/format";
import type { BookingSchedule, StateId, TenureId } from "@/lib/types";
import { Avatar, BackLink, Card } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function slotLabel(time: string): string {
  const [hour] = time.split(":").map(Number);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? "AM" : "PM"}`;
}

type Step = "configure" | "review" | "pay" | "done";

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const customer = useCustomer();
  const worker = getWorker(id);

  const [step, setStep] = useState<Step>("configure");
  const [subService, setSubService] = useState<string>("");
  const [tenureId, setTenureId] = useState<TenureId>("hr");
  const [address, setAddress] = useState<string>("");
  const stateId: StateId = "KL"; // Kerala-only launch
  const [when, setWhen] = useState<"asap" | "scheduled">("asap");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("10:00");
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
      const bookingId = shortId();
      const schedule: BookingSchedule =
        when === "asap"
          ? { when: "asap" }
          : { when: "scheduled", date: scheduleDate, time: scheduleTime };
      addBooking({
        id: bookingId,
        workerId: worker.id,
        workerName: worker.name,
        categoryId: worker.categoryId,
        subService: subService || category.subServices[0],
        tenureId,
        stateId,
        address: address.trim() || "Kochi",
        schedule,
        quote,
        paymentMethod: payMethod,
        status: "requested",
        startCode: code,
        createdAt: new Date().toISOString(),
      });
      sendMessage({
        bookingId,
        sender: "system",
        text: `Booking placed 📋 ${subService || category.subServices[0]} · requested time: ${formatSchedule(schedule)} · payment received. Chat is open — share photos or videos of the problem.`,
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
            {when === "asap"
              ? `${worker.name} is on the way · ETA ~${worker.etaMinutes} min`
              : `${worker.name} will confirm your requested time shortly`}
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
            When do you need the worker?
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setWhen("asap")}
              className={`rounded-xl border p-3 text-left ${
                when === "asap" ? "border-kaam bg-kaam-light" : "border-line bg-white"
              }`}
            >
              <p className={`text-sm font-bold ${when === "asap" ? "text-kaam" : "text-ink"}`}>
                ⚡ As soon as possible
              </p>
              <p className="text-[10px] text-dim">Worker starts in ~{worker.etaMinutes} min</p>
            </button>
            <button
              onClick={() => setWhen("scheduled")}
              className={`rounded-xl border p-3 text-left ${
                when === "scheduled" ? "border-kaam bg-kaam-light" : "border-line bg-white"
              }`}
            >
              <p className={`text-sm font-bold ${when === "scheduled" ? "text-kaam" : "text-ink"}`}>
                📅 Pick date & time
              </p>
              <p className="text-[10px] text-dim">Worker confirms your slot</p>
            </button>
          </div>
          {when === "scheduled" && (
            <div className="fade-up mb-3 rounded-2xl border border-line bg-white p-3">
              <input
                type="date"
                value={scheduleDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="mb-3 w-full rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none"
              />
              <div className="grid grid-cols-5 gap-1.5">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setScheduleTime(slot)}
                    className={`rounded-lg border py-1.5 text-[11px] font-bold ${
                      scheduleTime === slot
                        ? "border-kaam bg-kaam text-white"
                        : "border-line bg-surf text-mid"
                    }`}
                  >
                    {slotLabel(slot)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-dim">
                ℹ️ The worker will confirm this time — if they can&apos;t make it, you&apos;ll be
                asked to pick another slot.
              </p>
            </div>
          )}

          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
            Your location (so the worker knows the trip)
          </p>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Panampilly Nagar, Kochi"
            className="mb-6 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-card outline-none focus:border-kaam"
          />

          <button
            onClick={() => setStep("review")}
            disabled={when === "scheduled" && !scheduleDate}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {when === "scheduled" && !scheduleDate
              ? "Pick a date to continue"
              : `Review Price → ${inr(quote.totalUserPays)}`}
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="fade-up">
          <Card className="mb-4">
            <p className="mb-1 text-xs font-bold tracking-wide text-dim uppercase">Booking summary</p>
            <p className="mb-1 text-sm font-bold">
              {subService || category.subServices[0]} · {TENURES.find((t) => t.id === tenureId)?.label}
            </p>
            <p className="mb-3 text-xs font-semibold text-mid">
              🕐 {formatSchedule(
                when === "asap"
                  ? { when: "asap" }
                  : { when: "scheduled", date: scheduleDate, time: scheduleTime },
              )}
            </p>
            <QuoteBreakdown quote={quote} />
          </Card>
          <p className="mb-4 rounded-xl bg-info-light p-3 text-[11px] leading-relaxed text-info">
            🛡️ All-inclusive price — GST shown upfront, no hidden charges, and nothing
            extra to pay the worker directly.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("configure")}
              className="flex-1 rounded-xl border border-line bg-surf py-3.5 text-sm font-bold text-mid"
            >
              ← Edit
            </button>
            <button
              onClick={() => {
                if (!customer) {
                  router.push(`/app/login?next=/app/book/${worker.id}`);
                  return;
                }
                setStep("pay");
              }}
              className="flex-[2] rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
            >
              {customer ? "Continue to Payment" : "Login to Continue"}
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
