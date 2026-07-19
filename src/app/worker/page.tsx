"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { getTenure } from "@/lib/pricing";
import { updateBooking, useBookings } from "@/lib/bookings";
import { customerRatingFor } from "@/lib/customer-rating";
import { useAwayMap, setAway, isAway, awayUntil } from "@/lib/availability";
import { sendMessage, unreadCount, useChatMessages } from "@/lib/chat";
import { formatSchedule, inr } from "@/lib/format";
import { directionsLink, geocode, haversineKm, jitter } from "@/lib/geo";
import type { Booking } from "@/lib/types";
import { Avatar, Card, Tag } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { ChatPanel } from "@/components/chat-panel";
import { LiveMap } from "@/components/live-map";
import { SyncStatus } from "@/components/sync-status";
import { NotifyToggle } from "@/components/notify-toggle";
import { notify } from "@/lib/notify";
import { refund } from "@/lib/wallet";
import { useApplications, useMyApplicationId } from "@/lib/applications";
import { WorkerMotivation, WorkerTips } from "@/components/worker-motivation";
import { WorkerEarnings } from "@/components/worker-earnings";
import { WorkerPlans } from "@/components/worker-plans";
import { WorkerReviews } from "@/components/worker-reviews";
import { WorkerLeaderboard } from "@/components/worker-leaderboard";
import { WorkerSupport } from "@/components/worker-support";
import { WorkerStatus } from "@/components/worker-status";
import { WorkerPro } from "@/components/worker-pro";
import { DispatchEngine } from "@/components/dispatch-engine";
import { jobCoords, OFFER_WINDOW_SECONDS, reassign } from "@/lib/dispatch";

/**
 * Swiggy/Uber-style accept countdown. Runs off the booking's live dispatch
 * window — when it hits zero the DispatchEngine really does move the job to
 * the next nearest worker (legacy bookings without dispatch state fall back
 * to a soft window from creation time).
 */
