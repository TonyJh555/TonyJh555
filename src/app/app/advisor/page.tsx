"use client";

import { useState } from "react";
import Link from "next/link";
import { getCategory } from "@/data/categories";
import { WORKERS } from "@/data/workers";
import { rankWorkers } from "@/lib/matching";
import type { AdvisorResult } from "@/lib/advisor";
import { BackLink, Card, Tag } from "@/components/ui";
import { WorkerCard } from "@/components/worker-card";

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
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (text: string) => {
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
      setResult((await res.json()) as AdvisorResult);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
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
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={3}
          placeholder="e.g. My AC stopped cooling and there's water dripping from it…"
          className="w-full resize-none rounded-xl border border-line bg-surf p-3 text-sm outline-none focus:border-kaam"
        />
        <button
          onClick={() => analyze(problem)}
          disabled={loading || !problem.trim()}
          className="mt-3 w-full rounded-xl bg-[linear-gradient(135deg,#7C3AED,#C41E3A)] py-3 text-sm font-bold text-white shadow-pop disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "✨ Analyze My Problem"}
        </button>
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
              <Tag color={URGENCY_META[result.urgency].color}>
                {URGENCY_META[result.urgency].label}
              </Tag>
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
