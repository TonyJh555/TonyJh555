"use client";

import { useEffect, useState } from "react";

/**
 * A rotating motivational banner shown when a worker opens the app — a small
 * daily push, in Malayalam + English, the way Swiggy/Uber greet their partners.
 */
const QUOTES: { ml: string; en: string }[] = [
  { ml: "ഓരോ ജോലിയും ഒരു പുതിയ അവസരമാണ്.", en: "Every job is a fresh opportunity." },
  { ml: "നിങ്ങളുടെ കഠിനാധ്വാനം കുടുംബത്തിന്റെ കരുത്ത്.", en: "Your hard work is your family's strength." },
  { ml: "ഇന്ന് ഒരു ജോലി കൂടി — ഒരു പടി കൂടി മുന്നോട്ട്.", en: "One more job today is one step forward." },
  { ml: "വേഗത്തിൽ സ്വീകരിക്കൂ, കൂടുതൽ സമ്പാദിക്കൂ.", en: "Accept faster, earn more." },
  { ml: "നല്ല സേവനം = 5 നക്ഷത്രം = കൂടുതൽ ജോലി.", en: "Great service = 5 stars = more work." },
  { ml: "കേരളം നിങ്ങളെ വിശ്വസിക്കുന്നു. 💚", en: "Kerala trusts your work. 💚" },
];

export function WorkerMotivation() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);
  const q = QUOTES[i];
  return (
    <div className="mb-4 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] p-4 text-white">
      <p className="text-[10px] font-bold tracking-wide text-white/60 uppercase">💪 Today&apos;s spark</p>
      <p key={i} className="fade-up mt-1 font-display text-base font-extrabold leading-snug">
        {q.ml}
      </p>
      <p className="text-xs text-white/80">{q.en}</p>
      <div className="mt-3 flex gap-1">
        {QUOTES.map((_, idx) => (
          <span
            key={idx}
            className={`h-1 flex-1 rounded-full transition-colors ${idx === i ? "bg-white" : "bg-white/25"}`}
          />
        ))}
      </div>
    </div>
  );
}

const TIPS: { icon: string; title: string; body: string }[] = [
  { icon: "⏰", title: "Ride the peak", body: "Most bookings land 6–9 PM and on weekends. Stay online then to catch more jobs." },
  { icon: "⚡", title: "Be first to accept", body: "Quick responders get offered more jobs. Turn on alerts so you never miss one." },
  { icon: "⭐", title: "Chase 5 stars", body: "Higher-rated workers are shown first and earn ~30% more. Be on time and polite." },
  { icon: "📸", title: "Show your work", body: "Upload photos/videos of finished jobs — customers trust and pick you faster." },
  { icon: "💬", title: "Reply in chat", body: "Confirm arrival and share updates. Good communication = repeat customers." },
];

export function WorkerTips() {
  return (
    <div className="mb-5">
      <h2 className="mb-2 font-display text-base font-bold">🚀 Ways to earn more</h2>
      <div className="flex flex-col gap-2">
        {TIPS.map((t) => (
          <div key={t.title} className="flex gap-3 rounded-xl border border-line bg-white p-3">
            <span className="text-lg">{t.icon}</span>
            <div>
              <p className="text-xs font-bold">{t.title}</p>
              <p className="text-[11px] leading-relaxed text-mid">{t.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
