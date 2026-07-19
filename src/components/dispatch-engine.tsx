"use client";

import { useEffect } from "react";
import { WORKERS } from "@/data/workers";
import { updateBooking, useBookings } from "@/lib/bookings";
import { advanceDispatch } from "@/lib/dispatch";
import { isAway, useAwayMap } from "@/lib/availability";
import { presenceOnline, usePresence } from "@/lib/presence";
import { sendMessage } from "@/lib/chat";

/**
 * The dispatch heartbeat. Watches live job requests and, when a worker's
 * offer window runs out, moves the job to the next nearest available worker
 * (see src/lib/dispatch.ts). Mounted on both sides of the marketplace so the
 * cascade runs whichever screen is open. In production this is a server-side
 * scheduler; the client tick is the demo equivalent.
 */
export function DispatchEngine() {
  const bookings = useBookings();
  const awayMap = useAwayMap();
  const presence = usePresence();

  useEffect(() => {
    const tick = () => {
      for (const b of bookings) {
        const patch = advanceDispatch(b, WORKERS, {
          isUnavailable: (id) => isAway(awayMap, id),
          isOnline: (w) => presenceOnline(presence, w),
        });
        if (!patch) continue;
        updateBooking(b.id, patch);
        if (patch.workerId && patch.workerName) {
          sendMessage({
            bookingId: b.id,
            sender: "system",
            text: `⏱ ${b.workerName.split(" ")[0]} didn't respond in time — your request moved to ${patch.workerName.split(" ")[0]}, the next nearest available worker 🔄`,
          });
        }
      }
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [bookings, awayMap, presence]);

  return null;
}
