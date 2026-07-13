"use client";

import { useState } from "react";
import Link from "next/link";
import { getCategory } from "@/data/categories";
import { WORKERS } from "@/data/workers";
import { rankWorkers } from "@/lib/matching";
import type { AdvisorResult } from "@/lib/advisor";
import { useVoice } from "@/lib/use-voice";
import { BackLink, Card, Tag } from "@/components/ui";
import { WorkerCard } from "@/components/worker-card";
import { useLanguage } from "@/components/language-provider";

/** What the phone reads aloud after a voice query. */
function speechSummary(result: AdvisorResult): string {
  const category = getCategory(result.categoryId);
  const parts = [`You need: ${category.label}.`, result.note];
  if (result.urgency === "high") parts.push("This sounds urgent, please be careful.");
  if (result.safetyTips[0]) parts.push(`Safety tip: ${result.safetyTips[0]}`);
  parts.push("The best workers near you are on screen. Tap one to book.");
  return parts.join(" ");
}

const EXAMPLES = [
  "My ceiling fan is making noise and sparking ⚡",
  "Need a violinist for my sister's wedding sangeet 🎻",
  "Baby sitter needed for my 2-year-old on weekdays 👶",
  "Water leaking under the kitchen sink 💧",
];

const URGENCY_META = {
  high: { label: "🚨 High urgency", color: "red" as const },
  medium: { label: "⏱ Medium urgency", color: "yellow" as const },
  low: { label: "🌿 Not urgent", color: "green" as const },
};

export default function AdvisorPage() {
  const { lang } = useLanguage();
  const voice = useVoice(lang);
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (text: string, { spoken = false } = {}) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: text }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as AdvisorResult;
      setResult(data);
      // If the user spoke their problem, read the answer back to them.
      if (spoken && voice.canSpeak) voice.speak(speechSummary(data));
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMic = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.stopSpeaking();
    voice.startListening((transcript) => {
      setProblem(transcript);
      analyze(transcript, { spoken: true });
    });
  };

  const category = result ? getCategory(result.categoryId) : null;
  const altCategory = result?.altCategoryId ? getCategory(result.altCategoryId) : null;
  const workers = result
    ? rankWorkers(WORKERS.filter((w) => w.categoryId === result.categoryId)).slice(0, 3)
    : [];

  return (
    <main className="px-4 pt-5 pb-8">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app" />
        <div>
          <h1 className="font-display text-lg font-bold">🤖 KAAM AI Advisor</h1>
          <p className="text-[11px] text-dim">Describe your problem in any language</p>
        </div>
      </header>

      <Card className="mb-4">
        <textarea
          value={voice.listening ? voice.interim || "Listening… speak now" : problem}
          onChange={(e) => setProblem(e.target.value)}
          readOnly={voice.listening}
          rows={3}
          placeholder="e.g. My AC stopped cooling and there's water dripping from it…"
          className={`w-full resize-none rounded-xl border p-3 text-sm outline-none focus:border-kaam ${
            voice.listening ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-surf"
          }`}
        />
        <div className="mt-3 flex items-stretch gap-2">
          {voice.canListen && (
            <button
              onClick={handleMic}
              aria-label={voice.listening ? "Stop listening" : "Speak your problem"}
              className={`flex w-24 flex-col items-center justify-center rounded-xl border-2 py-2 text-white transition-colors ${
                voice.listening
                  ? "animate-pulse border-kaam bg-kaam"
                  : "border-good bg-good"
              }`}
            >
              <span className="text-2xl leading-none">{voice.listening ? "⏹" : "🎤"}</span>
              <span className="mt-0.5 text-[10px] font-bold">
                {voice.listening ? "Stop" : "Speak"}
              </span>
            </button>
          )}
          <button
            onClick={() => analyze(problem)}
            disabled={loading || !problem.trim() || voice.listening}
            className="flex-1 rounded-xl bg-[linear-gradient(135deg,#7C3AED,#C41E3A)] py-3 text-sm font-bold text-white shadow-pop disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "✨ Analyze My Problem"}
          </button>
        </div>
        {voice.canListen && !voice.listening && (
          <p className="mt-2 text-center text-[10px] text-dim">
            🎤 Tap Speak and describe your problem aloud — the answer will be read back to you
          </p>
        )}
      </Card>

      {!result && !loading && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Try an example</p>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setProblem(example);
                  analyze(example);
                }}
                className="rounded-xl border border-line bg-white p-3 text-left text-xs font-semibold text-mid shadow-card hover:border-kaam"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-kaam-light p-3 text-xs font-semibold text-kaam">{error}</p>
      )}

      {result && category && (
        <div className="fade-up">
          <Card className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold tracking-wide text-dim uppercase">
                Recommended service
              </p>
              <div className="flex items-center gap-2">
                {voice.canSpeak && (
                  <button
                    onClick={() =>
                      voice.speaking ? voice.stopSpeaking() : voice.speak(speechSummary(result))
                    }
                    aria-label={voice.speaking ? "Stop reading" : "Read result aloud"}
                    className="rounded-full border border-line bg-surf px-2.5 py-1 text-xs font-bold text-mid hover:border-kaam hover:text-kaam"
                  >
                    {voice.speaking ? "⏹ Stop" : "🔊 Listen"}
                  </button>
                )}
                <Tag color={URGENCY_META[result.urgency].color}>
                  {URGENCY_META[result.urgency].label}
                </Tag>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kaam-light text-3xl">
                {category.icon}
              </span>
              <div>
                <p className="font-display text-lg font-extrabold">{category.label}</p>
                <p className="text-xs text-mid">from ₹{category.basePrice}/visit</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-surf p-3 text-xs leading-relaxed text-mid">
              {result.note}
            </p>
            {altCategory && (
              <p className="mt-2 text-xs text-mid">
                Could also be:{" "}
                <Link
                  href={`/app/search?cat=${altCategory.id}`}
                  className="font-bold text-info"
                >
                  {altCategory.icon} {altCategory.label} →
                </Link>
              </p>
            )}
          </Card>

          {result.safetyTips.length > 0 && (
            <Card className="mb-4 border-warn-mid bg-warn-light">
              <p className="mb-2 text-xs font-bold tracking-wide text-warn uppercase">
                🛡️ Safety first
              </p>
              <ul className="flex flex-col gap-1.5">
                {result.safetyTips.map((tip) => (
                  <li key={tip} className="text-xs leading-relaxed text-warn">
                    • {tip}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Best matches near you</h2>
            <Link href={`/app/search?cat=${category.id}`} className="text-xs font-bold text-kaam">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {workers.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
            {workers.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-xs text-dim">
                No workers online in this category right now — check the{" "}
                <Link href={`/app/search?cat=${category.id}`} className="font-bold text-kaam">
                  full list
                </Link>
                .
              </p>
            )}
          </div>

          <p className="mt-4 text-center text-[10px] text-dim">
            {result.source === "claude"
              ? "Powered by Claude AI"
              : "Built-in advisor · add ANTHROPIC_API_KEY for full AI analysis"}
          </p>
        </div>
      )}
    </main>
  );
}
