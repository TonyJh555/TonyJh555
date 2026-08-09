"use client";

import { handlesShoppingMoney, SHOPPING_MONEY } from "@/lib/shopping";
import type { Booking } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/**
 * The one thing both sides of a shopping job have to be told.
 *
 * "Buy For Me" and the errand trips are the only jobs where the worker carries
 * the customer's money, and the failure mode is quiet: a worker who pays for
 * ₹4,000 of groceries out of their own pocket on a ₹300 trip has made a loan
 * they cannot afford and cannot enforce. Nobody sets out to do that — it
 * happens because the money hadn't arrived and the shop was closing.
 *
 * So the rule is on the screen for both of them, before the shop, in the
 * language they read. The customer's version explains what they owe and what
 * KAAM does not take; the worker's version gives them permission to wait, which
 * is the part that actually needs saying out loud.
 */
export function ShoppingMoney({
  booking,
  viewer,
}: {
  booking: Pick<Booking, "categoryId" | "status">;
  viewer: "customer" | "worker";
}) {
  const ml = useLanguage().lang === "ml";
  if (!handlesShoppingMoney(booking.categoryId)) return null;
  // Once the job is over the money question is settled one way or another;
  // repeating the rule on a finished job is noise.
  if (booking.status === "completed" || booking.status === "cancelled") return null;

  return (
    <div className="mt-3 rounded-xl border border-warn-mid bg-warn-light p-3">
      <p className="text-xs font-extrabold text-warn">
        💰 {ml ? SHOPPING_MONEY.titleMl : SHOPPING_MONEY.title}
      </p>
      {viewer === "worker" ? (
        <p className="mt-1 text-[11px] font-bold leading-relaxed text-warn">
          {ml ? SHOPPING_MONEY.worker.ml : SHOPPING_MONEY.worker.en}
        </p>
      ) : (
        <ul className="mt-1 space-y-1">
          {SHOPPING_MONEY.lines.map((line) => (
            <li key={line.en} className="text-[11px] leading-relaxed text-warn">
              · {ml ? line.ml : line.en}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
