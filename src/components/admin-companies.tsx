"use client";

import { useState } from "react";
import { updateCompany, useCompanies, type EventCompany } from "@/lib/event-store";
import { Card, Tag } from "@/components/ui";
import { PortfolioStrip } from "@/components/company-portfolio";

/**
 * Approving event businesses.
 *
 * A company here is about to be shown to a family planning a wedding and
 * invited to hold a date worth lakhs, so it is checked once by a human before
 * it can receive a single brief. Until approved it sees nothing and appears
 * nowhere — the same rule the worker verification desk runs on, for the same
 * reason.
 */
export function AdminCompanies() {
  const companies = useCompanies();
  const [reason, setReason] = useState<Record<string, string>>({});

  const pending = companies.filter((c) => c.status === "pending");
  const decided = companies.filter((c) => c.status !== "pending");

  const decide = (c: EventCompany, status: "approved" | "rejected") =>
    updateCompany(c.id, {
      status,
      reviewedAt: new Date().toISOString(),
      rejectReason: status === "rejected" ? reason[c.id]?.trim() || undefined : undefined,
    });

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-extrabold text-ink">🎪 Event companies</h3>
        {pending.length > 0 && <Tag color="yellow">{pending.length} waiting</Tag>}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-mid">
        A company approved here can be invited to quote on weddings worth lakhs.
        Check the business is real before you tick it.
      </p>

      {companies.length === 0 && (
        <p className="mt-3 rounded-lg border border-line bg-surf p-3 text-[11px] text-mid">
          No companies have registered yet. They sign up at <strong>/events</strong>.
        </p>
      )}

      {[...pending, ...decided].map((c) => (
        <div key={c.id} className="mt-3 rounded-xl border border-line bg-surf p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{c.name}</p>
              <p className="text-[11px] text-mid">
                {c.contactName} · {c.phone}
              </p>
              <p className="text-[11px] text-mid">
                {c.city}, {c.district}
                {c.yearsRunning > 0 && ` · ${c.yearsRunning} yrs`}
                {c.crewSize > 0 && ` · crew of ${c.crewSize}`}
              </p>
              {c.gstin && <p className="text-[10px] text-dim">GSTIN {c.gstin}</p>}
            </div>
            <Tag
              color={
                c.status === "approved" ? "green" : c.status === "rejected" ? "red" : "yellow"
              }
            >
              {c.status}
            </Tag>
          </div>

          {c.services.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {c.services.map((s) => (
                <span
                  key={s}
                  className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold text-mid"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {c.about && <p className="mt-1.5 text-[11px] leading-relaxed text-mid">{c.about}</p>}
          <PortfolioStrip photos={c.portfolio} size={64} />

          {c.status === "pending" && (
            <>
              <input
                value={reason[c.id] ?? ""}
                onChange={(e) => setReason({ ...reason, [c.id]: e.target.value })}
                placeholder="Reason, if rejecting"
                className="mt-2 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-kaam"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => decide(c, "approved")}
                  className="flex-1 rounded-lg bg-good py-2 text-[11px] font-extrabold text-white"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => decide(c, "rejected")}
                  className="flex-1 rounded-lg border border-kaam-mid bg-white py-2 text-[11px] font-bold text-kaam"
                >
                  ✕ Reject
                </button>
              </div>
            </>
          )}

          {c.status === "rejected" && c.rejectReason && (
            <p className="mt-1.5 text-[11px] font-semibold text-kaam">{c.rejectReason}</p>
          )}
        </div>
      ))}
    </Card>
  );
}
