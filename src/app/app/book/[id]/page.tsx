"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCustomer } from "@/lib/auth";
import { useAddresses, addressesFor, displayName } from "@/lib/addresses";
import { getWorker, WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { computeQuote, tenureMultiplier, tenuresForGroup } from "@/lib/pricing";
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
import { policyFor, splitPayment } from "@/lib/payment-policy";
import { sendMessage } from "@/lib/chat";
import { formatSchedule, generateStartCode, inr, shortId } from "@/lib/format";
import type { BookingSchedule, StateId, TenureId, Subscription } from "@/lib/types";
import { Avatar, BackLink, Card } from "@/components/ui";
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
  const stateId: StateId = "KL"; // Kerala-only launch
  const [when, setWhen] = useState<"asap" | "scheduled">("asap");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("10:00");
  const [payMethod] = useState<string>(() => {
    const saved = readPaymentPref();
    return saved && PAY_METHODS.some((m) => m.id === saved) ? saved : "gpay";
  });
  const [processing, setProcessing] = useState(false);

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

  // The booking records the full list price. Every deduction — KAAM Plus,
  // coupons, KAAM Cash — is chosen and applied on the payment screen after a
  // worker accepts, so the two places can never disagree about the discount.
  //
  // When money moves depends on the behaviour of the work: repairs commit the
  // mandatory base hour (extras settle after), event gigs pay a 30% advance,
  // care/plans/fixed jobs prepay, cash pays at completion.
  const payPolicy = policyFor(worker.categoryId, bookedTenureId);
  const paySplit = splitPayment(quote.totalUserPays, payPolicy, payMethod);


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
        // No money and no discounts yet — both are settled on the payment
        // screen once a worker accepts.
        payment: paySplit,
      });
      sendMessage({
        bookingId,
        sender: "system",
        text: `Booking placed 📋 ${serviceLabel} · requested time: ${formatSchedule(schedule)} · nothing charged yet — you pay only once a worker accepts. Chat is open — share photos or videos of the problem.`,
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

      setProcessing(false);
      setStep("done");
    }, 900);
  };

  if (step === "done") {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <div className="fade-up">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-info-light text-4xl">
            📨
          </div>
          {/* Nothing is confirmed until the worker accepts — saying otherwise
              sets the customer up to wait for someone who never agreed. */}
          <h1 className="font-display text-xl font-extrabold">
            {ml ? "അഭ്യർത്ഥന അയച്ചു!" : "Request sent!"}
          </h1>
          <p className="mt-1 text-sm text-mid">
            {ml
              ? `${worker.name} സ്വീകരിക്കാൻ കാത്തിരിക്കുന്നു — സ്വീകരിച്ചാൽ ഉടൻ അറിയിക്കും.`
              : `Waiting for ${worker.name} to accept — we'll tell you the moment they do.`}
          </p>
          <p className="mt-3 rounded-xl border border-good-mid bg-good-light px-3 py-2 text-[11px] font-semibold text-good">
            {ml
              ? "ഇതുവരെ ഒന്നും ഈടാക്കിയിട്ടില്ല. അവർ സ്വീകരിച്ചതിന് ശേഷം മാത്രം പണം അടച്ചാൽ മതി."
              : "Nothing has been charged. You pay only after they accept."}
          </p>
          <Card className="mt-4 text-left">
            <p className="text-xs font-bold text-ink">
              {ml ? "അടുത്തത് എന്ത്?" : "What happens next"}
            </p>
            <ol className="mt-2 flex flex-col gap-1.5 text-[11px] leading-relaxed text-mid">
              <li>
                1️⃣ {ml ? `${worker.name.split(" ")[0]} അഭ്യർത്ഥന കാണും` : `${worker.name.split(" ")[0]} sees your request`}
              </li>
              <li>
                2️⃣ {ml ? "സ്വീകരിച്ചാൽ പൂർണ്ണ വില കാണിക്കും" : "If they accept, you'll see the full price"}
              </li>
              <li>
                3️⃣ {ml ? "പണം അടച്ചാൽ സ്റ്റാർട്ട് കോഡ് ലഭിക്കും" : "Pay, and your start code appears"}
              </li>
            </ol>
          </Card>
          <Link
            href="/app/bookings"
            className="mt-6 inline-block rounded-xl bg-kaam px-8 py-3.5 text-sm font-bold text-white shadow-kaam"
          >
            {ml ? "അഭ്യർത്ഥന കാണൂ →" : "Track request →"}
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
            {ml ? "എന്ത് ജോലി, എപ്പോൾ, എവിടെ" : "What, when and where"}
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

          {/* Nothing is priced or charged here: the customer is asking whether
              this worker is free. The price is reviewed, and paid, only once
              the worker has accepted (see AcceptPayment). */}
          <button
            onClick={() => {
              if (!customer) {
                router.push(`/app/login?next=/app/book/${worker.id}`);
                return;
              }
              confirmAndPay();
            }}
            disabled={processing || (when === "scheduled" && !scheduleDate)}
            className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
          >
            {when === "scheduled" && !scheduleDate
              ? ml ? "തുടരാൻ തീയതി തിരഞ്ഞെടുക്കൂ" : "Pick a date to continue"
              : processing
                ? ml ? "അയയ്ക്കുന്നു…" : "Sending…"
                : !customer
                  ? ml ? "തുടരാൻ ലോഗിൻ ചെയ്യൂ" : "Login to continue"
                  : ml ? `${worker.name.split(" ")[0]} ഒഴിവുണ്ടോ എന്ന് ചോദിക്കൂ →` : `Request ${worker.name.split(" ")[0]}'s availability →`}
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-mid">
            {ml
              ? `${inr(worker.rate)}/${worker.unit} നിരക്ക്. ഇപ്പോൾ പണം ഈടാക്കില്ല — ${worker.name.split(" ")[0]} സ്വീകരിച്ചാൽ വില കാണിച്ച് പണം ചോദിക്കും.`
              : `Rate ${inr(worker.rate)}/${worker.unit}. Nothing is charged now — you'll see the full price and pay only if ${worker.name.split(" ")[0]} accepts.`}
          </p>
        </div>
      )}

    </main>
  );
}
