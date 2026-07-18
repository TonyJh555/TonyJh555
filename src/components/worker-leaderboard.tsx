"use client";

import { workerLeaderboard } from "@/lib/analytics";
import { inr } from "@/lib/format";
import { Card } from "@/components/ui";
import type { Booking } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Monthly earnings leaderboard — top 3 plus the current worker's own rank. */
export function WorkerLeaderboard({ bookings, workerId }: { bookings: Booking[]; workerId: string }) {
  const board = workerLeaderboard(bookings, "month");
  if (board.length === 0) return null;

  const rank = board.findIndex((r) => r.workerId === workerId);
  const top = board.slice(0, 3);
  const me = rank >= 0 ? board[rank] : null;

  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-sm font-bold">🏆 Top earners this month</h3>
        <span className="text-[10px] font-semibold text-dim">{board.length} active</span>
      </div>
      <div className="flex flex-col gap-2">
        {top.map((r, i) => (
          <div
            key={r.workerId}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
              r.workerId === workerId ? "bg-good-light" : "bg-surf"
            }`}
          >
            <span className="w-6 text-center text-lg">{MEDALS[i]}</span>
            <span className="flex-1 truncate text-xs font-bold">
              {r.workerName.split(" ")[0]}
              {r.workerId === workerId && <span className="text-good"> · you</span>}
            </span>
            <span className="text-xs font-extrabold text-good">{inr(r.payout)}</span>
          </div>
        ))}
      </div>
      {me && rank > 2 && (
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-good-light px-3 py-2">
          <span className="w-6 text-center text-xs font-extrabold text-mid">#{rank + 1}</span>
          <span className="flex-1 text-xs font-bold">You</span>
          <span className="text-xs font-extrabold text-good">{inr(me.payout)}</span>
        </div>
      )}
      {me && rank > 0 && (
        <p className="mt-2 text-[11px] font-semibold text-mid">
          💪 {inr(board[rank - 1].payout - me.payout + 1)} more to climb to #{rank}.
        </p>
      )}
    </Card>
  );
}
