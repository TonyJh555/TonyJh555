"use client";

import { useState } from "react";
import { inr } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

/** Search sort + filter model (Swiggy/Zomato-style refine sheet). */
export type SortKey = "near" | "rating" | "price" | "experience";

export interface Filters {
  sort: SortKey;
  minRating: number; // 0 | 4 | 4.5
  maxKm: number; // 0 = any
  maxPrice: number; // 0 = any
  onlineOnly: boolean;
  verifiedOnly: boolean;
  womenOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  sort: "near",
  minRating: 0,
  maxKm: 0,
  maxPrice: 0,
  onlineOnly: false,
  verifiedOnly: false,
  womenOnly: false,
};

const SORTS: { key: SortKey; label: string; labelMl: string }[] = [
  { key: "near", label: "Nearest", labelMl: "അടുത്തുള്ളവർ" },
  { key: "rating", label: "Top rated", labelMl: "മികച്ച റേറ്റിംഗ്" },
  { key: "price", label: "Lowest price", labelMl: "കുറഞ്ഞ വില" },
  { key: "experience", label: "Most experienced", labelMl: "കൂടുതൽ പരിചയം" },
];

const SORT_LABEL: Record<SortKey, string> = {
  near: "Nearest",
  rating: "Top rated",
  price: "Lowest price",
  experience: "Experience",
};

/** How many non-default filters are active (for the badge). */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.minRating > 0) n++;
  if (f.maxKm > 0) n++;
  if (f.maxPrice > 0) n++;
  if (f.onlineOnly) n++;
  if (f.verifiedOnly) n++;
  if (f.womenOnly) n++;
  return n;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
        active ? "border-kaam bg-kaam text-white" : "border-line bg-white text-mid"
      }`}
    >
      {children}
    </button>
  );
}

export function SearchFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const count = activeFilterCount(filters);
  const anyLabel = ml ? "ഏതും" : "Any";

  return (
    <>
      {/* Quick row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1 rounded-full border border-kaam-mid bg-kaam-light px-3 py-1.5 text-xs font-bold text-kaam"
        >
          ⚙️ {ml ? "ക്രമീകരണം & ഫിൽട്ടർ" : "Sort & filter"}
          {count > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-kaam px-1 text-[9px] text-white">
              {count}
            </span>
          )}
        </button>
        <Chip active={filters.sort === "near"} onClick={() => set({ sort: "near" })}>📍 {ml ? "അടുത്ത്" : "Nearest"}</Chip>
        <Chip active={filters.sort === "rating"} onClick={() => set({ sort: "rating" })}>⭐ {ml ? "മികച്ചവർ" : "Top rated"}</Chip>
        <Chip active={filters.onlineOnly} onClick={() => set({ onlineOnly: !filters.onlineOnly })}>⚡ {ml ? "ഇപ്പോൾ ലഭ്യം" : "Available now"}</Chip>
        <Chip active={filters.minRating >= 4.5} onClick={() => set({ minRating: filters.minRating >= 4.5 ? 0 : 4.5 })}>4.5★+</Chip>
        <Chip active={filters.verifiedOnly} onClick={() => set({ verifiedOnly: !filters.verifiedOnly })}>✅ {ml ? "വെരിഫൈഡ്" : "Verified"}</Chip>
      </div>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-page p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold">{ml ? "ക്രമീകരണം & ഫിൽട്ടർ" : "Sort & filter"}</h2>
              <button onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs font-bold text-kaam">
                {ml ? "റീസെറ്റ്" : "Reset"}
              </button>
            </div>

            <p className="mb-2 text-[10px] font-bold tracking-wide text-dim uppercase">{ml ? "ക്രമീകരിക്കൂ" : "Sort by"}</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => set({ sort: s.key })}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold ${
                    filters.sort === s.key ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-white text-ink"
                  }`}
                >
                  {ml ? s.labelMl : s.label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-[10px] font-bold tracking-wide text-dim uppercase">{ml ? "കുറഞ്ഞ റേറ്റിംഗ്" : "Minimum rating"}</p>
            <div className="mb-4 flex gap-2">
              {[0, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => set({ minRating: r })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${
                    filters.minRating === r ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-white text-mid"
                  }`}
                >
                  {r === 0 ? anyLabel : `${r}★+`}
                </button>
              ))}
            </div>

            <p className="mb-2 text-[10px] font-bold tracking-wide text-dim uppercase">{ml ? "ദൂരപരിധി" : "Within distance"}</p>
            <div className="mb-4 flex gap-2">
              {[0, 3, 10, 25].map((km) => (
                <button
                  key={km}
                  onClick={() => set({ maxKm: km })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${
                    filters.maxKm === km ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-white text-mid"
                  }`}
                >
                  {km === 0 ? anyLabel : `${km} km`}
                </button>
              ))}
            </div>

            <p className="mb-2 text-[10px] font-bold tracking-wide text-dim uppercase">{ml ? "പരമാവധി വില" : "Max price"}</p>
            <div className="mb-4 flex gap-2">
              {[0, 500, 1000, 2000].map((price) => (
                <button
                  key={price}
                  onClick={() => set({ maxPrice: price })}
                  className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold ${
                    filters.maxPrice === price ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-white text-mid"
                  }`}
                >
                  {price === 0 ? anyLabel : `≤${inr(price)}`}
                </button>
              ))}
            </div>

            <div className="mb-5 flex flex-col gap-2">
              <ToggleRow
                label={ml ? "⚡ ഇപ്പോൾ ലഭ്യം" : "⚡ Available now"}
                sub={ml ? "ഓൺലൈനിലുള്ള തൊഴിലാളികൾ മാത്രം" : "Only workers who are online"}
                on={filters.onlineOnly}
                onClick={() => set({ onlineOnly: !filters.onlineOnly })}
              />
              <ToggleRow
                label={ml ? "✅ വെരിഫൈഡ് മാത്രം" : "✅ Verified only"}
                sub={ml ? "KYC / പശ്ചാത്തലം പരിശോധിച്ചവർ" : "KYC / background-verified"}
                on={filters.verifiedOnly}
                onClick={() => set({ verifiedOnly: !filters.verifiedOnly })}
              />
              <ToggleRow
                label={ml ? "👩 വനിതാ തൊഴിലാളികൾ മാത്രം" : "👩 Women workers only"}
                sub={ml ? "വീട്ടിൽ സൗകര്യത്തിനും സുരക്ഷയ്ക്കും" : "For comfort & safety at home"}
                on={filters.womenOnly}
                onClick={() => set({ womenOnly: !filters.womenOnly })}
              />
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-kaam py-3 text-sm font-bold text-white shadow-kaam"
            >
              {ml ? "ഫലങ്ങൾ കാണിക്കൂ" : "Show results"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({ label, sub, on, onClick }: { label: string; sub: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
        on ? "border-good bg-good-light" : "border-line bg-white"
      }`}
    >
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block text-[11px] text-mid">{sub}</span>
      </span>
      <span className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-good" : "bg-line"}`}>
        <span className={`absolute h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export { SORT_LABEL };
