"use client";

import { useEffect } from "react";
import { currentRoster, findWorker } from "@/lib/roster";
import { dailyCapMinutes } from "@/lib/site-settings";
import { updateBooking, useBookings } from "@/lib/bookings";
import { advanceDispatch, initialDispatch } from "@/lib/dispatch";
import {
  cashClaimExpired,
  completionDue,
  confirmWindowLapsed,
  finalPaidPatch,
} from "@/lib/payment-policy";
import { clockTime, completionExpired } from "@/lib/completion";
import { settleBooking } from "@/lib/metered";
import { sendInvoiceEmail } from "@/lib/invoice";
import { isAway, useAwayMap } from "@/lib/availability";
import { presenceOnline, usePresence } from "@/lib/presence";
import { sendMessage } from "@/lib/chat";

/**
 * The booking heartbeat. Watches live jobs and handles the things that must
 * happen on a clock: closing a job whose completion was never confirmed,
 * releasing one that was never paid for, and ending the offer countdown.
 *
 * It deliberately does NOT hand a request to a different worker — the
 * customer chose theirs (see src/lib/dispatch.ts). Mounted on both sides so
 * the clock runs whichever screen is open; in production this is a
 * server-side scheduler.
 */
export function DispatchEngine() {
  const bookings = useBookings();
  const awayMap = useAwayMap();
  const presence = usePresence();

  useEffect(() => {
    const tick = () => {
      for (const b of bookings) {
        // Work was declared finished but the other side never confirmed.
        // The clock stopped when it was raised, so the amount is already
        // frozen — finalising now can't change what anyone pays.
        if (completionExpired(b)) {
          const w = findWorker(b.workerId);
          const endedAt = b.completion!.at;
          const settled = w ? settleBooking(b, w, new Date(endedAt), dailyCapMinutes()) : null;
          const due = completionDue(b, settled?.settlement.extraUserPays ?? 0);
          updateBooking(b.id, {
            status: "completed",
            completedAt: endedAt,
            completion: undefined,
            ...(settled ? { quote: settled.quote, settlement: settled.settlement } : {}),
            // Only a real payment stamps `balancePaidAt` — an auto-closed job
            // with a balance still owes it (the payment screen collects).
            ...(b.payment
              ? {
                  payment: {
                    ...b.payment,
                    balanceDue: due,
                    ...(due === 0 ? { balancePaidAt: endedAt } : {}),
                  },
                }
              : {}),
          });
          sendMessage({
            bookingId: b.id,
            sender: "system",
            text:
              `✅ Work completed at ${clockTime(endedAt)}` +
              (settled ? ` · ${settled.settlement.billedMinutes} min billed` : "") +
              ". Closed automatically — the other side didn't confirm, but billing had already stopped, so the amount is unchanged.",
          });
          // An auto-closed job still produces a proper invoice for both sides —
          // once there's nothing left to collect (otherwise it follows payment).
          if (due === 0) {
            sendInvoiceEmail({
              booking: b,
              quote: settled?.quote,
              settlement: settled?.settlement,
              completedAt: endedAt,
            });
          }
          continue;
        }

        // A cash claim the worker never answered. Settling it their way is
        // the safe default: the customer already said they paid, and leaving
        // it open would freeze the worker's earnings indefinitely.
        if (cashClaimExpired(b)) {
          updateBooking(b.id, finalPaidPatch(b));
          sendMessage({
            bookingId: b.id,
            sender: "system",
            text: "💚 Settled automatically — the cash payment wasn't disputed. Raise a support request if anything is wrong.",
          });
          sendInvoiceEmail({
            booking: b,
            quote: b.quote,
            settlement: b.settlement,
            completedAt: b.completedAt ?? new Date().toISOString(),
          });
          continue;
        }

        // Accepted but never paid for → release it. The worker is freed (they
        // were told not to travel yet) and the request goes back to them, not
        // to a stranger: the customer chose this person.
        if (confirmWindowLapsed(b)) {
          updateBooking(b.id, {
            status: "requested",
            payment: { ...b.payment!, confirmBy: undefined },
            dispatch: initialDispatch(new Date(), b),
          });
          sendMessage({
            bookingId: b.id,
            sender: "system",
            text: `⏱ Payment wasn't completed in time, so the job was released. Your request is with ${b.workerName.split(" ")[0]} again — pay to confirm when they accept, or pick another worker.`,
          });
          continue;
        }

        // The chosen worker's window ran out. The job stays theirs — we only
        // stop the countdown and tell the customer, who decides what next.
        const patch = advanceDispatch(b, currentRoster(), {
          isUnavailable: (id) => isAway(awayMap, id),
          isOnline: (w) => presenceOnline(presence, w),
        });
        if (!patch) continue;
        updateBooking(b.id, patch);
        sendMessage({
          bookingId: b.id,
          sender: "system",
          text: `⏱ ${b.workerName.split(" ")[0]} hasn't replied yet. Your request is still with them — you can keep waiting, or choose another worker who's free right now.`,
        });
      }
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [bookings, awayMap, presence]);

  return null;
}
