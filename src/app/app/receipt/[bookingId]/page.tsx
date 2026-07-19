"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useBookings } from "@/lib/bookings";
import { useCustomer } from "@/lib/auth";
import { getCategory } from "@/data/categories";
import { getTenure } from "@/lib/pricing";
import { formatSchedule, inr } from "@/lib/format";
import { BackLink } from "@/components/ui";

/**
 * GST tax invoice for a booking — printable / saveable as PDF via the browser's
 * print dialog. The customer never sees KAAM's commission (settled behind the
 * scenes); the invoice shows service amount + GST + cess = total, matching what
 * they paid.
 */
export default function ReceiptPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const bookings = useBookings();
  const customer = useCustomer();
  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <main className="px-4 pt-5">
        <header className="mb-4 flex items-center gap-3">
          <BackLink href="/app/bookings" />
          <h1 className="font-display text-lg font-bold">Invoice</h1>
        </header>
        <p className="py-16 text-center text-sm text-dim">
          Invoice not found.{" "}
          <Link href="/app/bookings" className="font-bold text-kaam">
            Back to bookings →
          </Link>
        </p>
      </main>
    );
  }

  const category = getCategory(booking.categoryId);
  const tenure = getTenure(booking.tenureId);
  const q = booking.quote;
  const invoiceNo = `KAAM-${booking.id.slice(-8).toUpperCase()}`;
  const date = new Date(booking.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const line = (label: string, value: string, strong = false) => (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className={strong ? "font-bold" : "text-mid"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-extrabold" : "font-semibold"}`}>{value}</span>
    </div>
  );

  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3 print:hidden">
        <BackLink href="/app/bookings" />
        <h1 className="flex-1 font-display text-lg font-bold">Tax Invoice</h1>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-kaam px-4 py-2 text-xs font-bold text-white shadow-kaam"
        >
          ⬇ Save / Print
        </button>
      </header>

      <div className="rounded-2xl border border-line bg-white p-5 shadow-card print:border-0 print:shadow-none">
        {/* Brand row */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <p className="font-display text-xl font-extrabold text-kaam">KAAM</p>
            <p className="text-[11px] text-dim">Kerala&apos;s trusted services marketplace</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold">TAX INVOICE</p>
            <p className="text-[11px] text-mid">{invoiceNo}</p>
            <p className="text-[11px] text-mid">{date}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3 border-b border-line py-4 text-[11px]">
          <div>
            <p className="mb-1 font-bold tracking-wide text-dim uppercase">Billed to</p>
            <p className="font-semibold">{customer?.name ?? "Customer"}</p>
            {customer?.identifier && (
              <p className="text-mid">
                {customer.identifier.type === "phone"
                  ? `+91 ${customer.identifier.value}`
                  : customer.identifier.value}
              </p>
            )}
            <p className="text-mid">{booking.address ?? "Kerala"}</p>
          </div>
          <div>
            <p className="mb-1 font-bold tracking-wide text-dim uppercase">Service by</p>
            <p className="font-semibold">{booking.workerName}</p>
            <p className="text-mid">{category.label}</p>
            <p className="text-mid">🕐 {formatSchedule(booking.schedule)}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="border-b border-line py-3">
          <div className="flex items-center justify-between py-2 text-sm">
            <div>
              <p className="font-semibold">
                {category.icon} {booking.subService}
              </p>
              <p className="text-[11px] text-mid">
                {booking.settlement
                  ? `${booking.settlement.billedMinutes} min billed (${booking.settlement.actualMinutes} min worked)`
                  : `${tenure.label} (${tenure.duration})`}
                {q.surgeApplied ? " · incl. surge ×1.2" : ""}
              </p>
            </div>
            <span className="font-semibold tabular-nums">{inr(q.serviceAmount)}</span>
          </div>
          {booking.settlement && (
            <p className="pb-1 text-[10px] leading-relaxed text-mid">
              ⏱ Fair billing: base price covers the first 60 min
              {booking.settlement.extraMinutes > 0
                ? `; ${booking.settlement.extraMinutes} extra min billed at the per-minute rate — no rounding up to full hours.`
                : " — this job fit inside it, nothing extra charged."}
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="py-3">
          {line("Service amount", inr(q.serviceAmount))}
          {line("CGST @9%", `+ ${inr(q.gst / 2)}`)}
          {line("SGST @9%", `+ ${inr(q.gst / 2)}`)}
          {q.cess > 0 && line("State welfare cess", `+ ${inr(q.cess)}`)}
          <div className="mt-1 border-t border-line pt-2">
            {line("Total paid", inr(q.totalUserPays), true)}
          </div>
          <p className="mt-1 text-right text-[11px] font-semibold text-good">
            {booking.paymentMethod === "cash" ? "Payable at completion" : "Paid online"}
          </p>
        </div>

        <div className="rounded-xl bg-surf p-3 text-[10px] leading-relaxed text-dim">
          All-inclusive price — GST shown upfront, no hidden charges, nothing extra to pay the worker
          directly. This is a computer-generated invoice. KAAM Technologies Pvt. Ltd. · Kochi, Kerala ·
          GSTIN 32XXXXXXXXXXXZ0 (demo).
        </div>
      </div>

      <Link
        href={`/app/book/${booking.workerId}`}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-kaam-mid bg-kaam-light py-3 text-sm font-bold text-kaam print:hidden"
      >
        🔁 Book {booking.workerName.split(" ")[0]} again
      </Link>
    </main>
  );
}
