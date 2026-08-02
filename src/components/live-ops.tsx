"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types";
import { currentRoster } from "@/lib/roster";
import { getCategory } from "@/data/categories";
import { opsSnapshot } from "@/lib/ops";
import { presenceOnline, usePresence } from "@/lib/presence";
import { isAway, useAwayMap } from "@/lib/availability";
import { Card } from "@/components/ui";

/**
 * Live-Ops command center — the real-time marketplace "mission control" an
 * ops team watches: jobs hunting for a worker now, en route, in progress,
 * who's online, and which districts are surging. Auto-refreshes every few
 * seconds off the same live data the rest of the app runs on.
 */
export function LiveOps({ bookings }: { bookings: Booking[] }) {
  const presence = usePresence();
  const awayMap = useAwayMap();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const s = opsSnapshot(bookings, currentRoster(), {
    isOnline: (w) => presenceOnline(presence, w),
    isAway: (id) => isAway(awayMap, id),
    now: new Date(now),
  });

  const statusMeta: Record<string, { label: string; cls: string }> = {
    requested: { label: "Hunting", cls: "bg-warn-light text-warn" },
    accepted: { label: "En route", cls: "bg-info-light text-info" },
    in_progress: { label: "Working", cls: "bg-good-light text-good" },
  };

  const kpis = [
    { label: "Hunting", value: s.hunting, hint: s.avgWaitMinutes ? `avg ${s.avgWaitMinutes}m wait` : "—", tone: "text-warn" },
    { label: "En route", value: s.enRoute, hint: "worker on the way", tone: "text-info" },
    { label: "Working", value: s.working, hint: "in progress", tone: "text-good" },
    { label: "Online workers", value: s.onlineWorkers, hint: s.awayWorkers ? `${s.awayWorkers} away` : "available", tone: "text-ink" },
  ];

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-bold">🛰️ Live Ops</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-good">
          <span className="h-2 w-2 animate-pulse rounded-full bg-good" /> Live · updates every 5s
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-[10px] font-bold tracking-wide text-dim uppercase">{k.label}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${k.tone}`}>{k.value}</p>
            <p className="text-[10px] text-mid">{k.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full bg-surf px-2.5 py-1 font-bold text-mid">
          ✅ {s.completedToday} completed today
        </span>
        <span className="rounded-full bg-surf px-2.5 py-1 font-bold text-mid">
          ✖️ {s.cancelledToday} cancelled today
        </span>
        {s.surgingDistricts.length > 0 && (
          <span className="rounded-full bg-warn-light px-2.5 py-1 font-bold text-warn">
            ⚡ Surging: {s.surgingDistricts.join(", ")}
          </span>
        )}
      </div>

      <Card className="p-0">
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-bold">📡 Active jobs · most urgent first</p>
        </div>
        {s.activeJobs.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-dim">
            No active jobs right now. New requests appear here the moment a customer books.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {s.activeJobs.slice(0, 30).map((j) => {
              const cat = getCategory(j.categoryId);
              const m = statusMeta[j.status];
              return (
                <div key={j.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">
                      {cat.icon} {cat.label}
                      {j.status === "requested" && j.attempt > 1 && (
                        <span className="ml-1 text-[10px] font-semibold text-warn">
                          · offer #{j.attempt}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[10px] text-dim">
                      {j.district ?? "—"} · {j.address ?? "—"} ·{" "}
                      {j.status === "requested" ? j.workerName.split(" ")[0] : j.workerName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] font-semibold text-mid tabular-nums">
                      {j.ageMinutes}m
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.cls}`}>
                      {m.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
