import type { Booking, BookingStatus } from "@/lib/types";

/**
 * Live order status timeline — the Domino's pizza-tracker / Swiggy stepper.
 * Turns an opaque status into a reassuring visual journey.
 */

const STEPS: { key: BookingStatus; label: string; icon: string; sub: string }[] = [
  { key: "requested", label: "Booking placed", icon: "📋", sub: "Waiting for the worker to confirm" },
  { key: "accepted", label: "Worker confirmed", icon: "✅", sub: "Your worker is assigned and on the way" },
  { key: "in_progress", label: "Work in progress", icon: "🔧", sub: "The job has started" },
  { key: "completed", label: "Completed", icon: "🎉", sub: "Job done — please rate your worker" },
];

const ORDER: BookingStatus[] = ["requested", "accepted", "in_progress", "completed"];

export function StatusTimeline({ booking }: { booking: Booking }) {
  if (booking.status === "cancelled" || booking.status === "reschedule") return null;
  const currentIndex = ORDER.indexOf(booking.status);

  return (
    <div className="mt-3">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                  done
                    ? "bg-good text-white"
                    : active
                      ? "bg-kaam text-white ring-4 ring-kaam-mid"
                      : "bg-surf text-dim"
                }`}
              >
                {done ? "✓" : step.icon}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 ${i < currentIndex ? "bg-good" : "bg-line"}`} style={{ minHeight: 22 }} />
              )}
            </div>
            <div className={`pb-4 ${active || done ? "" : "opacity-50"}`}>
              <p className={`text-sm font-bold ${active ? "text-kaam" : "text-ink"}`}>
                {step.label}
                {active && <span className="ml-2 animate-pulse text-[10px] text-kaam">● live</span>}
              </p>
              <p className="text-[11px] text-mid">{step.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
