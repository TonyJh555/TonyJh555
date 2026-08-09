import Link from "next/link";
import { KaamWordmark } from "@/components/logo";
import { LandingBanners, type Banner } from "@/components/landing-banners";
import { categoriesInGroup, GROUPS } from "@/data/categories";
import {
  GroupIcon,
  GROUP_TINT,
  PageIcon,
  ServiceIcon,
  type PageIconId,
} from "@/components/service-icons";

/**
 * The work KAAM actually sends people to do, shown rather than described.
 *
 * Each photograph is cropped from the poster set to the picture alone — the
 * posters arrived with a KAAM wordmark, a headline and a button baked into the
 * left third, which would have meant a second logo, a headline arguing with
 * the page's own, and a button that isn't a button. The captions and the links
 * here are real; nothing on the page pretends to be clickable and isn't.
 *
 * The bottom strip of each poster named its subjects ("KAAM Nurse: Latha",
 * "Patient: Mr. Nair"). That is cropped away deliberately: these are generated
 * images, and naming a nurse and her patient would present invented people as
 * real KAAM workers and real customers.
 */
const BANNERS: Banner[] = [
  {
    photo: "/showcase/home-nurse.jpg",
    alt: "A KAAM home nurse checking an elderly man's blood pressure at his bedside",
    ml: "വീട്ടിൽ വന്ന് പരിചരണം",
    en: "Home nursing",
    cta: "Find a nurse",
    body: "Verified nurses for elders, post-surgery care and daily checks.",
    href: "/app/search?cat=nurse",
  },
  {
    photo: "/showcase/appliance-repair.jpg",
    alt: "A KAAM technician testing a washing machine while the homeowner watches",
    ml: "വീട്ടുപകരണങ്ങൾ നന്നാക്കാൻ",
    en: "Repairs you can trust",
    cta: "Book a technician",
    body: "Electricians, plumbers and appliance experts — priced before they start.",
    href: "/app/search?cat=elec",
  },
  {
    photo: "/showcase/music-lesson.jpg",
    alt: "A KAAM music teacher giving a violin lesson to a girl at home",
    ml: "വീട്ടിൽ വന്ന് സംഗീതം പഠിപ്പിക്കാൻ",
    en: "Music at home",
    cta: "Find a teacher",
    body: "Violin, piano and guitar teachers who come to your living room.",
    href: "/app/search?cat=violin",
  },
  {
    photo: "/showcase/elder-doorstep.jpg",
    alt: "A KAAM carer taking an elderly man's blood pressure in his home",
    ml: "മുതിർന്നവർക്ക് കൂട്ടായി",
    en: "Elder care",
    cta: "Find a carer",
    body: "Company, medicine reminders and a steady hand — hours or full-time.",
    href: "/app/search?cat=eldercare",
  },
  {
    photo: "/showcase/dance-class.jpg",
    alt: "A KAAM dance teacher teaching classical dance to a young student",
    ml: "നൃത്തം പഠിക്കാൻ",
    en: "Dance classes",
    cta: "Find a teacher",
    body: "Bharatanatyam, Bollywood and wedding choreography, at your pace.",
    href: "/app/search?cat=dance",
  },
  {
    photo: "/showcase/physio.jpg",
    alt: "A KAAM physiotherapist working with an older man on arm mobility",
    ml: "ഫിസിയോതെറാപ്പി",
    en: "Physiotherapy",
    cta: "Book a physio",
    body: "Back, knee and post-surgery recovery — at home or at a clinic.",
    href: "/app/search?cat=physio",
  },
];

const STATS = [
  { value: "30", label: "Services in 6 sectors" },
  { value: "85%", label: "Of every ₹ goes to the worker" },
  { value: "14", label: "Kerala districts covered" },
  { value: "0", label: "Charged before a worker accepts" },
];

const STEPS: { icon: PageIconId; title: string; body: string }[] = [
  { icon: "search", title: "Describe your problem", body: "Search 30 services or let the AI Advisor match you — in Malayalam or English, typed or spoken." },
  { icon: "match", title: "Get matched instantly", body: "Smart matching ranks verified workers by proximity, rating and reliability." },
  { icon: "pay", title: "Job done, pay securely", body: "Start the job with a 4-digit OTP. Pay by UPI or card — transparent GST invoice included." },
];

