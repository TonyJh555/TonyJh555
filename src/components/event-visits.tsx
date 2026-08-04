"use client";

import { useState } from "react";
import { sendMessage } from "@/lib/chat";
import { eventThreadId } from "@/lib/event-talk";
import {
  cancelVisit,
  confirmVisit,
  markVisitDone,
  proposeVisit,
  useEventVisits,
} from "@/lib/event-store";
import {
  awaitingConfirmation,
  VISIT_KINDS,
  visitKind,
  visitMessage,
  visitProblems,
  visitsFor,
  type VisitKind,
} from "@/lib/event-visits";
import type { EventRequest } from "@/lib/events";
import { useLanguage } from "@/components/language-provider";

/**
 * Arranging the tasting, on the platform, for nothing.
 *
 * Six chat messages and a misremembered time is how this normally goes. One
 * proposal and one confirmation is better for both sides — and it leaves a
 * record that the introduction happened here, which is the only thing that
 * makes the agreement's twelve-month clause worth anything.
 *
 * "Free" is on the screen because the moment a tasting looks like it might
 * cost something, it moves to a phone call and takes the booking with it.
 */
export function EventVisits({
  request,
  companyId,
  side,
}: {
  request: EventRequest;
  companyId: string;
  side: "customer" | "company";
}) {
  const ml = useLanguage().lang === "ml";
  const all = useEventVisits();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<VisitKind>("tasting");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:00");
  const [place, setPlace] = useState("");

  const mine = visitsFor(all, request.id, companyId).filter((v) => v.status !== "cancelled");
  const problems = visitProblems({ date, place }, request.date);
  const thread = eventThreadId(request.id, companyId);

  const propose = () => {
    if (problems.length > 0) return;
    const v = proposeVisit({
      requestId: request.id,
      companyId,
      kind,
      date,
      time,
      place: place.trim(),
      proposedBy: side,
    });
    sendMessage({
      bookingId: thread,
      sender: "system",
      text: `📅 ${side === "customer" ? "The customer" : "The company"} proposed: ${visitMessage(v)}`,
    });
    setOpen(false);
    setDate("");
    setPlace("");
  };

  const agree = (id: string) => {
    confirmVisit(id);
    const v = all.find((x) => x.id === id);
    sendMessage({
      bookingId: thread,
      sender: "system",
      text: `✅ Confirmed: ${v ? visitMessage(v) : "the meeting"}`,
    });
  };

  return (
    <div className="mt-1.5 rounded-lg border border-line bg-surf p-2.5">
      <p className="text-[11px] font-extrabold text-ink">
        📅 {ml ? "രുചി പരിശോധനയും സ്ഥലം കാണലും" : "Tastings & site visits"}
        <span className="ml-1 font-semibold text-good">{ml ? "· സൗജന്യം" : "· free"}</span>
      </p>

      {mine.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {mine.map((v) => {
            const k = visitKind(v.kind);
            const needsMe = awaitingConfirmation(v, side);
            return (
              <li key={v.id} className="rounded-lg border border-line bg-white p-2">
                <p className="text-[11px] font-bold text-ink">
                  {k.icon} {ml ? k.labelMl : k.label}
                </p>
                <p className="text-[10px] text-mid">
                  {v.date} · {v.time} · {v.place}
                </p>
                {v.status === "proposed" && !needsMe && (
                  <p className="mt-0.5 text-[10px] font-semibold text-warn">
                    {ml ? "മറുപടിക്കായി കാത്തിരിക്കുന്നു" : "Waiting for them to confirm"}
                  </p>
                )}
                {needsMe && (
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      onClick={() => agree(v.id)}
                      className="flex-1 rounded-lg bg-good py-1.5 text-[11px] font-extrabold text-white"
                    >
                      {ml ? "ശരി, വരാം" : "Yes, that works"}
                    </button>
                    <button
                      onClick={() => cancelVisit(v.id)}
                      className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-mid"
                    >
                      {ml ? "വേണ്ട" : "No"}
                    </button>
                  </div>
                )}
                {v.status === "confirmed" && (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-good">
                      ✅ {ml ? "ഉറപ്പിച്ചു" : "Confirmed"}
                    </span>
                    <button
                      onClick={() => markVisitDone(v.id)}
                      className="text-[10px] font-bold text-info"
                    >
                      {ml ? "കഴിഞ്ഞു എന്ന് അടയാളപ്പെടുത്തൂ" : "Mark as done"}
                    </button>
                  </div>
                )}
                {v.status === "done" && (
                  <span className="mt-1 block text-[10px] font-extrabold text-mid">
                    ✔ {ml ? "കഴിഞ്ഞു" : "Done"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-1.5 w-full rounded-lg border border-info-mid bg-info-light py-1.5 text-[11px] font-bold text-info"
        >
          + {ml ? "ഒരു കൂടിക്കാഴ്ച നിർദ്ദേശിക്കൂ" : "Propose a tasting or visit"}
        </button>
      ) : (
        <div className="mt-2">
          <div className="flex flex-col gap-1">
            {VISIT_KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold ${
                  kind === k.id ? "border-info bg-info text-white" : "border-line bg-white text-ink"
                }`}
              >
                {k.icon} {ml ? k.labelMl : k.label}
                <span className="block text-[10px] font-semibold opacity-80">
                  {ml ? k.hintMl : k.hint}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input
              type="date"
              value={date}
              max={request.date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px]"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-24 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px]"
            />
          </div>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={ml ? "എവിടെ കാണണം?" : "Where should you meet?"}
            className="mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-info"
          />
          {problems.length > 0 && (date || place) && (
            <ul className="mt-1 space-y-0.5">
              {problems.map((p) => (
                <li key={p.field} className="text-[10px] font-semibold text-kaam">
                  · {ml ? p.messageMl : p.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1.5 flex gap-1.5">
            <button
              onClick={propose}
              disabled={problems.length > 0}
              className="flex-1 rounded-lg bg-info py-2 text-[11px] font-extrabold text-white disabled:opacity-40"
            >
              {ml ? "നിർദ്ദേശിക്കൂ" : "Propose it"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-[11px] font-bold text-mid"
            >
              {ml ? "വേണ്ട" : "Back"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
