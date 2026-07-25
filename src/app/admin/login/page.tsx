"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // The credentials were right — but that only matters if the browser
        // actually kept the session cookie. Verify it round-trips before
        // navigating, so a blocked/dropped cookie surfaces as a clear message
        // instead of silently bouncing back to this screen.
        const me = await fetch("/api/admin/me", { cache: "no-store" });
        if (!me.ok) {
          setError(
            "Signed in, but your browser didn't keep the session cookie — so the admin page would bounce you straight back. " +
              "Turn on cookies for this site, or open it in a normal browser tab (not a private window or an in-app browser).",
          );
          return;
        }
        // Hard navigation (not router.push): a fresh top-level request that
        // carries the session cookie through the proxy. A soft navigation can
        // reuse the router's pre-login prefetch of /admin and bounce back.
        window.location.assign("/admin");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Login failed");
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#0C0F1A_0%,#1A0810_45%,#071A0E_100%)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-display text-2xl font-extrabold text-white">
            KAAM <span className="text-kaam-bright">🔨</span>
          </Link>
          <p className="mt-1 text-sm text-white/60">Owner Console</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white p-6 shadow-pop">
          <h1 className="mb-1 font-display text-lg font-extrabold">🔐 Admin Sign In</h1>
          <p className="mb-5 text-xs text-mid">
            This area is restricted to the KAAM owner.
          </p>

          <label className="mb-1 block text-xs font-bold text-mid">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            className="mb-4 w-full rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none focus:border-kaam"
          />

          <label className="mb-1 block text-xs font-bold text-mid">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mb-4 w-full rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none focus:border-kaam"
          />

          {error && (
            <p className="mb-4 rounded-xl bg-kaam-light p-3 text-xs font-semibold text-kaam">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-xl bg-ink py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-white/40">
          Session expires after 8 hours · credentials are set via environment variables
        </p>
      </div>
    </div>
  );
}