function OfferCountdown({ job }: { job: Booking }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (job.dispatch && job.dispatch.offerExpiresAt === null) {
    return (
      <p className="mt-2 text-[10px] font-bold text-mid">
        🟢 Open offer — you&apos;re the nearest available worker; respond when free
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
            ? `⏱ Respond in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} — then it goes to the next nearest worker`
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
  const [isOnline, setIsOnline] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkerTab>("jobs");
  const bookings = useBookings();
  const chatMessages = useChatMessages();
  const applications = useApplications();
  const myAppId = useMyApplicationId();
  const myApplication = applications.find((a) => a.id === myAppId);
  const awayMap = useAwayMap();

  const worker = WORKERS.find((w) => w.id === workerId) ?? WORKERS[0];
  const category = getCategory(worker.categoryId);
  const myJobs = bookings.filter((b) => b.workerId === worker.id);
  const incoming = myJobs.filter((b) => b.status === "requested");

  // Pending requests per worker, so the "View as" selector can show where the
  // job actually landed (a booking goes to the one worker the customer picked).
  const pendingByWorker = bookings.reduce<Record<string, number>>((acc, b) => {
    if (b.status === "requested") acc[b.workerId] = (acc[b.workerId] ?? 0) + 1;
    return acc;
  }, {});
  const otherWorkersWithPending = WORKERS.filter(
    (w) => w.id !== worker.id && (pendingByWorker[w.id] ?? 0) > 0,
  );

  // Fire a device notification when a job request arrives, so the worker is
  // alerted even if the app is backgrounded (Swiggy/Uber pattern). Keyed on
  // booking + holder, so a job cascading to a new worker alerts them too.
  const seenRequests = useRef<Set<string> | null>(null);
  useEffect(() => {
    const requested = bookings.filter((b) => b.status === "requested");
    if (seenRequests.current === null) {
      seenRequests.current = new Set(requested.map((b) => `${b.id}:${b.workerId}`));
      return;
    }
    for (const b of requested) {
      const key = `${b.id}:${b.workerId}`;
      if (seenRequests.current.has(key)) continue;
      seenRequests.current.add(key);
      notify(
        (b.dispatch?.attempt ?? 1) > 1 ? "📡 Job dispatched to you" : "🔔 New job request",
        `${b.subService} for ${b.workerName.split(" ")[0]} · ${b.address ?? "Kerala"}`,
        "/worker",
      );
    }
  }, [bookings]);
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
              ~{Math.round(haversineKm(worker.coords, jobCoords(job)) * 10) / 10} km from you
            </span>
          </p>
          {job.status === "requested" && (job.dispatch?.attempt ?? 1) > 1 && (
            <p className="rounded-lg bg-kaam-light px-2.5 py-1.5 text-[11px] font-bold text-kaam">
              📡 Dispatched to you — you&apos;re now the nearest available{" "}
              {getCategory(job.categoryId).label.toLowerCase()} for this job
            </p>
          )}
          <p className="rounded-lg bg-info-light px-2.5 py-1.5 text-xs font-bold text-info">
            🕐 Customer&apos;s requested time: {formatSchedule(job.schedule)}
          </p>
        </div>
        {job.status === "requested" && <OfferCountdown job={job} />}

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

        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          {job.status === "requested" && (
            <>
              <button
                onClick={() => {
                  updateBooking(job.id, { status: "accepted" });
                  sendMessage({
                    bookingId: job.id,
                    sender: "system",
                    text:
                      job.schedule?.when === "scheduled"
                        ? `${worker.name.split(" ")[0]} confirmed your slot ✅ ${formatSchedule(job.schedule)}`
                        : `${worker.name.split(" ")[0]} accepted the job ✅ ETA ~${worker.etaMinutes} min`,
                  });
                }}
                className="flex-1 rounded-xl bg-good py-2.5 text-xs font-bold text-white"
              >
                ✓ Accept{job.schedule?.when === "scheduled" ? " & Confirm Time" : " Job"}
              </button>
              <button
                onClick={() => {
                  updateBooking(job.id, { status: "reschedule" });
                  sendMessage({
                    bookingId: job.id,
                    sender: "system",
                    text: `${worker.name.split(" ")[0]} can't make ${formatSchedule(job.schedule)} 🕐 Please pick another time from My Bookings.`,
                  });
                }}
                className="flex-1 rounded-xl border border-warn-mid bg-warn-light py-2.5 text-xs font-bold text-warn"
              >
                🕐 Can&apos;t make it
              </button>
              <button
                onClick={() => {
                  // Uber-style decline: the job cascades to the next nearest
                  // available worker instead of dying with this one.
                  const patch = reassign(job, WORKERS, {
                    isUnavailable: (id) => isAway(awayMap, id),
                  });
                  if (patch) {
                    updateBooking(job.id, patch);
                    sendMessage({
                      bookingId: job.id,
                      sender: "system",
                      text: `${worker.name.split(" ")[0]} can't take this job — your request moved to ${patch.workerName!.split(" ")[0]}, the next nearest available worker 🔄`,
                    });
                  } else {
                    updateBooking(job.id, {
                      status: "cancelled",
                      cancelReason: "No nearby worker available",
                    });
                    // Full refund — the customer did nothing wrong.
                    if (job.paymentMethod !== "cash") {
                      refund(job.quote.totalUserPays, `Refund · no worker available for ${job.subService}`);
                    }
                    sendMessage({
                      bookingId: job.id,
                      sender: "system",
                      text: "😔 No other worker is available nearby right now — the booking was cancelled and your full payment refunded to KAAM Cash.",
                    });
                  }
                }}
                title="Decline — passes to the next nearest worker"
                className="rounded-xl border border-kaam-mid bg-kaam-light px-3 py-2.5 text-xs font-bold text-kaam"
              >
                ↪ Pass
              </button>
            </>
          )}
          {job.status === "accepted" && (
            <button
              onClick={() => {
                updateBooking(job.id, { status: "in_progress" });
                sendMessage({ bookingId: job.id, sender: "system", text: "OTP verified — job started 🔧" });
              }}
              className="flex-1 rounded-xl bg-info py-2.5 text-xs font-bold text-white"
            >
              🔐 Verify OTP {job.startCode} & Start Job
            </button>
          )}
          {job.status === "in_progress" && (
            <button
              onClick={() => {
                updateBooking(job.id, { status: "completed" });
                sendMessage({ bookingId: job.id, sender: "system", text: "Job completed 🏁 Please rate your worker." });
              }}
              className="flex-1 rounded-xl bg-good py-2.5 text-xs font-bold text-white"
            >
              🏁 Slide to Finish — Complete Job
            </button>
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
        {job.status === "completed" && <RateCustomer job={job} />}
      </Card>
    );
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-page pb-10 shadow-[0_0_40px_rgba(0,0,0,0.15)] max-[430px]:shadow-none">
      <DispatchEngine />
      <header className="bg-ink px-4 pt-6 pb-16 text-white">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-white/60 hover:text-white">
            ← KAAM
          </Link>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold"
          >
            {WORKERS.map((w) => (
              <option key={w.id} value={w.id} className="text-ink">
                View as: {w.name}
                {(pendingByWorker[w.id] ?? 0) > 0 ? ` (${pendingByWorker[w.id]} new 🔔)` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Avatar initials={worker.initials} size={56} online={isOnline} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">{worker.name}</p>
            <p className="text-xs text-white/60">
              {category.icon} {category.label} · ⭐ {worker.rating} ({worker.reviewCount}) · 📍{" "}
              {worker.city}
            </p>
            <div className="mt-1 flex gap-1.5">
              {worker.badges.slice(0, 2).map((b) => (
                <Tag key={b} color="green">{b}</Tag>
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
            <span className="mt-1 text-[10px] font-extrabold">
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </button>
        </div>
        <Link
          href="/worker/signup"
          className="mt-4 block rounded-xl border border-white/20 bg-white/10 py-2.5 text-center text-xs font-bold text-white hover:bg-white/20"
        >
          🆕 New to KAAM? Sign up & upload your KYC →
        </Link>
      </header>

      <main className="-mt-10 px-4">
        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-card">
          {([
            { id: "jobs", label: "🧰 Jobs" },
            { id: "earnings", label: "💰 Earnings" },
            { id: "status", label: "👤 Status" },
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
        <WorkerMotivation />
        <AwayControl workerId={worker.id} />
        <SyncStatus className="mb-4" />
        <NotifyToggle className="mb-4 w-full justify-center" />

        {otherWorkersWithPending.length > 0 && (
          <div className="mb-4 rounded-2xl border border-kaam-mid bg-kaam-light p-3">
            <p className="mb-2 text-xs font-bold text-kaam">
              🔔 New request{otherWorkersWithPending.reduce((n, w) => n + pendingByWorker[w.id], 0) > 1 ? "s" : ""} waiting for{" "}
              {otherWorkersWithPending.length > 1 ? "other workers" : "another worker"} — tap to view:
            </p>
            <div className="flex flex-wrap gap-2">
              {otherWorkersWithPending.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWorkerId(w.id)}
                  className="rounded-xl border border-kaam-mid bg-white px-3 py-1.5 text-xs font-bold text-kaam"
                >
                  {w.name.split(" ")[0]} ({pendingByWorker[w.id]} new)
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="mb-5 grid grid-cols-3 divide-x divide-line text-center">
          {[
            { label: "Session earnings", value: inr(earned) },
            { label: "Jobs completed", value: `${worker.jobsDone + completed.length}` },
            { label: "Accept rate", value: `${Math.round(worker.acceptRate * 100)}%` },
          ].map((stat) => (
            <div key={stat.label} className="px-1">
              <p className="font-display text-base font-extrabold">{stat.value}</p>
              <p className="text-[10px] font-semibold text-mid">{stat.label}</p>
            </div>
          ))}
        </Card>

        <WorkerLeaderboard bookings={bookings} workerId={worker.id} />

        <WorkerTips />

        <section className="mb-5">
          <h2 className="mb-3 font-display text-base font-bold">
            🔔 Job Alerts{" "}
            {isOnline && incoming.length > 0 && <Tag color="red">{incoming.length} new</Tag>}
          </h2>
          {!isOnline ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center">
              <p className="text-2xl">😴</p>
              <p className="mt-1 text-sm font-bold text-ink">You&apos;re offline</p>
              <p className="mt-1 text-xs text-dim">
                Go online to receive job offers near {worker.city}.
              </p>
              <button
                onClick={() => setIsOnline(true)}
                className="mt-3 rounded-xl bg-good px-6 py-2.5 text-xs font-bold text-white"
              >
                Go Online →
              </button>
            </div>
          ) : incoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-xs text-dim">
              No new requests. Book {worker.name.split(" ")[0]} from the{" "}
              <Link href="/app" className="font-bold text-kaam">user app</Link> to see a
              live job alert here.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {incoming.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </section>

        {active.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 font-display text-base font-bold">🔧 Active Jobs</h2>
            <div className="flex flex-col gap-3">
              {active.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-base font-bold">✅ Completed</h2>
            <div className="flex flex-col gap-3">
              {completed.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </section>
        )}
        </>
        )}

        {tab === "earnings" && (
          <>
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
            <WorkerStatus worker={worker} application={myApplication} />
            <WorkerSupport worker={worker} />
          </>
        )}
      </main>
    </div>
  );
}
