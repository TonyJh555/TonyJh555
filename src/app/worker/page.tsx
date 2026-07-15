"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { getTenure } from "@/lib/pricing";
import { updateBooking, useBookings } from "@/lib/bookings";
import { sendMessage, unreadCount, useChatMessages } from "@/lib/chat";
import { formatSchedule, inr } from "@/lib/format";
import { directionsLink, geocode, haversineKm, jitter } from "@/lib/geo";
import type { Booking } from "@/lib/types";
import { Avatar, Card, Tag } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { ChatPanel } from "@/components/chat-panel";
import { LiveMap } from "@/components/live-map";

/** Seconds a new job offer stays "hot" before it may go to another worker. */
const OFFER_WINDOW_SECONDS = 180;

/** Swiggy/Uber-style accept countdown for a job offer. */
function OfferCountdown({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = (now - new Date(createdAt).getTime()) / 1000;
  const left = Math.max(0, Math.round(OFFER_WINDOW_SECONDS - elapsed));
  const fraction = left / OFFER_WINDOW_SECONDS;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className={left > 0 ? "text-kaam" : "text-dim"}>
          {left > 0
            ? `⏱ Respond in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
            : "⏱ Offer window over — respond now before it goes to another worker"}
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
 * Worker portal (demo). In production each worker signs in with OTP and
 * sees only their own jobs; here a "view as" selector stands in for auth.
 */
export default function WorkerDashboard() {
  const [workerId, setWorkerId] = useState(WORKERS[0].id);
  const [isOnline, setIsOnline] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState<string | null>(null);
  const bookings = useBookings();
  const chatMessages = useChatMessages();

  const worker = WORKERS.find((w) => w.id === workerId) ?? WORKERS[0];
  const category = getCategory(worker.categoryId);
  const myJobs = bookings.filter((b) => b.workerId === worker.id);
  const incoming = myJobs.filter((b) => b.status === "requested");
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
          </div>
          <p className="text-sm font-extrabold text-good">{inr(job.quote.workerPayout)}</p>
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          <p className="rounded-lg bg-surf px-2.5 py-1.5 text-xs font-bold text-ink">
            📍 {job.address ?? "Kochi"} ·{" "}
            <span className="text-mid">
              ~{WORKERS.find((w) => w.id === job.workerId)?.distanceKm ?? 2} km from you
            </span>
          </p>
          <p className="rounded-lg bg-info-light px-2.5 py-1.5 text-xs font-bold text-info">
            🕐 Customer&apos;s requested time: {formatSchedule(job.schedule)}
          </p>
        </div>
        {job.status === "requested" && <OfferCountdown createdAt={job.createdAt} />}

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
                onClick={() => updateBooking(job.id, { status: "cancelled" })}
                className="rounded-xl border border-kaam-mid bg-kaam-light px-3 py-2.5 text-xs font-bold text-kaam"
              >
                ✕
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
              const customer = jitter(geocode(job.address, worker.city), job.id, 3);
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
      </Card>
    );
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-page pb-10 shadow-[0_0_40px_rgba(0,0,0,0.15)] max-[430px]:shadow-none">
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
      </main>
    </div>
  );
}
