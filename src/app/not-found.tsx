import Link from "next/link";
import { KaamWordmark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
      <div className="mb-6">
        <KaamWordmark size={36} malayalam />
      </div>
      <p className="font-display text-6xl font-extrabold text-kaam">404</p>
      <h1 className="mt-2 font-display text-xl font-extrabold text-ink">Page not found</h1>
      <p className="mt-1 max-w-xs text-sm text-mid">
        This page took an off-day. Let&apos;s get you back to booking Kerala&apos;s best.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/app"
          className="rounded-xl bg-kaam px-6 py-3 text-sm font-bold text-white shadow-kaam"
        >
          🏠 Go home
        </Link>
        <Link
          href="/app/search"
          className="rounded-xl border border-line bg-white px-6 py-3 text-sm font-bold text-mid"
        >
          🔍 Find a worker
        </Link>
      </div>
    </main>
  );
}
