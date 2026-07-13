"use client";

import { useState } from "react";
import Link from "next/link";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { getTenure } from "@/lib/pricing";
import { updateBooking, useBookings } from "@/lib/bookings";
import { sendMessage, unreadCount, useChatMessages } from "@/lib/chat";
import { inr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { Avatar, Card, Tag } from "@/components/ui";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { ChatPanel } from "@/components/chat-panel";

/**
 * Worker portal (demo). In production each worker signs in with OTP and
 * sees only their own jobs; here a "view as" selector stands in for auth.
 */
export default function WorkerDashboard() {
  const [workerId, setWorkerId] = useState(WORKERS[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
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
                  sendMessage({ bookingId: job.id, sender: "system", text: `${worker.name.split(" ")[0]} accepted the job ✅ ETA ~${worker.etaMinutes} min` });
                }}
                className="flex-1 rounded-xl bg-good py-2.5 text-xs font-bold text-white"
              >
                ✓ Accept Job
              </button>
              <button
                onClick={() => updateBooking(job.id, { status: "cancelled" })}
                className="flex-1 rounded-xl border border-kaam-mid bg-kaam-light py-2.5 text-xs font-bold text-kaam"
              >
                ✕ Decline
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
        </div>
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
          <Avatar initials={worker.initials} size={56} online={worker.online} />
          <div>
            <p className="font-display text-lg font-extrabold">{worker.name}</p>
            <p className="text-xs text-white/60">
              {category.icon} {category.label} · ⭐ {worker.rating} ({worker.reviewCount})
            </p>
            <div className="mt-1 flex gap-1.5">
              {worker.badges.slice(0, 2).map((b) => (
                <Tag key={b} color="green">{b}</Tag>
              ))}
            </div>
          </div>
        </div>
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
            🔔 Job Alerts {incoming.length > 0 && <Tag color="red">{incoming.length} new</Tag>}
          </h2>
          {incoming.length === 0 ? (
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
