"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, getCategory } from "@/data/categories";
import { WORKERS } from "@/data/workers";
import { rankWorkers } from "@/lib/matching";
import type { CategoryId } from "@/lib/types";
import { WorkerCard } from "@/components/worker-card";
import { BackLink } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

function SearchContent() {
  const params = useSearchParams();
  const { t } = useLanguage();
  const initialCat = params.get("cat") as CategoryId | null;
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CategoryId | null>(initialCat);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rankWorkers(
      WORKERS.filter((w) => {
        if (cat && w.categoryId !== cat) return false;
        if (!q) return true;
        const category = getCategory(w.categoryId);
        return (
          w.name.toLowerCase().includes(q) ||
          category.label.toLowerCase().includes(q) ||
          w.skills.some((s) => s.toLowerCase().includes(q))
        );
      }),
    );
  }, [query, cat]);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-card outline-none focus:border-kaam"
        />
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCat(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
            cat === null ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(cat === c.id ? null : c.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
              cat === c.id ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs font-semibold text-mid">
        {results.length} worker{results.length === 1 ? "" : "s"} found · ranked by match score
      </p>

      <div className="flex flex-col gap-3">
        {results.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
        {results.length === 0 && (
          <p className="py-10 text-center text-sm text-dim">
            No workers match your search. Try a different category.
          </p>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
