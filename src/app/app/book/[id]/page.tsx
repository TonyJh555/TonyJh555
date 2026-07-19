"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCustomer } from "@/lib/auth";
import { useAddresses, addressesFor, displayName } from "@/lib/addresses";
import { spend, useWallet } from "@/lib/wallet";
import { getWorker, WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { computeQuote, tenureMultiplier, TENURES } from "@/lib/pricing";
import {
  getCarePlan,
  isPlanEligible,
  isTeachable,
  isPerformer,
  planQuote,
  perMonth,
  effectiveRate,
  type PlanId,
} from "@/lib/plans";
import { PlanPicker } from "@/components/plan-picker";
import { addSubscription, nextRenewal } from "@/lib/subscriptions";
import { addBooking, PAY_METHODS, useBookings } from "@/lib/bookings";
import { presenceOnline, usePresence } from "@/lib/presence";
import { isSurging, surgeMap } from "@/lib/surge";
import { initialDispatch } from "@/lib/dispatch";
import { GRACE_MINUTES, isMetered } from "@/lib/metered";
import { applyCoupon, couponDiscount, COUPONS, type Coupon } from "@/lib/coupons";
import { sendMessage } from "@/lib/chat";
import { formatSchedule, generateStartCode, inr, shortId } from "@/lib/format";
import type { BookingSchedule, StateId, TenureId, Subscription } from "@/lib/types";
import { Avatar, BackLink, Card } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { LocationPicker } from "@/components/location-picker";
import type { LatLng } from "@/lib/geo";

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
  const allBookings = useBookings();
  const presence = usePresence();
  // Live surge: priced from real demand vs online supply in the worker's
  // district right now — not the old static per-worker flag.
  const seedWorker = getWorker(id);
  const liveSurge = seedWorker
    ? isSurging(
        surgeMap(allBookings, WORKERS, { isOnline: (w) => presenceOnline(presence, w) }),
        seedWorker.district,
      )
    : false;
  const worker =
    seedWorker && seedWorker.surge !== liveSurge ? { ...seedWorker, surge: liveSurge } : seedWorker;

  const savedAddresses = addressesFor(useAddresses(), customer?.id);
  const wallet = useWallet();
  const [step, setStep] = useState<Step>("configure");
  const [subService, setSubService] = useState<string>("");
  const [tenureId, setTenureId] = useState<TenureId>("hr");
  // Subscription plan + teaching modes (only surfaced for eligible categories)
  const [planActive, setPlanActive] = useState(false);
  const [planId, setPlanId] = useState<PlanId>("m3");
  const [artMode, setArtMode] = useState<"perform" | "learn">("perform");
  const [format, setFormat] = useState<"offline" | "online">("offline");
  const [address, setAddress] = useState<string>("");
  const [coords, setCoords] = useState<LatLng | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [useKaamCash, setUseKaamCash] = useState(true);
  const stateId: StateId = "KL"; // Kerala-only launch
  const [when, setWhen] = useState<"asap" | "scheduled">("asap");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("10:00");
  const [payMethod, setPayMethod] = useState<string>("gpay");
  const [processing, setProcessing] = useState(false);
  const [startCode, setStartCode] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  // Which flexible options apply to this worker's category
  const canPerform = worker ? isPerformer(worker.categoryId) : false;
  const teachable = worker ? isTeachable(worker.categoryId) : false;
  // "learning" = a lessons booking (a pure teacher, or a performer set to Learn)
  const learning = teachable && (!canPerform || artMode === "learn");
  const online = learning && format === "online";
  const planEligible = worker ? isPlanEligible(worker.categoryId) || learning : false;
  const usePlan = planActive && planEligible;

  const quote = !worker
    ? null
    : usePlan
      ? planQuote({
          rate: worker.rate,
          unit: worker.unit,
          stateId,
          surge: worker.surge,
          plan: getCarePlan(planId),
          online,
        })
      : computeQuote({
          rate: effectiveRate(worker.rate, online),
          tenureId,
          unit: worker.unit,
          stateId,
          surge: worker.surge,
        });

  if (!worker || !quote) notFound();
  const category = getCategory(worker.categoryId);

  // Human-readable label capturing mode, format and any subscription plan —
  // stored on the booking so it shows on receipts, chat and the worker's job.
  const modeLabel = learning ? "Lessons" : canPerform ? "Performance" : "";
  const formatLabel = learning ? (online ? "Online" : "In-person") : "";
  const planLabel = usePlan ? `${getCarePlan(planId).label} plan` : "";
  const serviceLabel = [
    subService || category.subServices[0],
    modeLabel,
    formatLabel,
    planLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const bookedTenureId: TenureId = usePlan ? "mo" : tenureId;

  const couponDisc = coupon ? couponDiscount(coupon, quote.totalUserPays) : 0;
  const afterCoupon = Math.max(0, quote.totalUserPays - couponDisc);
  const kaamCashApplied = useKaamCash ? Math.min(wallet.balance, afterCoupon) : 0;
  const payable = afterCoupon - kaamCashApplied;

  const redeemCoupon = () => {
    const res = applyCoupon(couponCode, quote.totalUserPays);
    setCoupon(res.coupon ?? null);
    setCouponMsg(res.message);
  };

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
        customerId: customer?.id,
        workerId: worker.id,
        workerName: worker.name,
        categoryId: worker.categoryId,
        subService: serviceLabel,
        tenureId: bookedTenureId,
        stateId,
        address: address.trim() || "Kochi",
        coords,
        schedule,
        quote,
        paymentMethod: payMethod,
        status: "requested",
        startCode: code,
        createdAt: new Date().toISOString(),
        // Uber-style dispatch: chosen worker gets the first offer window; if
        // they don't respond it cascades to the next nearest worker.
        dispatch: initialDispatch(),
      });
      if (kaamCashApplied > 0) spend(kaamCashApplied, `Booking · ${category.label}`);
      sendMessage({
        bookingId,
        sender: "system",
        text: `Booking placed 📋 ${serviceLabel} · requested time: ${formatSchedule(schedule)} · payment received. Chat is open — share photos or videos of the problem.`,
      });

      // Care Plan → open a recurring subscription. We record it immediately
      // (local ref) and, in parallel, ask the billing gateway for a real
      // Razorpay subscription id, upgrading the record when it returns.
      if (usePlan) {
        const plan = getCarePlan(planId);
        const now = new Date().toISOString();
        const termAmount = quote.totalUserPays;
        const localRef = `sub_local_${bookingId}`;
        const sub: Subscription = {
          id: shortId(),
          customerId: customer?.id,
          workerId: worker.id,
          workerName: worker.name,
          categoryId: worker.categoryId,
          service: serviceLabel,
          planId: plan.id,
          months: plan.months,
          monthlyAmount: perMonth(quote, plan),
          termAmount,
          monthlyPayout: Math.round(quote.workerPayout / plan.months),
          termPayout: quote.workerPayout,
          online,
          startDate: now,
          renewsOn: nextRenewal(now, plan.months),
          autoRenew: true,
          status: "active",
          paymentRef: localRef,
          history: [{ date: now, amount: termAmount, ref: localRef }],
          createdAt: now,
        };
        const email = customer?.identifier.type === "email" ? customer.identifier.value : undefined;
        const phone = customer?.identifier.type === "phone" ? customer.identifier.value : undefined;
        fetch("/api/razorpay/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            months: plan.months,
            monthlyAmount: sub.monthlyAmount,
            service: serviceLabel,
            customerName: customer?.name,
            customerEmail: email,
            customerPhone: phone,
          }),
        })
          .then((r) => r.json())
          .then((d: { subscriptionId?: string }) =>
            addSubscription(d.subscriptionId ? { ...sub, paymentRef: d.subscriptionId } : sub),
          )
          .catch(() => addSubscription(sub));
      }

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
      {pickerOpen && (
        <LocationPicker
          initial={coords}
          onClose={() => setPickerOpen(false)}
          onConfirm={({ coords: c, label }) => {
            setCoords(c);
            setAddress(label);
            setPickerOpen(false);
          }}
        />
      )}
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
          {canPerform && (
            <>
              <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
                Perform or learn?
              </p>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setArtMode("perform")}
                  className={`rounded-xl border p-3 text-left ${
                    artMode === "perform" ? "border-kaam bg-kaam-light" : "border-line bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${artMode === "perform" ? "text-kaam" : "text-ink"}`}>
                    🎼 Perform
                  </p>
                  <p className="text-[10px] text-dim">Wedding, event or session</p>
                </button>
                <button
                  onClick={() => setArtMode("learn")}
                  className={`rounded-xl border p-3 text-left ${
                    artMode === "learn" ? "border-kaam bg-kaam-light" : "border-line bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${artMode === "learn" ? "text-kaam" : "text-ink"}`}>
                    🎓 Learn
                  </p>
                  <p className="text-[10px] text-dim">Take lessons over time</p>
                </button>
              </div>
            </>
          )}

          {learning && (
            <>
              <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
                How would you like your lessons?
              </p>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat("offline")}
                  className={`rounded-xl border p-3 text-left ${
                    format === "offline" ? "border-kaam bg-kaam-light" : "border-line bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${format === "offline" ? "text-kaam" : "text-ink"}`}>
                    🏠 In-person
                  </p>
                  <p className="text-[10px] text-dim">Teacher comes to you</p>
                </button>
                <button
                  onClick={() => setFormat("online")}
                  className={`relative overflow-hidden rounded-xl border p-3 text-left ${
                    format === "online" ? "border-kaam bg-kaam-light" : "border-line bg-white"
                  }`}
                >
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-good px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                    −15%
                  </span>
                  <p className={`text-sm font-bold ${format === "online" ? "text-kaam" : "text-ink"}`}>
                    💻 Online
                  </p>
                  <p className="text-[10px] text-dim">Video call · learn anywhere</p>
                </button>
              </div>
            </>
          )}

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

          {planEligible && (
            <>
              <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
                {learning ? "Book by the hour, or subscribe" : "How long do you need help?"}
              </p>
              <PlanPicker
                rate={worker.rate}
                unit={worker.unit}
                surge={worker.surge}
                stateId={stateId}
                online={online}
                active={planActive}
                planId={planId}
                onToggle={setPlanActive}
                onSelect={setPlanId}
              />
            </>
          )}

          {!usePlan && (
            <>
              <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">For how long?</p>
              <div className="mb-5 grid grid-cols-3 gap-2">
                {TENURES.map((tenure) => (
                  <button
                    key={tenure.id}
                    onClick={() => setTenureId(tenure.id)}
                    className={`rounded-xl border p-2.5 text-center ${
                      tenureId === tenure.id ? "border-kaam bg-kaam-light" : "border-line bg-white"
                    }`}
                  >
                    <p
                      className={`text-xs font-bold ${tenureId === tenure.id ? "text-kaam" : "text-ink"}`}
                    >
                      {tenure.label}
                    </p>
                    <p className="text-[10px] text-dim">{tenure.duration}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-mid">
                      {inr(
                        effectiveRate(worker.rate, online) *
                          tenureMultiplier(worker.unit, tenure.id) *
                          (worker.surge ? 1.2 : 1),
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

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
          {savedAddresses.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {savedAddresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAddress(a.line);
                    setCoords(a.coords); // carry the saved map pin, if any
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                    address === a.line ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-white text-mid"
                  }`}
                >
                  {a.label === "Home" ? "🏠" : a.label === "Office" ? "🏢" : "📍"} {displayName(a)}
                  {a.coords && <span className="ml-1 text-[10px]">🗺️</span>}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3 text-sm font-bold text-kaam"
          >
            🗺️ Select location on map {coords && <span className="ml-auto text-[11px]">✓ pinned</span>}
          </button>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setCoords(undefined); // typing overrides the pin
            }}
            placeholder="…or type your area, e.g. Panampilly Nagar, Kochi"
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
              {serviceLabel}
              {!usePlan && ` · ${TENURES.find((t) => t.id === tenureId)?.label}`}
            </p>
            {usePlan && (
              <p className="mb-1 inline-block rounded-full bg-good-light px-2 py-0.5 text-[10px] font-extrabold text-good">
                ♻️ {getCarePlan(planId).label} subscription · billed once
              </p>
            )}
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
          {isMetered({ tenureId: bookedTenureId }, worker) && (
            <p className="mb-4 rounded-xl bg-good-light p-3 text-[11px] leading-relaxed text-good">
              ⏱ Fair billing: this price covers the first hour (with a {GRACE_MINUTES}-min
              grace). Runs longer? You pay only for the minutes actually worked — e.g. 1h 08m
              bills 68 minutes, never a rounded-up second hour.
            </p>
          )}
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
          {/* Promo code */}
          <div className="mb-4 rounded-2xl border border-line bg-white p-3.5">
            <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">🎟️ Promo code</p>
            {coupon ? (
              <div className="flex items-center justify-between rounded-xl bg-good-light px-3 py-2.5">
                <span className="text-sm font-bold text-good">
                  {coupon.code} applied · −{inr(couponDisc)}
                </span>
                <button
                  onClick={() => {
                    setCoupon(null);
                    setCouponCode("");
                    setCouponMsg(null);
                  }}
                  className="text-xs font-bold text-mid"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surf px-3 py-2.5 text-sm font-bold tracking-wide uppercase outline-none focus:border-kaam"
                  />
                  <button
                    onClick={redeemCoupon}
                    disabled={!couponCode.trim()}
                    className="rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
                {couponMsg && <p className="mt-1.5 text-[11px] font-semibold text-kaam">{couponMsg}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COUPONS.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCouponCode(c.code);
                        const res = applyCoupon(c.code, quote.totalUserPays);
                        setCoupon(res.coupon ?? null);
                        setCouponMsg(res.message);
                      }}
                      className="rounded-lg border border-dashed border-kaam-mid bg-kaam-light px-2 py-1 text-[10px] font-bold text-kaam"
                      title={c.note}
                    >
                      {c.code} · {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {wallet.balance > 0 && (
            <button
              onClick={() => setUseKaamCash(!useKaamCash)}
              className={`mb-4 flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left ${
                useKaamCash ? "border-good bg-good-light" : "border-line bg-white"
              }`}
            >
              <span className="text-2xl">💰</span>
              <span className="flex-1">
                <span className="block text-sm font-bold">Use KAAM Cash</span>
                <span className="block text-[11px] text-mid">
                  Balance {inr(wallet.balance)} · applies {inr(kaamCashApplied)} to this booking
                </span>
              </span>
              <span
                className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${
                  useKaamCash ? "bg-good" : "bg-line"
                }`}
              >
                <span
                  className={`absolute h-5 w-5 rounded-full bg-white transition-all ${
                    useKaamCash ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          )}
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
          {couponDisc > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-kaam-light px-3 py-2 text-xs font-bold text-kaam">
              <span>🎟️ {coupon?.code} discount</span>
              <span>− {inr(couponDisc)}</span>
            </div>
          )}
          {kaamCashApplied > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-good-light px-3 py-2 text-xs font-bold text-good">
              <span>💰 KAAM Cash applied</span>
              <span>− {inr(kaamCashApplied)}</span>
            </div>
          )}
          <button
            onClick={confirmAndPay}
            disabled={processing}
            className="w-full rounded-xl bg-good py-3.5 text-sm font-bold text-white shadow-[0_6px_24px_rgba(21,128,61,0.22)] disabled:opacity-50"
          >
            {processing
              ? "Processing…"
              : payable > 0
                ? `Pay ${inr(payable)} Securely`
                : "Confirm Booking (fully covered) 🎉"}
          </button>
          <p className="mt-3 text-center text-[10px] text-dim">
            🔒 Payments processed by Razorpay · auto-split 85% to worker
          </p>
        </div>
      )}
    </main>
  );
}
