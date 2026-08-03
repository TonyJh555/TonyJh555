"use client";

import { useSyncExternalStore } from "react";
import { googleCalendarUrl } from "@/lib/calendar";
import { formatSchedule, isScheduled } from "@/lib/format";
import { ensureNotifyPermission, notifyPermission } from "@/lib/notify";
import { scheduledAt } from "@/lib/reminders";
import type { Booking } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

const noopSubscribe = () => () => {};

/**
 * Making sure the worker does not forget a job booked for next week.
 *
 * A missed function is the worst failure KAAM can have. Nobody rebooks after
 * two hundred guests sat down to no food, and no refund repairs it. The app
 * already fires reminders a day and an hour ahead — but those depend on a
 * notification permission the worker may never have granted, on a browser
 * they may have cleared, on a phone that may have been off.
 *
 * A calendar entry does not depend on any of that. It lives in the app the
 * worker already opens every morning, it survives a reinstall, and it rings
 * whether or not KAAM is running. So for a dated job this is offered as the
 * primary action, not a nicety — and the alerts prompt beside it is a full
 * card rather than the usual quiet chip, because for a worker this is not a
 * preference. It is the difference between turning up and not.
 */
export function JobReminder({ booking }: { booking: Booking }) {
  const ml = useLanguage().lang === "ml";
  const permission = useSyncExternalStore(
    noopSubscribe,
    () => notifyPermission(),
    () => "unsupported" as const,
  );

  // Only a job with a date can be forgotten in this particular way.
  if (!isScheduled(booking.schedule) || scheduledAt(booking) === null) return null;
  if (booking.status !== "accepted" && booking.status !== "requested") return null;

  const link = googleCalendarUrl(booking, 60, "worker");
  const needsAlerts = permission === "default" || permission === "denied";

  return (
    <div className="mt-2 rounded-xl border border-info-mid bg-info-light p-2.5">
      <p className="text-[11px] font-extrabold text-info">
        📅 {ml ? "ഈ ജോലി ഒരു തീയതിക്കാണ്" : "This job is for a date, not for now"}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink">
        {formatSchedule(booking.schedule)}
        {" · "}
        {ml
          ? "മറന്നുപോകരുത് — കലണ്ടറിൽ ചേർക്കൂ."
          : "Don't let it slip — put it in your calendar."}
      </p>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block rounded-lg bg-info py-2.5 text-center text-[11px] font-extrabold text-white"
        >
          📅 {ml ? "എന്റെ കലണ്ടറിൽ ചേർക്കൂ" : "Add to my calendar"}
        </a>
      )}

      {/* Not a chip. A worker who misses this misses the job. */}
      {needsAlerts && (
        <div className="mt-2 rounded-lg border border-warn-mid bg-warn-light p-2">
          <p className="text-[11px] font-extrabold text-warn">
            🔔 {ml ? "അലേർട്ടുകൾ ഓഫാണ്" : "Job alerts are off"}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink">
            {ml
              ? "ഇത് ഓണാക്കിയാൽ തലേദിവസവും ഒരു മണിക്കൂർ മുൻപും ഓർമ്മിപ്പിക്കും."
              : "Turn these on and KAAM reminds you the day before and an hour before."}
          </p>
          {permission === "denied" ? (
            <p className="mt-1 text-[10px] font-bold text-warn">
              {ml
                ? "ബ്രൗസർ സെറ്റിംഗ്സിൽ പോയി അനുവദിക്കൂ."
                : "You blocked them — allow notifications in your browser settings."}
            </p>
          ) : (
            <button
              onClick={() => ensureNotifyPermission()}
              className="mt-1.5 w-full rounded-lg bg-warn py-2 text-[11px] font-extrabold text-white"
            >
              {ml ? "അലേർട്ടുകൾ ഓണാക്കൂ" : "Turn on job alerts"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
