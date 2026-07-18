"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, getCategory } from "@/data/categories";
import { WORKERS } from "@/data/workers";
import { rankByProximity } from "@/lib/matching";
import { useSearchLocation } from "@/lib/location";
import type { CategoryId } from "@/lib/types";
import { WorkerCard } from "@/components/worker-card";
import { WorkersMap } from "@/components/workers-map";
import { LocationBar } from "@/components/location-bar";
import {
  SearchFilters,
  DEFAULT_FILTERS,
  SORT_LABEL,
  activeFilterCount as activeCount,
  type Filters,
} from "@/components/search-filters";
import { BackLink } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const initialCat = params.get("cat") as CategoryId | null;
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CategoryId | null>(initialCat);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"list" | "map">("list");
  const location = useSearchLocation();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = WORKERS.filter((w) => {
      if (cat && w.categoryId !== cat) return false;
      if (!q) return true;
      const category = getCategory(w.categoryId);
      return (
        w.name.toLowerCase().includes(q) ||
        category.label.toLowerCase().includes(q) ||
        w.district.toLowerCase().includes(q) ||
        w.city.toLowerCase().includes(q) ||
        w.skills.some((s) => s.toLowerCase().includes(q))
      );
    });

    // rankByProximity attaches each worker's live distance from the customer.
    let list = rankByProximity(matched, location.coords).filter((w) => {
      if (w.rating < filters.minRating) return false;
      if (filters.maxKm > 0 && w.distanceKm > filters.maxKm) return false;
      if (filters.maxPrice > 0 && w.rate > filters.maxPrice) return false;
      if (filters.onlineOnly && !w.online) return false;
      if (filters.verifiedOnly && !w.verified) return false;
      if (filters.womenOnly && !w.female) return false;
      return true;
    });

    // Nearest order is already applied; other sorts break ties by distance.
    if (filters.sort === "rating") {
      list = [...list].sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm);
    } else if (filters.sort === "price") {
      list = [...list].sort((a, b) => a.rate - b.rate || a.distanceKm - b.distanceKm);
    } else if (filters.sort === "experience") {
      list = [...list].sort((a, b) => b.experienceYears - a.experienceYears || a.distanceKm - b.distanceKm);
    }

    // Unfiltered browse → show the nearest 40 (like a food app's first page).
    const unfiltered = !cat && !q && filters.sort === "near" && activeCount(filters) === 0;
    return unfiltered ? list.slice(0, 40) : list;
  }, [query, cat, location, filters]);

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

      <div className="mb-4">
        <LocationBar />
      </div>

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

      <div className="mb-3">
        <SearchFilters filters={filters} onChange={setFilters} />
      </div>

      {(() => {
        const nearest = results.find((w) => w.online);
        if (!nearest) return null;
        return (
          <button
            onClick={() => router.push(`/app/book/${nearest.id}`)}
            className="mb-3 flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#c41e3a,#ff4d6d)] p-3.5 text-left text-white shadow-kaam active:scale-[0.99]"
          >
            <span className="text-2xl">⚡</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">Instant book — nearest available</span>
              <span className="block truncate text-[11px] text-white/85">
                {nearest.name} · {getCategory(nearest.categoryId).label} · 📍 {nearest.distanceKm} km ·
                ⏱ ~{nearest.etaMinutes} min
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-white/20 px-3 py-2 text-xs font-extrabold">Book →</span>
          </button>
        );
      })()}

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-mid">
          {results.length} worker{results.length === 1 ? "" : "s"} ·{" "}
          {filters.sort === "near" ? "nearest first 📍" : `by ${SORT_LABEL[filters.sort].toLowerCase()}`}
        </p>
        <div className="flex rounded-xl border border-line bg-white p-0.5">
          <button
            onClick={() => setView("list")}
            className={`rounded-lg px-3 py-1 text-xs font-bold ${view === "list" ? "bg-kaam text-white" : "text-mid"}`}
          >
            ☰ List
          </button>
          <button
            onClick={() => setView("map")}
            className={`rounded-lg px-3 py-1 text-xs font-bold ${view === "map" ? "bg-kaam text-white" : "text-mid"}`}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="py-10 text-center text-sm text-dim">
          No workers match these filters. Try widening distance or price, or clear a filter.
        </p>
      ) : view === "map" ? (
        <WorkersMap center={location.coords} workers={results.slice(0, 30)} />
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
          ))}
        </div>
      )}
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
