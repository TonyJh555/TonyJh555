import Link from "next/link";
import { KaamWordmark } from "@/components/logo";
import { categoriesInGroup, GROUPS } from "@/data/categories";

const STATS = [
  { value: "30", label: "Services in 6 sectors" },
  { value: "18 min", label: "Average arrival time" },
  { value: "85%", label: "Of every ₹ goes to the worker" },
  { value: "100%", label: "Police-verified workers" },
];

const STEPS = [
  { icon: "🔍", title: "Describe your problem", body: "Search 30 services or let the AI Advisor match you — in Malayalam or English, typed or spoken." },
  { icon: "🤝", title: "Get matched instantly", body: "Smart matching ranks verified workers by proximity, rating and reliability." },
  { icon: "🔨", title: "Job done, pay securely", body: "Start the job with a 4-digit OTP. Pay by UPI or card — transparent GST invoice included." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <KaamWordmark size={30} malayalam />
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/worker/signup" className="hidden text-mid hover:text-ink sm:block">
              For Workers
            </Link>
            <Link href="/admin" className="hidden text-mid hover:text-ink sm:block">
              Admin
            </Link>
            <Link
              href="/app"
              className="rounded-xl bg-kaam px-5 py-2.5 font-bold text-white shadow-kaam transition-opacity hover:opacity-90"
            >
              Open App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — Kerala backwater green with a kasavu-gold border strip */}
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0a4d37_0%,#0f6e4f_55%,#083b2b_100%)] text-white">
        {/* Kasavu (temple saree) gold border */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#c99700,#e8b923,#c99700)]" />
        {/* Faint coconut-palm motifs */}
        <div className="pointer-events-none absolute inset-0 select-none text-[120px] leading-none opacity-[0.06]">
          <span className="absolute -left-4 top-8">🌴</span>
          <span className="absolute right-2 top-24">🛶</span>
          <span className="absolute bottom-4 left-1/3">🥥</span>
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="mb-4 inline-block rounded-full border border-gold/40 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wide text-gold-bright">
            🌴 കേരളത്തിന്റെ സ്വന്തം സേവന ആപ്പ് · Kerala&apos;s own services app
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight font-extrabold sm:text-6xl">
            Verified local workers at your door in{" "}
            <span className="text-gold-bright">18 minutes</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            From electricians and nurses to violinists and baby sitters — 30 trusted
            services across Kerala. Police-verified, transparent pricing, and workers
            keep 85% of every rupee.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/app"
              className="rounded-2xl bg-kaam px-8 py-4 text-base font-bold text-white shadow-kaam transition-transform hover:scale-105"
            >
              Book a Worker →
            </Link>
            <Link
              href="/worker/signup"
              className="rounded-2xl border border-gold/50 bg-white/10 px-8 py-4 text-base font-bold text-gold-bright transition-colors hover:bg-white/20"
            >
              Earn with KAAM →
            </Link>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,#c99700,#e8b923,#c99700)]" />
      </section>

      {/* Stats */}
      <section className="border-b border-line bg-page">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-12 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-extrabold text-kaam">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold text-mid">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-extrabold">
          Every service your home needs
        </h2>
        <p className="mt-2 text-center text-mid">30 services · 6 sectors · transparent base pricing</p>
        {GROUPS.map((group) => (
          <div key={group.id} className="mt-10">
            <div className="mb-4 flex items-baseline gap-2">
              <h3 className="font-display text-lg font-extrabold">
                {group.icon} {group.label}
              </h3>
              <p className="text-xs text-dim">{group.tagline}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {categoriesInGroup(group.id).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/app/search?cat=${cat.id}`}
                  className="group rounded-2xl border border-line bg-white p-4 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-pop"
                >
                  <span className="text-3xl transition-transform group-hover:scale-110">{cat.icon}</span>
                  <p className="mt-2 text-xs font-bold">{cat.label}</p>
                  <p className="text-[10px] text-dim">from ₹{cat.basePrice}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="bg-page py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-extrabold">How KAAM works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kaam-light text-xl">
                    {step.icon}
                  </span>
                  <span className="font-display text-sm font-extrabold text-dim">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-base font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mid">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worker value prop */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 rounded-3xl bg-[linear-gradient(135deg,#15803D,#0F766E)] p-10 text-white sm:grid-cols-2 sm:p-14">
          <div>
            <h2 className="font-display text-3xl font-extrabold">
              Workers earn more. No middlemen.
            </h2>
            <p className="mt-4 text-white/80">
              On a ₹1,000 job the worker takes home ₹850 — KAAM keeps just 15% and files
              your GST and TDS paperwork automatically. Free insurance, instant payouts,
              and jobs that come to you.
            </p>
            <Link
              href="/worker/signup"
              className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-good"
            >
              Sign Up as a Worker →
            </Link>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 font-mono text-sm leading-loose">
            <p>User pays ……………… ₹1,000</p>
            <p>KAAM fee (15%) …… −₹150</p>
            <p>TDS (1%) ……………… −₹10</p>
            <p className="mt-2 border-t border-white/25 pt-2 text-lg font-bold">
              Worker gets …… ₹840 ✅
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-mid">
          <KaamWordmark size={26} />
          <p className="text-xs">
            © {new Date().getFullYear()} KAAM Technologies Pvt. Ltd. · Made in Kerala 🌴
          </p>
          <div className="flex gap-4 text-xs font-semibold">
            <Link href="/app" className="hover:text-ink">User App</Link>
            <Link href="/worker" className="hover:text-ink">Worker</Link>
            <Link href="/admin" className="hover:text-ink">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
