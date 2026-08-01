"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { getTenure } from "@/lib/pricing";
import { updateBooking, useBookings } from "@/lib/bookings";
import { customerRatingFor } from "@/lib/customer-rating";
import { earnedAt, securedNotEarned } from "@/lib/analytics";
import { useAwayMap, setAway, isAway, awayUntil } from "@/lib/availability";
import { sendMessage, unreadCount, useChatMessages } from "@/lib/chat";
import { formatSchedule, inr } from "@/lib/format";
import { directionsLink, geocode, haversineKm, jitter } from "@/lib/geo";
import type { Booking, Worker } from "@/lib/types";
import { Avatar, Card, Tag } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { ChatPanel } from "@/components/chat-panel";
import { LiveMap } from "@/components/live-map";
import { SyncStatus } from "@/components/sync-status";
import { NotifyToggle } from "@/components/notify-toggle";
import { notify } from "@/lib/notify";
import { refund } from "@/lib/wallet";
import { onlineSecondsToday, presenceOnline, setOnline, usePresence, formatOnlineTime } from "@/lib/presence";
import { useWeeklyGoals, weeklyGoal, weekProgress } from "@/lib/weekly-goal";
import { useApplications, useMyApplicationId } from "@/lib/applications";
import { hasSampleData, loadSampleData } from "@/lib/sample-data";
import { WorkerMotivation, WorkerTips } from "@/components/worker-motivation";
import { WorkerEarnings } from "@/components/worker-earnings";
import { WorkerGoal } from "@/components/worker-goal";
import { WorkerPlans, WorkerTodayVisits } from "@/components/worker-plans";
import { ViewAsPicker } from "@/components/view-as-picker";
import { useLanguage } from "@/components/language-provider";
import { WorkerReviews } from "@/components/worker-reviews";
import { WorkerLeaderboard } from "@/components/worker-leaderboard";
import { WorkerSupport } from "@/components/worker-support";
import { WorkerStatus } from "@/components/worker-status";
import { WorkerPro } from "@/components/worker-pro";
import { WorkerRefer } from "@/components/worker-refer";
import { WorkerGuide } from "@/components/worker-guide";
import { DispatchEngine } from "@/components/dispatch-engine";
import { declinePatch, jobCoords, OFFER_WINDOW_SECONDS } from "@/lib/dispatch";
import { suggestWorkers } from "@/lib/worker-status";
import { earnedBadges } from "@/lib/badges";
import { useVoice } from "@/lib/use-voice";
import { announceJob } from "@/lib/job-voice";

/** Only surface open trade requests within a serviceable radius. */
const MAX_QUEUE_KM = 40;
import { acceptPatch, outstandingBalance, readyToStart } from "@/lib/payment-policy";
import { surgeMap } from "@/lib/surge";
import { JobMeter } from "@/components/job-meter";
import { PauseReschedule } from "@/components/pause-reschedule";
import { OverdueWarning } from "@/components/worker-no-show";
import { IntakeBrief } from "@/components/health-intake";
import { CrewBrief } from "@/components/crew-brief";
import { CompleteJob } from "@/components/complete-job";
import { JobAlarms } from "@/components/job-alarms";
import { CashReceived } from "@/components/cash-received";
import { OvertimeBreakdown } from "@/components/overtime-breakdown";
import { explainOvertime } from "@/lib/overtime";
import { StartJob } from "@/components/start-job";
import { BookingReminders } from "@/components/booking-reminders";

/**
 * Swiggy/Uber-style accept countdown. Runs off the booking's live dispatch
 * window — when it hits zero the DispatchEngine really does move the job to
 * the next nearest worker (legacy bookings without dispatch state fall back
 * to a soft window from creation time).
 */
