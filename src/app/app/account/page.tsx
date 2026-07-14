"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, useCustomer } from "@/lib/auth";
import { useBookings } from "@/lib/bookings";
import { inr } from "@/lib/format";
import { Avatar, BackLink, Card } from "@/components/ui";

export default function AccountPage() {
  const router = useRouter();
  const customer = useCustomer();
  const bookings = useBookings();

  if (!customer) {
    return (
      <main className="px-4 pt-5">
        <header className="mb-4 flex items-center gap-3">
          <BackLink href="/app" />
          <h1 className="font-display text-lg font-bold">Account</h1>
        </header>
        <div className="py-16 text-center">
          <p className="mb-2 text-4xl">👤</p>
          <p className="text-sm font-semibold text-mid">You&apos;re not logged in</p>
          <Link
            href="/app/login?next=/app/account"
            className="mt-4 inline-block rounded-xl bg-kaam px-8 py-3 text-sm font-bold text-white shadow-kaam"
          >
            Login or Sign up →
          </Link>
        </div>
      </main>
    );
  }

  const spent = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.quote.totalUserPays, 0);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app" />
        <h1 className="font-display text-lg font-bold">My Account</h1>
      </header>

      <Card className="mb-4 flex items-center gap-3">
        <Avatar initials={customer.name.slice(0, 2).toUpperCase()} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold">{customer.name}</p>
          <p className="text-xs text-mid">
            {customer.identifier.type === "phone"
              ? `📱 +91 ${customer.identifier.value}`
              : `✉️ ${customer.identifier.value}`}
          </p>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="font-display text-xl font-extrabold">{bookings.length}</p>
          <p className="text-[11px] font-semibold text-mid">Bookings</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-xl font-extrabold text-kaam">{inr(spent)}</p>
          <p className="text-[11px] font-semibold text-mid">Total spent</p>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/app/bookings" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          📋 My Bookings
        </Link>
        <Link href="/app/advisor" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🤖 AI Advisor
        </Link>
        <Link href="/worker/signup" className="rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card">
          🔨 Become a KAAM worker
        </Link>
        <button
          onClick={() => {
            logout();
            router.push("/app");
            router.refresh();
          }}
          className="mt-2 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          Log out
        </button>
      </div>
    </main>
  );
}
