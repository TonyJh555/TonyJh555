"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Global error boundary — a friendly, branded fallback instead of a crash. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("KAAM app error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
      <p className="text-5xl">🛠️</p>
      <h1 className="mt-3 font-display text-xl font-extrabold text-ink">Something went wrong</h1>
      <p className="mt-1 max-w-xs text-sm text-mid">
        A small hiccup on our side. Try again — your bookings are safe.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-kaam px-6 py-3 text-sm font-bold text-white shadow-kaam"
        >
          ↻ Try again
        </button>
        <Link
          href="/app"
          className="rounded-xl border border-line bg-white px-6 py-3 text-sm font-bold text-mid"
        >
          🏠 Go home
        </Link>
      </div>
    </main>
  );
}
