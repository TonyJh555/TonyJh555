"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCustomer } from "@/lib/auth";
import { useAddresses, addressesFor, displayName } from "@/lib/addresses";
import { useWallet } from "@/lib/wallet";
import { getWorker, WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { computeQuote, tenureMultiplier, tenuresForGroup, TENURES } from "@/lib/pricing";
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
import { readPaymentPref, setPaymentPref } from "@/lib/payment-pref";
import { presenceOnline, usePresence } from "@/lib/presence";
import { isSurging, surgeMap } from "@/lib/surge";
import { initialDispatch } from "@/lib/dispatch";
import { GRACE_MINUTES, isMetered } from "@/lib/metered";
import { policyFor, splitPayment } from "@/lib/payment-policy";
import { isMember, memberDiscount, useMembership } from "@/lib/membership";
import { applyCoupon, couponDiscount, COUPONS, type Coupon } from "@/lib/coupons";
import { sendMessage } from "@/lib/chat";
import { formatSchedule, generateStartCode, inr, shortId } from "@/lib/format";
import type { BookingSchedule, StateId, TenureId, Subscription } from "@/lib/types";
import { Avatar, BackLink, Card } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { LocationPicker } from "@/components/location-picker";
import { useLanguage } from "@/components/language-provider";
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
  const { lang } = useLanguage();
  const ml = lang === "ml";
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
  const member = isMember(useMembership(customer?.id));
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
  const [payMethod, setPayMethod] = useState<string>(() => {
    const saved = readPaymentPref();
    return saved && PAY_METHODS.some((m) => m.id === saved) ? saved : "gpay";
  });
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
  // Repair & maintenance is hourly + metered by the clock (no day/month packages).
  const allowedTenures = tenuresForGroup(category.group);
  const hourlyOnly = allowedTenures.length === 1 && allowedTenures[0].id === "hr";
  const baseHourPrice =
    effectiveRate(worker.rate, online) * tenureMultiplier(worker.unit, "hr") * (worker.surge ? 1.2 : 1);

  // Booking requires an account — like every major services app (Swiggy,
  // Zomato, Urban Company), sign-in is mandatory at checkout so the booking,
  // chat, payments, tracking and refunds stay tied to the customer. Guest
  // bookings would be orphaned the moment the app is closed.
  if (!customer) {
    return (
      <main className="flex min-h-screen flex-col px-4 pt-5">
        <header className="mb-4 flex items-center gap-3">
          <BackLink href={`/app/worker/${worker.id}`} />
          <h1 className="font-display text-lg font-bold">{ml ? "ബുക്ക് ചെയ്യാൻ സൈൻ ഇൻ ചെയ്യൂ" : "Sign in to book"}</h1>
        </header>
        <Card className="mt-6 text-center">
          <Avatar initials={worker.initials} size={64} />
          <p className="mt-3 font-display text-lg font-extrabold">{ml ? `${worker.name.split(" ")[0]}-നെ ബുക്ക് ചെയ്യൂ` : `Book ${worker.name.split(" ")[0]}`}</p>
          <p className="mt-1 text-sm text-mid">
            {category.icon} {category.label} · {worker.city}
          </p>
          <p className="mt-4 rounded-xl bg-surf p-3 text-xs leading-relaxed text-mid">
            {ml
              ? "🔒 തുടരാൻ സൈൻ ഇൻ ചെയ്യൂ. നിങ്ങളുടെ ബുക്കിംഗ്, ചാറ്റ്, പേയ്മെന്റ്, തത്സമയ ട്രാക്കിംഗ് എന്നിവ അക്കൗണ്ടിൽ സുരക്ഷിതം — ആപ്പ് അടച്ചാലും ജോലി നഷ്ടപ്പെടില്ല."
              : "🔒 Please sign in to continue. It keeps your booking, chat, payments and live tracking safe in your account — so you never lose a job, even if you close the app."}
          </p>
          <Link
            href={`/app/login?next=/app/book/${worker.id}`}
            className="mt-4 block w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
          >
            {ml ? "സൈൻ ഇൻ / സൈൻ അപ്പ് →" : "Sign in / Sign up to book →"}
          </Link>
          <p className="mt-3 text-[11px] text-dim">
            {ml ? "കാമിൽ പുതിയതാണോ? 30 സെക്കൻഡ് മതി — മൊബൈൽ നമ്പർ മാത്രം." : "New to KAAM? It takes 30 seconds — just your mobile number."}
          </p>
        </Card>
      </main>
    );
  }

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

  // KAAM Plus members get 10% off every booking, auto-applied, stacked with coupons.
  const memberDisc = memberDiscount(quote.totalUserPays, member);
  const afterMember = Math.max(0, quote.totalUserPays - memberDisc);
  const couponDisc = coupon ? couponDiscount(coupon, afterMember) : 0;
  const afterCoupon = Math.max(0, afterMember - couponDisc);
  const kaamCashApplied = useKaamCash ? Math.min(wallet.balance, afterCoupon) : 0;
  const payable = afterCoupon - kaamCashApplied;
  // When money moves depends on the behaviour of the work: repairs commit
  // the mandatory base hour now (extras settle after), event gigs pay a 30%
  // advance, care/plans/fixed jobs prepay, cash pays at completion.
  const payPolicy = policyFor(worker.categoryId, bookedTenureId);
  const paySplit = splitPayment(payable, payPolicy, payMethod);

  const redeemCoupon = () => {
    const res = applyCoupon(couponCode, quote.totalUserPays);
    setCoupon(res.coupon ?? null);
    setCouponMsg(res.message);
  };

  const confirmAndPay = () => {
    setProcessing(true);
    setPaymentPref(payMethod); // remember for next time
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
        // KAAM Cash is recorded but not spent yet — like the money, it only
        // moves once a worker accepts and the customer confirms.
        payment: { ...paySplit, walletApplied: kaamCashApplied },
      });
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
          <h1 className="font-display text-xl font-extrabold">{ml ? "ബുക്കിംഗ് സ്ഥിരീകരിച്ചു!" : "Booking Confirmed!"}</h1>
          <p className="mt-1 text-sm text-mid">
            {when === "asap"
              ? ml
                ? `${worker.name} വരുന്ന വഴിയിൽ · ETA ~${worker.etaMinutes} മിനിറ്റ്`
                : `${worker.name} is on the way · ETA ~${worker.etaMinutes} min`
              : ml
                ? `${worker.name} നിങ്ങളുടെ സമയം ഉടൻ സ്ഥിരീകരിക്കും`
                : `${worker.name} will confirm your requested time shortly`}
          </p>
          <Card className="mt-5">
            <p className="text-xs font-semibold text-mid">
              {ml ? "ജോലി തുടങ്ങാൻ ഈ കോഡ് തൊഴിലാളിക്ക് നൽകൂ" : "Share this code with your worker to start the job"}
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-[0.4em] text-kaam">
              {startCode}
            </p>
          </Card>
          <Link
            href="/app/bookings"
            className="mt-6 inline-block rounded-xl bg-kaam px-8 py-3.5 text-sm font-bold text-white shadow-kaam"
          >
            {ml ? "ബുക്കിംഗ് ട്രാക്ക് ചെയ്യൂ →" : "Track Booking →"}
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
          <h1 className="font-display text-lg font-bold">{ml ? `${worker.name.split(" ")[0]}-നെ ബുക്ക് ചെയ്യൂ` : `Book ${worker.name.split(" ")[0]}`}</h1>
          <p className="text-[11px] text-dim">
            {["configure", "review", "pay"].indexOf(step) + 1} {ml ? "/ 3 ·" : "of 3 ·"}{" "}
            {step === "configure" ? (ml ? "സേവനം തിരഞ്ഞെടുക്കൂ" : "Choose service") : step === "review" ? (ml ? "വില പരിശോധിക്കൂ" : "Review price") : ml ? "പേയ്മെന്റ്" : "Payment"}
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
                {ml ? "അവതരണമോ പഠനമോ?" : "Perform or learn?"}
              </p>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setArtMode("perform")}
                  className={`rounded-xl border p-3 text-left ${
                    artMode === "perform" ? "border-kaam bg-kaam-light" : "border-line bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${artMode === "perform" ? "text-kaam" : "text-ink"}`}>
                    🎼 {ml ? "അവതരണം" : "Perform"}
                  </p>
                  <p className="text-[10px] text-dim">{ml ? "വിവാഹം, ഇവന്റ് അല്ലെങ്കിൽ സെഷൻ" : "Wedding, event or session"}</p>
                </button>
                <button
                  onClick={() => setArtMode("learn")}
                  className={`rounded-xl border p-3 text-left ${
                    artMode === "learn" ? "border-kaam bg-kaam-light" : "border-line bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${artMode === "learn" ? "text-kaam" : "text-ink"}`}>
                    🎓 {ml ? "പഠനം" : "Learn"}
                  </p>
                  <p className="text-[10px] text-dim">{ml ? "കാലക്രമേണ പാഠങ്ങൾ" : "Take lessons over time"}</p>
                </button>
              </div>
            </>
          )}

          {learning && (
            <>
              <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
                {ml ? "പാഠങ്ങൾ എങ്ങനെ വേണം?" : "How would you like your lessons?"}
              </p>
              <div className="mb-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat("offline")}
                  className={`rounded-xl border p-3 text-left ${
                    format === "offline" ? "border-kaam bg-kaam-light" : "border-line bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${format === "offline" ? "text-kaam" : "text-ink"}`}>
                    🏠 {ml ? "നേരിട്ട്" : "In-person"}
                  </p>
                  <p className="text-[10px] text-dim">{ml ? "അധ്യാപകൻ നിങ്ങളുടെ അടുത്തേക്ക്" : "Teacher comes to you"}</p>
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
                    💻 {ml ? "ഓൺലൈൻ" : "Online"}
                  </p>
                  <p className="text-[10px] text-dim">{ml ? "വീഡിയോ കോൾ · എവിടെയും പഠിക്കൂ" : "Video call · learn anywhere"}</p>
                </button>
              </div>
            </>
          )}

          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
            {ml ? "നിങ്ങൾക്ക് എന്ത് വേണം?" : "What do you need?"}
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
                {learning
                  ? ml ? "മണിക്കൂർ കണക്കിന് അല്ലെങ്കിൽ സബ്സ്ക്രൈബ് ചെയ്യൂ" : "Book by the hour, or subscribe"
                  : ml ? "എത്ര നേരം സഹായം വേണം?" : "How long do you need help?"}
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

          {!usePlan &&
            (hourlyOnly ? (
              <div className="mb-5 rounded-xl border border-kaam-mid bg-kaam-light p-3">
                <p className="text-xs font-bold text-kaam">
                  {ml ? "🕐 മണിക്കൂർ കണക്കിന് · ക്ലോക്ക് അനുസരിച്ച് ബില്ലിംഗ്" : "🕐 Booked by the hour · billed by the clock"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-mid">
                  {ml
                    ? `തുടങ്ങാൻ 1 ബേസ് അവർ (${inr(baseHourPrice)}). ജോലി അധികമായാൽ, അധിക മിനിറ്റുകൾ മാത്രം — മിനിറ്റ് കണക്കിന്, ഒരിക്കലും മറ്റൊരു മണിക്കൂറായി റൗണ്ട് ചെയ്യില്ല. നേരത്തെ തീർന്നാൽ ബാക്കി സമയം നിങ്ങളുടേത്.`
                    : `Pay for 1 base hour to start (${inr(baseHourPrice)}). If the job runs over, only the extra minutes are added — billed by the minute, never rounded up to another hour. Finish early and the rest of the hour is still yours.`}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">{ml ? "എത്ര നേരത്തേക്ക്?" : "For how long?"}</p>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {allowedTenures.map((tenure) => (
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
            ))}

          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
            {ml ? "തൊഴിലാളിയെ എപ്പോൾ വേണം?" : "When do you need the worker?"}
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setWhen("asap")}
              className={`rounded-xl border p-3 text-left ${
                when === "asap" ? "border-kaam bg-kaam-light" : "border-line bg-white"
              }`}
            >
              <p className={`text-sm font-bold ${when === "asap" ? "text-kaam" : "text-ink"}`}>
                ⚡ {ml ? "എത്രയും വേഗം" : "As soon as possible"}
              </p>
              <p className="text-[10px] text-dim">{ml ? `~${worker.etaMinutes} മിനിറ്റിൽ തുടങ്ങും` : `Worker starts in ~${worker.etaMinutes} min`}</p>
            </button>
            <button
              onClick={() => setWhen("scheduled")}
              className={`rounded-xl border p-3 text-left ${
                when === "scheduled" ? "border-kaam bg-kaam-light" : "border-line bg-white"
              }`}
            >
              <p className={`text-sm font-bold ${when === "scheduled" ? "text-kaam" : "text-ink"}`}>
                📅 {ml ? "തീയതി & സമയം" : "Pick date & time"}
              </p>
              <p className="text-[10px] text-dim">{ml ? "തൊഴിലാളി സ്ലോട്ട് സ്ഥിരീകരിക്കും" : "Worker confirms your slot"}</p>
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
                {ml
                  ? "ℹ️ തൊഴിലാളി ഈ സമയം സ്ഥിരീകരിക്കും — അവർക്ക് പറ്റിയില്ലെങ്കിൽ മറ്റൊരു സ്ലോട്ട് തിരഞ്ഞെടുക്കാൻ ആവശ്യപ്പെടും."
                  : "ℹ️ The worker will confirm this time — if they can't make it, you'll be asked to pick another slot."}
              </p>
            </div>
          )}

          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">
            {ml ? "നിങ്ങളുടെ സ്ഥലം (യാത്ര അറിയാൻ)" : "Your location (so the worker knows the trip)"}
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
            🗺️ {ml ? "മാപ്പിൽ സ്ഥലം തിരഞ്ഞെടുക്കൂ" : "Select location on map"} {coords && <span className="ml-auto text-[11px]">✓ {ml ? "പിൻ ചെയ്തു" : "pinned"}</span>}
          </button>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setCoords(undefined); // typing overrides the pin
            }}
            placeholder={ml ? "…അല്ലെങ്കിൽ സ്ഥലം ടൈപ്പ് ചെയ്യൂ, ഉദാ: പനമ്പിള്ളി നഗർ, കൊച്ചി" : "…or type your area, e.g. Panampilly Nagar, Kochi"}
            className="mb-6 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-card outline-none focus:border-kaam"
          />

          <button
            onClick={() => setStep("review")}
            disabled={when === "scheduled" && !scheduleDate}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {when === "scheduled" && !scheduleDate
              ? ml ? "തുടരാൻ തീയതി തിരഞ്ഞെടുക്കൂ" : "Pick a date to continue"
              : ml ? `വില പരിശോധിക്കൂ → ${inr(quote.totalUserPays)}` : `Review Price → ${inr(quote.totalUserPays)}`}
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="fade-up">
          <Card className="mb-4">
            <p className="mb-1 text-xs font-bold tracking-wide text-dim uppercase">{ml ? "ബുക്കിംഗ് സംഗ്രഹം" : "Booking summary"}</p>
            <p className="mb-1 text-sm font-bold">
              {serviceLabel}
              {!usePlan && ` · ${TENURES.find((t) => t.id === tenureId)?.label}`}
            </p>
            {usePlan && (
              <p className="mb-1 inline-block rounded-full bg-good-light px-2 py-0.5 text-[10px] font-extrabold text-good">
                ♻️ {getCarePlan(planId).label} {ml ? "സബ്സ്ക്രിപ്ഷൻ · ഒരിക്കൽ ബിൽ" : "subscription · billed once"}
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
            {ml
              ? "🛡️ എല്ലാം ഉൾപ്പെട്ട വില — GST മുൻകൂട്ടി, മറഞ്ഞ ചാർജില്ല, തൊഴിലാളിക്ക് നേരിട്ട് അധികമായി ഒന്നും നൽകേണ്ട."
              : "🛡️ All-inclusive price — GST shown upfront, no hidden charges, and nothing extra to pay the worker directly."}
          </p>
          <Link
            href="/app/promise"
            className="mb-4 flex items-center justify-between rounded-xl border border-good-mid bg-good-light px-3 py-2.5 text-[11px] font-bold text-good"
          >
            <span>🤝 {ml ? "കാം വാഗ്ദാനത്താൽ സംരക്ഷിതം" : "Protected by the KAAM Promise"}</span>
            <span>{ml ? "കൂടുതൽ →" : "Learn more →"}</span>
          </Link>
          {isMetered({ tenureId: bookedTenureId }, worker) && (
            <p className="mb-4 rounded-xl bg-good-light p-3 text-[11px] leading-relaxed text-good">
              {ml
                ? `⏱ ന്യായമായ ബില്ലിംഗ്: ഈ ബേസ് അവർ തൊഴിലാളിയുടെ സമയവും യാത്രയും മൂടും (${GRACE_MINUTES} മിനിറ്റ് ഗ്രേസ്). കൂടുതൽ നീണ്ടോ? ജോലി ചെയ്ത മിനിറ്റുകൾക്ക് മാത്രം — ഉദാ: 1മ 08മി-ന് 68 മിനിറ്റ്, ഒരിക്കലും മറ്റൊരു മണിക്കൂറല്ല. തൊഴിലാളി സ്വീകരിക്കും വരെ പൂർണ്ണ റീഫണ്ട്, ശേഷം റീഫണ്ട് ഇല്ല.`
                : `⏱ Fair billing: this base hour covers the worker's time & travel (with a ${GRACE_MINUTES}-min grace). Runs longer? You pay only for the minutes actually worked — e.g. 1h 08m bills 68 minutes, never a rounded-up second hour. It's fully refundable until a worker accepts, and non-refundable after.`}
            </p>
          )}
          {payPolicy.timing === "advance_then_balance" && (
            <p className="mb-4 rounded-xl bg-good-light p-3 text-[11px] leading-relaxed text-good">
              {ml
                ? `⚖️ സ്ലോട്ട് ഉറപ്പിക്കാൻ ഇപ്പോൾ ${Math.round((paySplit.paidNow / Math.max(1, payable)) * 100)}% അഡ്വാൻസ് — തൊഴിലാളി സ്വീകരിക്കും വരെ പൂർണ്ണ റീഫണ്ട്. ബാക്കി ജോലിക്ക് ശേഷം മാത്രം.`
                : `⚖️ You pay a ${Math.round((paySplit.paidNow / Math.max(1, payable)) * 100)}% advance now to block your slot — fully refundable until a worker accepts. The rest is collected only after the job.`}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep("configure")}
              className="flex-1 rounded-xl border border-line bg-surf py-3.5 text-sm font-bold text-mid"
            >
              ← {ml ? "എഡിറ്റ്" : "Edit"}
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
              {customer ? (ml ? "പേയ്മെന്റിലേക്ക്" : "Continue to Payment") : ml ? "തുടരാൻ ലോഗിൻ" : "Login to Continue"}
            </button>
          </div>
        </div>
      )}

      {step === "pay" && (
        <div className="fade-up">
          {/* Promo code */}
          <div className="mb-4 rounded-2xl border border-line bg-white p-3.5">
            <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">🎟️ {ml ? "പ്രോമോ കോഡ്" : "Promo code"}</p>
            {coupon ? (
              <div className="flex items-center justify-between rounded-xl bg-good-light px-3 py-2.5">
                <span className="text-sm font-bold text-good">
                  {coupon.code} {ml ? "പ്രയോഗിച്ചു" : "applied"} · −{inr(couponDisc)}
                </span>
                <button
                  onClick={() => {
                    setCoupon(null);
                    setCouponCode("");
                    setCouponMsg(null);
                  }}
                  className="text-xs font-bold text-mid"
                >
                  {ml ? "നീക്കൂ" : "Remove"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder={ml ? "കോഡ് നൽകൂ" : "Enter code"}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surf px-3 py-2.5 text-sm font-bold tracking-wide uppercase outline-none focus:border-kaam"
                  />
                  <button
                    onClick={redeemCoupon}
                    disabled={!couponCode.trim()}
                    className="rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                  >
                    {ml ? "പ്രയോഗിക്കൂ" : "Apply"}
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
                <span className="block text-sm font-bold">{ml ? "കാം ക്യാഷ് ഉപയോഗിക്കൂ" : "Use KAAM Cash"}</span>
                <span className="block text-[11px] text-mid">
                  {ml ? `ബാലൻസ് ${inr(wallet.balance)} · ഈ ബുക്കിംഗിന് ${inr(kaamCashApplied)}` : `Balance ${inr(wallet.balance)} · applies ${inr(kaamCashApplied)} to this booking`}
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
          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">{ml ? "പേയ്മെന്റ് രീതി" : "Payment method"}</p>
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
                  <span className="block text-[11px] text-mid">
                    {method.sub}
                    {method.id === "cash" &&
                      (ml ? " · ഇപ്പോൾ ഒന്നും അടയ്ക്കേണ്ട" : " · nothing to pay upfront")}
                  </span>
                </span>
                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    payMethod === method.id ? "border-kaam bg-kaam" : "border-line"
                  }`}
                />
              </button>
            ))}
          </div>
          {memberDisc > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-[#f5f0ff] px-3 py-2 text-xs font-bold text-[#7c3aed]">
              <span>✦ {ml ? "കാം പ്ലസ് · 10% അംഗ കിഴിവ്" : "KAAM Plus · 10% member discount"}</span>
              <span>− {inr(memberDisc)}</span>
            </div>
          )}
          {couponDisc > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-kaam-light px-3 py-2 text-xs font-bold text-kaam">
              <span>🎟️ {coupon?.code} {ml ? "കിഴിവ്" : "discount"}</span>
              <span>− {inr(couponDisc)}</span>
            </div>
          )}
          {kaamCashApplied > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-good-light px-3 py-2 text-xs font-bold text-good">
              <span>💰 {ml ? "കാം ക്യാഷ് പ്രയോഗിച്ചു" : "KAAM Cash applied"}</span>
              <span>− {inr(kaamCashApplied)}</span>
            </div>
          )}
          {paySplit.balanceDue > 0 && (
            <div className="mb-3 rounded-xl bg-info-light px-3 py-2.5 text-xs text-info">
              <div className="flex items-center justify-between font-bold">
                <span>💳 {ml ? "ജോലിക്ക് ശേഷം" : "After the job"}</span>
                <span>{inr(paySplit.balanceDue)}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed">{payPolicy.note}</p>
            </div>
          )}
          <button
            onClick={confirmAndPay}
            disabled={processing}
            className="w-full rounded-xl bg-good py-3.5 text-sm font-bold text-white shadow-[0_6px_24px_rgba(21,128,61,0.22)] disabled:opacity-50"
          >
            {processing
              ? ml ? "തൊഴിലാളിയെ തിരയുന്നു…" : "Finding your worker…"
              : ml ? "തൊഴിലാളിയെ കണ്ടെത്തൂ — ഇപ്പോൾ പണമില്ല" : "Find my worker — pay nothing now"}
          </button>
          <p className="mt-3 rounded-xl bg-good-light px-3 py-2.5 text-center text-[11px] leading-relaxed font-semibold text-good">
            {ml
              ? `💚 ഇപ്പോൾ ഒന്നും ഈടാക്കില്ല. ഒരു തൊഴിലാളി സ്വീകരിച്ചാൽ മാത്രം ${(paySplit.dueOnAccept ?? 0) > 0 ? inr(paySplit.dueOnAccept ?? 0) : "പണം"} അടയ്ക്കൂ — ആരും സ്വീകരിച്ചില്ലെങ്കിൽ പണം പോകില്ല.`
              : `💚 You're charged nothing now. Pay ${(paySplit.dueOnAccept ?? 0) > 0 ? inr(paySplit.dueOnAccept ?? 0) : ""} only once a worker accepts — if nobody takes the job, no money ever leaves your account.`}
          </p>
          <p className="mt-2 text-center text-[10px] text-dim">
            {ml ? "🔒 പേയ്മെന്റ് Razorpay വഴി · 85% തൊഴിലാളിക്ക്" : "🔒 Payments processed by Razorpay · auto-split 85% to worker"}
          </p>
        </div>
      )}
    </main>
  );
}