const DIFFERENTIATORS: { icon: PageIconId; title: string; body: string }[] = [
  { icon: "clock", title: "Pay for minutes, not hours", body: "The base hour covers time & travel; past a 5-min grace you pay only for the minutes actually worked. 1h 08m bills 68 minutes — never a rounded-up second hour." },
  { icon: "balance", title: "Fair to both sides", body: "Free cancellation before a worker accepts; after that the base hour is theirs — protecting their trip, never charging you for a KAAM-side miss." },
  { icon: "star", title: "Ratings that mean something", body: "Every completed job must be rated, so top workers are genuinely top — and they earn Pro status that customers can see." },
  { icon: "shield", title: "Safety built in", body: "KYC-verified workers, OTP-started jobs, live tracking, SOS, and one-tap 'share my job' with family." },
  { icon: "medal", title: "KAAM Plus saves you more", body: "One membership: 10% off every booking, zero fees, priority matching, and free cancellations — it pays for itself in two jobs." },
  { icon: "globe", title: "Built for Kerala", body: "Fully in Malayalam and English, tuned for skilled workers who may not read English — simple, big, bilingual actions." },
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

      {/* The pictures come first — moving, so the eye starts here */}
      <LandingBanners banners={BANNERS} />

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
        {/* py-16, not py-24: the moving banner above is already a full band,
            and two full-height openings stacked read as two competing front
            pages rather than one. */}
        <div className="relative mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="mb-4 inline-block rounded-full border border-gold/40 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wide text-gold-bright">
            🌴 കേരളത്തിന്റെ സ്വന്തം സേവന ആപ്പ് · Kerala&apos;s own services app
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight font-extrabold sm:text-6xl">
            Choose your own skilled worker,{" "}
            <span className="text-gold-bright">and pay only when they accept</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            From electricians and nurses to violinists and baby sitters — 30
            services across Kerala. You pick the person from their ratings, nothing
            is charged until they say yes, and workers keep 85% of every rupee.
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

          {/* The numbers belong to the claim above them. As their own grey
              band they were a third section saying nothing new; inside the
              hero they are the evidence for the sentence they sit under. */}
          <div className="mt-14 grid grid-cols-2 gap-y-8 border-t border-white/15 pt-10 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-extrabold text-gold-bright sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mx-auto mt-1 max-w-[9rem] text-xs font-semibold text-white/70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,#c99700,#e8b923,#c99700)]" />
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-extrabold">
          Every service your home needs
        </h2>
        <p className="mt-2 text-center text-mid">30 services · 6 sectors · transparent base pricing</p>
        {GROUPS.map((group) => {
          const tint = GROUP_TINT[group.id];
          return (
            <div key={group.id} className="mt-12">
              <div className="mb-5 flex items-center justify-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${tint.chip} ${tint.ink}`}
                >
                  <GroupIcon id={group.id} className="h-4.5 w-4.5" />
                </span>
                <h3 className="font-display text-lg font-extrabold">{group.label}</h3>
                <p className="hidden text-xs text-dim sm:block">{group.taglineMl}</p>
              </div>
              {/* Wrapped and centred rather than a fixed six-column grid: a
                  sector with three services would otherwise sit against the
                  left edge with half the row empty, which reads as a layout
                  that ran out rather than one that was set. */}
              <div className="flex flex-wrap justify-center gap-3">
                {categoriesInGroup(group.id).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/app/search?cat=${cat.id}`}
                    className="group w-[calc(33.333%-0.5rem)] rounded-2xl border border-line bg-white p-4 text-center transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-pop sm:w-[calc(16.666%-0.625rem)]"
                  >
                    <span
                      className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl ${tint.chip} ${tint.ink} transition-transform group-hover:scale-110`}
                    >
                      <ServiceIcon id={cat.id} className="h-6 w-6" />
                    </span>
                    <p className="mt-2.5 text-xs font-bold">{cat.label}</p>
                    {/* The landing has no language toggle, so both names show —
                        somebody who reads Malayalam should not have to guess
                        which tile is theirs. */}
                    <p className="text-[10px] leading-tight font-semibold text-mid">{cat.labelMl}</p>
                    <p className="text-[10px] text-dim">from ₹{cat.basePrice}</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* How it works */}
      <section className="bg-page py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-extrabold">How KAAM works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kaam-light text-kaam">
                    <PageIcon id={step.icon} className="h-5.5 w-5.5" />
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

      {/* What makes KAAM different — the moat vs Urban Company / Swiggy */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-extrabold">
          Fairer than any app you&apos;ve used
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-mid">
          The things the big apps get wrong, KAAM gets right — for customers and workers alike.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kaam-light text-kaam">
                <PageIcon id={d.icon} className="h-5.5 w-5.5" />
              </span>
              <h3 className="mt-3 font-display text-base font-extrabold">{d.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-mid">{d.body}</p>
            </div>
          ))}
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
              On a ₹1,000 job the worker takes home ₹840 — KAAM keeps just 15% and files
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
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
