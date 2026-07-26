"use client";

import type { Booking, BookingStatus } from "@/lib/types";
import { dispatchPhase } from "@/lib/dispatch";
import { useLanguage } from "@/components/language-provider";

/**
 * Live order status timeline — the Domino's pizza-tracker / Swiggy stepper.
 * Turns an opaque status into a reassuring visual journey. Bilingual (EN/ML).
 */

const STEPS: { key: BookingStatus; label: string; labelMl: string; icon: string; sub: string; subMl: string }[] = [
  { key: "requested", label: "Booking placed", labelMl: "ബുക്കിംഗ് നൽകി", icon: "📋", sub: "Waiting for the worker to confirm", subMl: "തൊഴിലാളി സ്ഥിരീകരിക്കാൻ കാത്തിരിക്കുന്നു" },
  { key: "accepted", label: "Worker confirmed", labelMl: "തൊഴിലാളി സ്ഥിരീകരിച്ചു", icon: "✅", sub: "Your worker is assigned and on the way", subMl: "തൊഴിലാളിയെ നിയോഗിച്ചു, വരുന്ന വഴിയിൽ" },
  { key: "in_progress", label: "Work in progress", labelMl: "ജോലി നടക്കുന്നു", icon: "🔧", sub: "The job has started", subMl: "ജോലി തുടങ്ങി" },
  { key: "completed", label: "Completed", labelMl: "പൂർത്തിയായി", icon: "🎉", sub: "Job done — please rate your worker", subMl: "ജോലി കഴിഞ്ഞു — തൊഴിലാളിയെ റേറ്റ് ചെയ്യൂ" },
];

const ORDER: BookingStatus[] = ["requested", "accepted", "in_progress", "completed"];

export function StatusTimeline({ booking }: { booking: Booking }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  if (booking.status === "cancelled" || booking.status === "reschedule") return null;
  const currentIndex = ORDER.indexOf(booking.status);
  // A refused request is not progressing, so the first step must stop
  // advertising itself as live and waiting.
  const refused = dispatchPhase(booking)?.phase === "declined";

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
                {ml ? step.labelMl : step.label}
                {active && !refused && (
                  <span className="ml-2 animate-pulse text-[10px] text-kaam">● live</span>
                )}
              </p>
              <p className="text-[11px] text-mid">
                {active && refused
                  ? ml
                    ? "അവർക്ക് ഈ ജോലി എടുക്കാൻ കഴിയില്ല"
                    : "They can't take this job"
                  : ml
                    ? step.subMl
                    : step.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