function OfferCountdown({ job }: { job: Booking }) {
  const ml = useLanguage().lang === "ml";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (job.dispatch && job.dispatch.offerExpiresAt === null) {
    return (
      <p className="mt-2 text-[10px] font-bold text-mid">
        {ml
          ? "🟢 തുറന്ന ഓഫർ — നിങ്ങളാണ് ഏറ്റവും അടുത്തുള്ളത്; ഒഴിവുള്ളപ്പോൾ മറുപടി നൽകൂ"
          : "🟢 Open offer — you're the nearest available worker; respond when free"}
      </p>
    );
  }

  const expiresAt = job.dispatch?.offerExpiresAt
    ? new Date(job.dispatch.offerExpiresAt).getTime()
    : new Date(job.createdAt).getTime() + OFFER_WINDOW_SECONDS * 1000;
  const left = Math.max(0, Math.round((expiresAt - now) / 1000));
  const fraction = left / OFFER_WINDOW_SECONDS;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className={left > 0 ? "text-kaam" : "text-dim"}>
          {left > 0
            ? ml
              ? `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}-നുള്ളിൽ മറുപടി നൽകൂ — അല്ലെങ്കിൽ അടുത്ത ആൾക്ക് പോകും`
              : `⏱ Respond in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} — then it goes to the next nearest worker`
            : ml
              ? "⏱ സമയം കഴിഞ്ഞു — അടുത്ത ആൾക്ക് കൈമാറുന്നു…"
              : "⏱ Offer window over — passing to the next nearest worker…"}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all ${
            fraction > 0.5 ? "bg-good" : fraction > 0.2 ? "bg-warn" : "bg-kaam"
          }`}
          style={{ width: `${Math.max(2, fraction * 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Uber driver-app "today" meter: earnings, jobs, and time online since
 * midnight — the numbers a gig worker checks all day. Time online ticks
 * live off the GO toggle's presence stints.
 */
function TodayMeter({ worker, bookings }: { worker: Worker; bookings: Booking[] }) {
  const ml = useLanguage().lang === "ml";
  const presence = usePresence();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date(now).toDateString();
  const doneToday = bookings.filter(
    (b) =>
      b.workerId === worker.id &&
      b.status === "completed" &&
      // The day the job was finished. Booking dates belong to the customer's
      // calendar, not the worker's day of work.
      new Date(earnedAt(b)).toDateString() === today,
  );
  const earned = doneToday.reduce((sum, b) => sum + b.quote.workerPayout, 0);
  const secured = securedNotEarned(bookings, worker.id);
  const online = presenceOnline(presence, worker);
  const seconds = onlineSecondsToday(presence, worker.id, new Date(now));
  const goals = useWeeklyGoals();
  const week = weekProgress(bookings, worker.id, weeklyGoal(goals, worker.id), new Date(now));

  return (
    <Card className="mb-4 bg-ink text-white">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">
          {ml ? "ഇന്ന്" : "Today"}
        </p>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold ${online ? "text-good" : "text-white/50"}`}>
          <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-good" : "bg-white/30"}`} />
          {online
            ? ml ? "ഓൺലൈൻ — ജോലി വരും" : "ONLINE — getting offers"
            : ml ? "ഓഫ്‌ലൈൻ — ജോലി വരില്ല" : "OFFLINE — no offers"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          { label: ml ? "കിട്ടിയത്" : "Earned", value: inr(earned) },
          { label: ml ? "ജോലികൾ" : "Jobs done", value: `${doneToday.length}` },
          { label: ml ? "ഓൺലൈൻ സമയം" : "Time online", value: formatOnlineTime(seconds) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white/10 p-2.5">
            <p className="font-display text-base font-extrabold">{stat.value}</p>
            <p className="text-[10px] font-semibold text-white/60">{stat.label}</p>
          </div>
        ))}
      </div>
      {/* Weekly goal glance — details live in the Earnings tab */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-white/60">
            🎯 This week {inr(week.earned)} / {inr(week.target)}
          </span>
          <span className={week.achieved || week.onTrack ? "text-good" : "text-white/50"}>
            {week.achieved ? "🎉 Goal met!" : week.onTrack ? "On track" : `${inr(week.remaining)} to go`}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className={`h-full rounded-full ${week.achieved ? "bg-good" : "bg-white"}`}
            style={{ width: `${Math.round(week.pct * 100)}%` }}
          />
        </div>
      </div>

      {/* Paid, but the work isn't done. Without this line the card says
          "Earned ₹0" while the job right under it says "₹420 · Paid", and a
          worker is left to guess which number is lying to them. */}
      {secured > 0 && (
        <p className="mt-3 rounded-xl bg-good/20 px-3 py-2 text-xs font-bold text-good-mid">
          {ml
            ? `💰 ${inr(secured)} അടച്ചിട്ടുണ്ട് — ജോലി തീർത്താൽ നിങ്ങളുടേത്`
            : `💰 ${inr(secured)} paid in — yours the moment you finish the job`}
        </p>
      )}
    </Card>
  );
}

/**
 * Uber-style surge alert: when the worker's district runs hot (more live
 * jobs than online workers can absorb), tell them — going online now earns
 * 20% more per job, which is exactly what rebalances the marketplace.
 */
function SurgeBanner({ worker }: { worker: Worker }) {
  const bookings = useBookings();
  const presence = usePresence();
  const s = surgeMap(bookings, WORKERS, {
    isOnline: (w) => presenceOnline(presence, w),
  })[worker.district];
  if (!s?.surging) return null;
  return (
    <div className="fade-up mb-4 rounded-2xl border border-warn-mid bg-warn-light p-3.5">
      <p className="text-sm font-bold text-warn">
        ⚡ Surge in {worker.district} — earn 20% more per job
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        {s.demand} live request{s.demand === 1 ? "" : "s"} and only {s.supply} worker
        {s.supply === 1 ? "" : "s"} online nearby. Every new booking here pays ×1.2 —{" "}
        {presenceOnline(presence, worker) ? "stay online to catch them." : "go online now to catch them."}
      </p>
    </div>
  );
}

/** Worker "away mode" — schedule leave so they stop getting job offers. */
function AwayControl({ workerId }: { workerId: string }) {
  const map = useAwayMap();
  const away = isAway(map, workerId);
  const until = awayUntil(map, workerId);
  return (
    <Card className={`mb-4 ${away ? "border-warn-mid bg-warn-light" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{away ? "🌴" : "🗓️"}</span>
        <div className="flex-1">
          <p className="text-sm font-bold">{away ? "You're away" : "Away mode"}</p>
          <p className="text-[11px] text-mid">
            {away
              ? `No new jobs until ${new Date(until!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`
              : "Going on leave? Pause new job offers until a date."}
          </p>
        </div>
        {away ? (
          <button
            onClick={() => setAway(workerId, null)}
            className="rounded-lg bg-warn px-3 py-1.5 text-xs font-bold text-white"
          >
            I&apos;m back
          </button>
        ) : (
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && setAway(workerId, new Date(e.target.value).toISOString())}
            className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none"
          />
        )}
      </div>
    </Card>
  );
}

/** Worker rates the customer after a completed job (two-way trust). */
function RateCustomer({ job }: { job: Booking }) {
  const [hover, setHover] = useState(0);
  if (typeof job.customerRating === "number") {
    return (
      <div className="mt-3 rounded-xl bg-surf p-3 text-xs font-semibold text-mid">
        You rated this customer{" "}
        <span className="text-amber-500">{"★".repeat(job.customerRating)}</span>
        <span className="text-line">{"★".repeat(5 - job.customerRating)}</span>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-line bg-white p-3">
      <p className="mb-1.5 text-xs font-bold text-ink">Rate this customer</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => updateBooking(job.id, { customerRating: star })}
            className={`text-2xl ${star <= hover ? "text-amber-500" : "text-line"}`}
            aria-label={`${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-dim">Helps other workers know their customers.</p>
    </div>
  );
}

/**
 * Worker portal (demo). In production each worker signs in with OTP and
 * sees only their own jobs; here a "view as" selector stands in for auth.
 */
type WorkerTab = "jobs" | "earnings" | "status";

export default function WorkerDashboard() {
  const [workerId, setWorkerId] = useState(WORKERS[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkerTab>("jobs");
  const { lang } = useLanguage();
  const ml = lang === "ml";
  // Everything that is not the work itself starts folded away. A worker with a
  // job running had to scroll past eleven blocks of tips and settings to reach
  // it; the job now comes first and this holds the rest.
  const [moreOpen, setMoreOpen] = useState(false);
  const bookings = useBookings();
  const chatMessages = useChatMessages();
  const applications = useApplications();
  const myAppId = useMyApplicationId();
  const myApplication = applications.find((a) => a.id === myAppId);
  const awayMap = useAwayMap();
  const presence = usePresence();
  // Voice job alerts — read a job aloud for a skilled worker who reads little.
  // Malayalam by default (the target user); no-op when a phone can't speak.
  const voice = useVoice("ml");

  const worker = WORKERS.find((w) => w.id === workerId) ?? WORKERS[0];
  // The real GO toggle: persisted, feeds dispatch + customer search.
  const isOnline = presenceOnline(presence, worker);
  const setIsOnline = (next: boolean) => setOnline(worker.id, next);
  const category = getCategory(worker.categoryId);
  const myJobs = bookings.filter((b) => b.workerId === worker.id);
  // Category-scoped job queue: a nurse only sees nurse requests, a mechanic
  // only mechanic requests — within a serviceable radius and ranked
  // nearest-first with the matching algorithm. A job dispatched directly to
  // this worker always shows, even if it's a little further out.
  const incoming = bookings
    .filter(
      (b) =>
        b.status === "requested" &&
        b.categoryId === worker.categoryId &&
        (b.workerId === worker.id || haversineKm(worker.coords, jobCoords(b)) <= MAX_QUEUE_KM),
    )
    .sort(
      (a, b) => haversineKm(worker.coords, jobCoords(a)) - haversineKm(worker.coords, jobCoords(b)),
    );

  // Open requests per trade, so you can see demand in other trades and switch
  // "View as" to a worker there to handle them.
  const pendingByCategory = bookings.reduce<Record<string, number>>((acc, b) => {
    if (b.status === "requested") acc[b.categoryId] = (acc[b.categoryId] ?? 0) + 1;
    return acc;
  }, {});
  const otherTrades = Object.keys(pendingByCategory)
    .filter((cid) => cid !== worker.categoryId)
    .map((cid) => ({
      cid,
      count: pendingByCategory[cid],
      cat: getCategory(cid as (typeof worker)["categoryId"]),
      sample: WORKERS.find((x) => x.categoryId === cid),
    }))
    .filter((t) => t.sample);
  // Queue size for a given worker's trade — powers the "View as" labels.
  const queueCountFor = (w: (typeof WORKERS)[number]) => pendingByCategory[w.categoryId] ?? 0;

  // Fire a device notification ONLY for jobs meant for this worker — same
  // trade, nearby (or dispatched to them). A nurse must never be pinged about
  // a mechanic's job. Re-seeds when the viewed worker changes so switching
  // doesn't spam alerts.
  const seenRequests = useRef<Set<string> | null>(null);
  const seenForWorker = useRef<string | null>(null);
  useEffect(() => {
    const relevant = bookings.filter(
      (b) =>
        b.status === "requested" &&
        b.categoryId === worker.categoryId &&
        (b.workerId === worker.id || haversineKm(worker.coords, jobCoords(b)) <= MAX_QUEUE_KM),
    );
    if (seenRequests.current === null || seenForWorker.current !== worker.id) {
      seenRequests.current = new Set(relevant.map((b) => `${b.id}:${b.workerId}`));
      seenForWorker.current = worker.id;
      return;
    }
    for (const b of relevant) {
      const key = `${b.id}:${b.workerId}`;
      if (seenRequests.current.has(key)) continue;
      seenRequests.current.add(key);
      notify(
        b.workerId === worker.id ? `📡 New ${category.label} job for you` : `🔔 New ${category.label} job nearby`,
        `${b.subService} · ${b.address ?? "Kerala"}`,
        "/worker",
      );
    }
  }, [bookings, worker.id, worker.categoryId, worker.coords, category.label]);
  const active = myJobs.filter((b) => b.status === "accepted" || b.status === "in_progress");
  const completed = myJobs.filter((b) => b.status === "completed");
  const earned = completed.reduce((sum, b) => sum + b.quote.workerPayout, 0);

  const JobCard = ({ job }: { job: Booking }) => {
    const tenure = getTenure(job.tenureId);
    return (
      <Card className="fade-up">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold">
              {getCategory(job.categoryId).icon} {job.subService}
            </p>
            <p className="text-xs text-mid">
              {tenure.label} ({tenure.duration}) ·{" "}
              {new Date(job.createdAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {(() => {
              const cr = customerRatingFor(bookings, job.customerId);
              return cr.count > 0 ? (
                <span className="mt-1 inline-block rounded-full bg-surf px-2 py-0.5 text-[10px] font-bold text-mid">
                  👤 Customer ⭐ {cr.avg.toFixed(1)} ({cr.count})
                </span>
              ) : null;
            })()}
          </div>
          <p className="text-sm font-extrabold text-good">{inr(job.quote.workerPayout)}</p>
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          <p className="rounded-lg bg-surf px-2.5 py-1.5 text-xs font-bold text-ink">
            📍 {job.address ?? "Kochi"} ·{" "}
            <span className="text-mid">
              ~{Math.round(haversineKm(worker.coords, jobCoords(job)) * 10) / 10}{" "}
              {ml ? "കി.മീ അകലെ" : "km from you"}
            </span>
          </p>
          {job.status === "requested" &&
            (job.workerId === worker.id ? (
              <p className="rounded-lg bg-kaam-light px-2.5 py-1.5 text-[11px] font-bold text-kaam">
                {ml
                  ? "🎯 നിങ്ങൾക്കായി അയച്ചത് — ഏറ്റവും അടുത്തുള്ളത് നിങ്ങളാണ്. മറ്റൊരാൾക്ക് പോകും മുൻപ് സ്വീകരിക്കൂ."
                  : `🎯 Dispatched to you — you're the nearest available ${getCategory(job.categoryId).label.toLowerCase()}. Accept before it moves on.`}
              </p>
            ) : (
              <p className="rounded-lg bg-surf px-2.5 py-1.5 text-[11px] font-bold text-mid">
                {ml
                  ? "📋 അടുത്തുള്ള ഒരു ജോലി — ആദ്യം സ്വീകരിക്കുന്ന ആൾക്ക് കിട്ടും."
                  : `📋 Open ${getCategory(job.categoryId).label.toLowerCase()} request nearby — first to accept gets it.`}
              </p>
            ))}
          <p className="rounded-lg bg-info-light px-2.5 py-1.5 text-xs font-bold text-info">
            🕐 {ml ? "ഉപഭോക്താവ് ചോദിച്ച സമയം: " : "Customer's requested time: "}
            {formatSchedule(job.schedule)}
          </p>

          {/* Payment status — the worker must never travel unpaid, and must
              know the instant the money lands so they can set off. */}
          {job.status === "accepted" && !readyToStart(job) && (
            <div className="rounded-lg border border-warn-mid bg-warn-light px-2.5 py-2">
              <p className="text-xs font-extrabold text-warn">
                ⏳ {ml ? "പണം വരാൻ കാത്തിരിക്കുന്നു" : "Waiting for customer payment"}
              </p>
              <p className="text-[11px] font-semibold text-warn/90">
                പണം കിട്ടിയിട്ട് പുറപ്പെടൂ · Don&apos;t set off yet — we&apos;ll tell you the moment it&apos;s paid.
              </p>
            </div>
          )}
          {(job.status === "accepted" || job.status === "in_progress") &&
            job.payment?.confirmedAt && (
              <div className="rounded-lg border border-good-mid bg-good-light px-2.5 py-2">
                <p className="text-xs font-extrabold text-good">
                  ✅ {ml ? "പണം ലഭിച്ചു — തുടങ്ങാം" : "Payment done — start now"}
                </p>
                <p className="text-[11px] font-semibold text-good/90">
                  പണം ലഭിച്ചു · പുറപ്പെടാം · Customer has paid. You&apos;re good to go.
                </p>
              </div>
            )}
          {/* Cash job: nothing to wait for — but say so, so "no payment strip"
              is never mistaken for "something is broken". */}
          {(job.status === "accepted" || job.status === "in_progress") &&
            job.paymentMethod === "cash" && (
              <div className="rounded-lg border border-line bg-surf px-2.5 py-2">
                <p className="text-xs font-extrabold text-ink">
                  💵 {ml ? "ക്യാഷ് ജോലി — അവസാനം " : "Cash job — collect "}
                  {inr(job.quote.totalUserPays)}
                  {ml ? " വാങ്ങുക" : " at the end"}
                </p>
                <p className="text-[11px] font-semibold text-mid">
                  പണം ജോലി കഴിഞ്ഞ് വാങ്ങുക · No advance to wait for — you can set off now.
                </p>
              </div>
            )}
        </div>

        {voice.canSpeak && (
          <button
            onClick={() => {
              if (voice.speaking) {
                voice.stopSpeaking();
                return;
              }
              voice.speak(
                announceJob(
                  {
                    trade: getCategory(job.categoryId).label,
                    pay: job.quote.workerPayout,
                    km: haversineKm(worker.coords, jobCoords(job)),
                    place: job.address ?? "Kochi",
                  },
                  "ml",
                ),
                "ml-IN",
              );
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-info-mid bg-info-light py-2.5 text-xs font-bold text-info"
          >
            {voice.speaking ? "⏹ നിർത്തൂ · Stop" : "🔊 കേൾക്കൂ · Listen to this job"}
          </button>
        )}

        {job.status === "requested" && job.workerId === worker.id && <OfferCountdown job={job} />}
        <JobMeter booking={job} perspective="worker" />
        {/* Two-sided completion: whoever ends it stops the clock; the other
            confirms with a 4-digit code, and both see the exact minute. */}
        <CompleteJob booking={job} viewer="worker" worker={worker} />
        <CrewBrief booking={job} />
        <IntakeBrief booking={job} />
        <OverdueWarning booking={job} />
        <PauseReschedule booking={job} viewer="worker" />

        <button
          onClick={() => setExpanded(expanded === job.id ? null : job.id)}
          className="mt-2 text-[11px] font-bold text-info"
        >
          {expanded === job.id ? "Hide payout breakdown ▲" : "View payout breakdown ▼"}
        </button>
        {expanded === job.id && (
          <div className="mt-2 rounded-xl bg-surf p-3">
            <QuoteBreakdown quote={job.quote} perspective="worker" />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {job.status === "requested" && (
            <>
              <button
                onClick={() => {
                  // Accepting grabs the job for this worker (first to accept
                  // wins) and closes the dispatch offer.
                  // Accepting starts the customer's pay-to-confirm window —
                  // money moves only now that a worker has committed.
                  const pay = acceptPatch(job);
                  updateBooking(job.id, {
                    status: "accepted",
                    workerId: worker.id,
                    workerName: worker.name,
                    dispatch: undefined,
                    ...(pay ?? {}),
                  });
                  sendMessage({
                    bookingId: job.id,
                    sender: "system",
                    text: pay
                      ? `${worker.name.split(" ")[0]} accepted your job ✅ Please pay ${inr(job.payment?.dueOnAccept ?? 0)} within 2 minutes to confirm — the worker sets off as soon as it's paid.`
                      : job.schedule?.when === "scheduled"
                        ? `${worker.name.split(" ")[0]} confirmed your slot ✅ ${formatSchedule(job.schedule)}`
                        : `${worker.name.split(" ")[0]} accepted the job ✅ ETA ~${worker.etaMinutes} min`,
                  });
                }}
                className="min-w-[46%] flex-1 rounded-xl bg-good py-2.5 text-center text-white"
              >
                <span className="block text-sm font-extrabold">✓ Accept</span>
                <span className="block text-[10px] font-semibold opacity-90">സ്വീകരിക്കുക</span>
              </button>
              {job.workerId === worker.id && (
              <>
              <button
                onClick={() => {
                  updateBooking(job.id, { status: "reschedule" });
                  sendMessage({
                    bookingId: job.id,
                    sender: "system",
                    text: `${worker.name.split(" ")[0]} can't make ${formatSchedule(job.schedule)} 🕐 Please pick another time from My Bookings.`,
                  });
                }}
                className="min-w-[46%] flex-1 rounded-xl border border-warn-mid bg-warn-light py-2.5 text-center text-warn"
              >
                <span className="block text-xs font-bold">🕐 Can&apos;t make it</span>
                <span className="block text-[10px] font-semibold opacity-90">സമയം ശരിയാവില്ല</span>
              </button>
              <button
                onClick={() => {
                  // The customer chose this worker, so a decline hands the
                  // choice back to them — it never picks a stranger for them.
                  const others = suggestWorkers(
                    WORKERS,
                    job.categoryId,
                    { presence, away: awayMap, bookings },
                    [job.workerId, ...(job.dispatch?.passedIds ?? [])],
                    1,
                  );
                  if (others.length > 0) {
                    // declinePatch records *that they refused*, so the customer
                    // is never told to keep waiting for a definite no.
                    updateBooking(job.id, declinePatch(job));
                    sendMessage({
                      bookingId: job.id,
                      sender: "system",
                      text: `${worker.name.split(" ")[0]} can't take this job. Nothing has been charged — choose another worker from your booking, we've listed who's free right now 👥`,
                    });
                  } else {
                    updateBooking(job.id, {
                      status: "cancelled",
                      cancelReason: "No nearby worker available",
                    });
                    // Full refund of whatever was collected — the customer
                    // did nothing wrong.
                    const paid = job.payment?.paidNow ?? job.quote.totalUserPays;
                    if (job.paymentMethod !== "cash" && paid > 0) {
                      refund(paid, `Refund · no worker available for ${job.subService}`);
                    }
                    sendMessage({
                      bookingId: job.id,
                      sender: "system",
                      text: "😔 No other worker is available nearby right now — the booking was cancelled and your full payment refunded to KAAM Cash.",
                    });
                  }
                }}
                title="Decline — passes to the next nearest worker"
                className="rounded-xl border border-kaam-mid bg-kaam-light px-3 py-2.5 text-center text-kaam"
              >
                <span className="block text-xs font-bold">↪ Pass</span>
                <span className="block text-[10px] font-semibold opacity-90">വേണ്ട</span>
              </button>
              </>
              )}
            </>
          )}
          {job.status === "accepted" && !readyToStart(job) && (
            <div className="flex-1 rounded-xl border border-warn-mid bg-warn-light py-2.5 text-center">
              <span className="block text-xs font-bold text-warn">💳 Waiting for customer payment</span>
              <span className="block text-[10px] font-semibold text-warn/80">
                പണം ലഭിച്ചാൽ പുറപ്പെടാം · don&apos;t travel yet
              </span>
            </div>
          )}
          {job.status === "accepted" && readyToStart(job) && (
            <StartJob booking={job} worker={worker} />
          )}
          <button
            onClick={() => setChatOpen(chatOpen === job.id ? null : job.id)}
            className="relative rounded-xl border border-info-mid bg-info-light px-3 py-2.5 text-xs font-bold text-info"
            aria-label="Chat with customer"
          >
            💬
            {unreadCount(chatMessages, job.id, "worker") > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-kaam text-[9px] font-extrabold text-white">
                {unreadCount(chatMessages, job.id, "worker")}
              </span>
            )}
          </button>
          <button
            onClick={() => setMapOpen(mapOpen === job.id ? null : job.id)}
            className="rounded-xl border border-line bg-surf px-3 py-2.5 text-xs font-bold text-ink"
            aria-label="Customer location"
          >
            🗺️
          </button>
        </div>
        {mapOpen === job.id && (
          <div className="mt-3">
            {(() => {
              const customer = job.coords ?? jitter(geocode(job.address, worker.city), job.id, 3);
              const from = jitter(geocode(worker.city), worker.id, 2);
              const km = haversineKm(from, customer);
              return (
                <>
                  <LiveMap worker={from} customer={customer} heightClass="h-48" />
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-surf px-3 py-2">
                    <p className="text-xs font-bold">
                      📍 {job.address ?? worker.city} ·{" "}
                      <span className="text-mid">{km.toFixed(1)} km from you</span>
                    </p>
                    <a
                      href={directionsLink(customer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-info px-3 py-1.5 text-xs font-bold text-white"
                    >
                      🧭 Navigate
                    </a>
                  </div>
                </>
              );
            })()}
          </div>
        )}
        {chatOpen === job.id && (
          <div className="mt-3">
            <ChatPanel bookingId={job.id} side="worker" heightClass="h-64" />
          </div>
        )}
        {job.status === "completed" && (() => {
          // The worker sees the same sum the customer sees, from their side.
          const ot = explainOvertime(job, worker);
          return ot ? <OvertimeBreakdown line={ot} perspective="worker" /> : null;
        })()}
        {job.status === "completed" && <CashReceived booking={job} />}
        {job.status === "completed" && (
          outstandingBalance(job) > 0 ? (
            <p className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-2.5 text-[11px] font-bold leading-relaxed text-warn">
              ⏳ Final payment pending · {inr(outstandingBalance(job))}
              <span className="block font-semibold opacity-80">
                അവസാന പേയ്‌മെന്റ് ബാക്കി — ഉപഭോക്താവ് അടച്ചാൽ ഉടൻ നിങ്ങളുടെ വരുമാനത്തിൽ ചേരും
              </span>
            </p>
          ) : (
            <p className="mt-3 rounded-xl border border-good-mid bg-good-light p-2.5 text-[11px] font-bold leading-relaxed text-good">
              ✅ Fully paid · {inr(job.quote.workerPayout)} yours
              <span className="block font-semibold opacity-80">പൂർണ്ണമായി അടച്ചു</span>
            </p>
          )
        )}
        {job.status === "completed" && <RateCustomer job={job} />}
      </Card>
    );
  };

  /** The queue of offers — rendered at the top when one is waiting. */
  const offersSection = (
        <section className="mb-5">
          <h2 className="mb-1 font-display text-base font-bold">
            🔔 {ml ? `${category.label} ജോലികൾ` : `${category.label} jobs near you`}{" "}
            {isOnline && incoming.length > 0 && <Tag color="red">{incoming.length}</Tag>}
          </h2>
          <p className="mb-3 text-[11px] text-dim">
            {ml ? `${category.label} ജോലികൾ മാത്രം — അടുത്തുള്ളത് ആദ്യം.` : `You only see ${category.label.toLowerCase()} requests — nearest first.`}
          </p>
          {!isOnline ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center">
              <p className="text-2xl">😴</p>
              <p className="mt-1 text-sm font-bold text-ink">
              {ml ? "നിങ്ങൾ ഓഫ്‌ലൈനാണ്" : "You're offline"}
            </p>
              <p className="mt-1 text-xs text-dim">
                {ml
                  ? `ഓൺലൈൻ ആയാൽ ${worker.city}-ലെ ജോലികൾ വരും.`
                  : `Go online to receive ${category.label.toLowerCase()} jobs near ${worker.city}.`}
              </p>
              <button
                onClick={() => setIsOnline(true)}
                className="mt-3 rounded-xl bg-good px-6 py-2.5 text-center text-white"
              >
                <span className="block text-sm font-bold">{ml ? "ഓൺലൈൻ ആകൂ →" : "Go Online →"}</span>
                <span className="block text-[10px] font-semibold opacity-90">ഓൺലൈൻ ആകുക</span>
              </button>
            </div>
          ) : incoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center">
              <p className="text-xs text-dim">
                {ml
                  ? "ഇപ്പോൾ ജോലികളൊന്നുമില്ല. ഒരാൾ ബുക്ക് ചെയ്യുന്ന നിമിഷം ഇവിടെ വരും."
                  : `No ${category.label.toLowerCase()} requests right now. New ones appear here the moment a customer books.`}
              </p>
              {!hasSampleData(bookings, applications) && (
                <button
                  onClick={() => loadSampleData()}
                  className="mt-3 rounded-xl bg-kaam px-5 py-2.5 text-xs font-bold text-white"
                >
                  🎬 {ml ? "സാമ്പിൾ ജോലികൾ കാണിക്കൂ" : "Load sample job requests"}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {incoming.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </section>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-page pb-10 shadow-[0_0_40px_rgba(0,0,0,0.15)] max-[430px]:shadow-none">
      <DispatchEngine />
      <JobAlarms viewer="worker" workerId={worker.id} />
      {/* Workers get the same day-before / hour-before nudge as customers. */}
      <BookingReminders workerId={worker.id} />
      <header className="bg-ink px-4 pt-6 pb-16 text-white">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-white/60 hover:text-white">
            ← KAAM
          </Link>
          {/* Demo "view as" picker — type a name rather than scroll 250. */}
          <ViewAsPicker
            workerId={workerId}
            onPick={setWorkerId}
            queueCountFor={queueCountFor}
          />
        </div>
        <div className="mt-4 flex items-start gap-3">
          <Avatar initials={worker.initials} size={56} online={isOnline} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-extrabold">{worker.name}</p>
            <p className="text-xs text-white/60">
              {category.icon} {category.label} · ⭐ {worker.rating}
            </p>
            <p className="text-xs text-white/60">📍 {worker.city}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {earnedBadges(worker).slice(0, 2).map((b) => (
                <Tag key={b.label} color="green">{b.label}</Tag>
              ))}
            </div>
          </div>
          <button
            onClick={() => setIsOnline(!isOnline)}
            aria-label={isOnline ? "Go offline" : "Go online"}
            className={`flex flex-col items-center rounded-2xl border-2 px-3 py-2 text-center transition-colors ${
              isOnline ? "border-good bg-good/20" : "border-white/30 bg-white/10"
            }`}
          >
            <span
              className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${
                isOnline ? "bg-good" : "bg-white/30"
              }`}
            >
              <span
                className={`absolute h-5 w-5 rounded-full bg-white transition-all ${
                  isOnline ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
            <span className="mt-1 text-[10px] font-extrabold leading-tight">
              {isOnline ? "ONLINE" : "OFFLINE"}
              <span className="block text-[9px] font-semibold opacity-80">
                {isOnline ? "ജോലിക്ക് തയ്യാർ" : "ഓഫ്‌ലൈൻ"}
              </span>
            </span>
          </button>
        </div>
        <Link
          href="/worker/signup"
          className="mt-4 block rounded-xl border border-white/20 bg-white/10 py-2.5 text-center text-xs font-bold text-white hover:bg-white/20"
        >
          🆕{" "}
          {ml
            ? "KAAM-ൽ പുതിയ ആളാണോ? രജിസ്റ്റർ ചെയ്ത് KYC അയക്കൂ →"
            : "New to KAAM? Sign up & upload your KYC →"}
        </Link>
      </header>

      <main className="-mt-10 px-4">
        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-card">
          {([
            {
              id: "jobs",
              label: `${ml ? "🧰 ജോലി" : "🧰 Jobs"}${incoming.length > 0 ? ` (${incoming.length})` : ""}`,
            },
            { id: "earnings", label: ml ? "💰 വരുമാനം" : "💰 Earnings" },
            { id: "status", label: ml ? "👤 വിവരങ്ങൾ" : "👤 Status" },
          ] as { id: WorkerTab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
                tab === t.id ? "bg-kaam text-white" : "text-mid"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "jobs" && (
        <>
        {/* New work, said loudly and first. A worker who cannot find the jobs
            has no reason to open the app again — and when they are offline the
            count is the whole argument for going back online. */}
        {incoming.length > 0 && (
          isOnline ? (
            <div className="mb-4 rounded-2xl border-2 border-kaam bg-kaam-light p-4">
              <p className="font-display text-xl font-extrabold text-kaam">
                🔔 {incoming.length}{" "}
                {ml
                  ? incoming.length === 1 ? "പുതിയ ജോലി" : "പുതിയ ജോലികൾ"
                  : incoming.length === 1 ? "new job for you" : "new jobs for you"}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {ml
                  ? "താഴെ കാണാം — അടുത്തുള്ളത് ആദ്യം. വേഗം മറുപടി നൽകൂ."
                  : "Just below — nearest first. Answer quickly to keep them."}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setIsOnline(true)}
              className="mb-4 w-full rounded-2xl border-2 border-good bg-good p-4 text-left text-white"
            >
              <span className="block font-display text-xl font-extrabold">
                🔔 {incoming.length}{" "}
                {ml
                  ? incoming.length === 1 ? "ജോലി കാത്തിരിക്കുന്നു" : "ജോലികൾ കാത്തിരിക്കുന്നു"
                  : incoming.length === 1 ? "job is waiting" : "jobs are waiting"}
              </span>
              <span className="mt-1 block text-sm font-semibold text-white/90">
                {ml ? "ഓൺലൈൻ ആകാൻ ഇവിടെ അമർത്തൂ →" : "Tap here to go online and see them →"}
              </span>
            </button>
          )
        )}

        <TodayMeter worker={worker} bookings={bookings} />
        <SurgeBanner worker={worker} />

        {/* Work first, in the order it needs a finger: an offer expires in two
            minutes, a running job does not, and a plan visit is due today.
            Everything else on this tab used to sit above all three. */}
        {incoming.length > 0 && isOnline && offersSection}

        {active.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 font-display text-base font-bold">
              🔧 {ml ? "നടക്കുന്ന ജോലികൾ" : "Active Jobs"}
            </h2>
            <div className="flex flex-col gap-3">
              {active.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>
        )}

        {/* A plan visit is work, so it belongs on the Jobs tab, not under money. */}
        <WorkerTodayVisits workerId={worker.id} />

        {!(incoming.length > 0 && isOnline) && offersSection}

        {completed.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 font-display text-base font-bold">
              ✅ {ml ? "പൂർത്തിയായവ" : "Completed"}
            </h2>
            <div className="flex flex-col gap-3">
              {completed.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>
        )}

        {/* Guidance, settings and encouragement — one tap away, never in front
            of the work. Nothing was removed; it all lives in here. */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="mb-3 w-full rounded-2xl border border-line bg-white py-3 text-sm font-bold text-mid"
        >
          {moreOpen
            ? ml ? "▲ മറയ്ക്കൂ" : "▲ Hide"
            : ml ? "⚙️ സഹായം, ക്രമീകരണങ്ങൾ, നുറുങ്ങുകൾ" : "⚙️ Help, settings & tips"}
        </button>

        {moreOpen && (
        <>
        <WorkerGuide />
        <WorkerMotivation />
        <AwayControl workerId={worker.id} />
        <SyncStatus className="mb-4" />
        <NotifyToggle className="mb-4 w-full justify-center" />

        {otherTrades.length > 0 && (
          <div className="mb-4 rounded-2xl border border-line bg-white p-3">
            <p className="mb-2 text-xs font-bold text-mid">
              📡 {ml ? "മറ്റ് ജോലികളിലെ ഡിമാൻഡ്:" : "Live demand in other trades — tap to preview that queue:"}
            </p>
            <div className="flex flex-wrap gap-2">
              {otherTrades.map((t) => (
                <button
                  key={t.cid}
                  onClick={() => t.sample && setWorkerId(t.sample.id)}
                  className="rounded-xl border border-line bg-surf px-3 py-1.5 text-xs font-bold text-ink"
                >
                  {t.cat.icon} {t.cat.label} ({t.count})
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="mb-5 grid grid-cols-3 divide-x divide-line text-center">
          {[
            { label: ml ? "ഈ സെഷനിൽ" : "Session earnings", value: inr(earned) },
            { label: ml ? "ചെയ്ത ജോലികൾ" : "Jobs completed", value: `${worker.jobsDone + completed.length}` },
            { label: ml ? "സ്വീകരിച്ച നിരക്ക്" : "Accept rate", value: `${Math.round(worker.acceptRate * 100)}%` },
          ].map((stat) => (
            <div key={stat.label} className="px-1">
              <p className="font-display text-base font-extrabold">{stat.value}</p>
              <p className="text-[10px] font-semibold text-mid">{stat.label}</p>
            </div>
          ))}
        </Card>

        <WorkerLeaderboard bookings={bookings} workerId={worker.id} />

        <WorkerTips />
        </>
        )}
        </>
        )}


        {tab === "earnings" && (
          <>
            <WorkerGoal worker={worker} bookings={bookings} />
            <WorkerPlans workerId={worker.id} />
            <WorkerEarnings bookings={bookings} workerId={worker.id} />
            <div className="mt-4">
              <WorkerReviews workerId={worker.id} />
            </div>
          </>
        )}

        {tab === "status" && (
          <>
            <WorkerPro worker={worker} />
            <WorkerRefer worker={worker} />
            <WorkerStatus worker={worker} application={myApplication} />
            <WorkerSupport worker={worker} />
          </>
        )}
      </main>
    </div>
  );
}
