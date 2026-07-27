"use client";

import { useState } from "react";
import { compressImage } from "@/lib/media";
import { updateCompany, type EventCompany } from "@/lib/event-store";
import { useLanguage } from "@/components/language-provider";

/**
 * A company's past work — the thing that actually wins a wedding.
 *
 * Nobody hands over three lakh and a December date on the strength of a star
 * rating. They want to see the stage this company built last season. Every
 * other trade on KAAM can lean on reviews because the job is small enough to
 * risk once; an event happens exactly once and cannot be re-done, so the
 * photographs are the evidence.
 *
 * Images are compressed on the device before they are stored, the same as
 * worker KYC media, so a company uploading straight off a DSLR doesn't blow
 * the storage quota on its first upload.
 */

export const MAX_PORTFOLIO = 8;

/** Add and remove work photos. Used at registration and afterwards. */
export function PortfolioEditor({
  photos,
  onChange,
  busy,
}: {
  photos: EventCompany["portfolio"];
  onChange: (next: EventCompany["portfolio"]) => void;
  busy?: boolean;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const full = photos.length >= MAX_PORTFOLIO;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setWorking(true);
    setError(null);
    const room = MAX_PORTFOLIO - photos.length;
    const next = [...photos];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        next.push({ kind: "image", dataUrl: await compressImage(file) });
      } catch {
        setError(ml ? "ഒരു ചിത്രം വായിക്കാനായില്ല." : "One picture could not be read.");
      }
    }
    onChange(next);
    setWorking(false);
  };

  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] font-bold text-mid">
        {ml ? "കഴിഞ്ഞ ജോലികളുടെ ചിത്രങ്ങൾ" : "Photos of your past work"}
        <span className="ml-1 font-semibold text-dim">
          {photos.length}/{MAX_PORTFOLIO}
        </span>
      </p>
      <p className="mb-2 text-[10px] leading-relaxed text-dim">
        {ml
          ? "ഇതാണ് ഏറ്റവും പ്രധാനം. റേറ്റിംഗ് നോക്കിയല്ല, നിങ്ങൾ ചെയ്ത സ്റ്റേജ് കണ്ടിട്ടാണ് ആളുകൾ തിരഞ്ഞെടുക്കുന്നത്."
          : "This matters more than anything else here. People choose on the stage you built, not on a star rating."}
      </p>

      {photos.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-1.5">
          {photos.map((m, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.dataUrl}
                alt={ml ? `ജോലി ${i + 1}` : `Work ${i + 1}`}
                className="h-16 w-full rounded-lg border border-line object-cover"
              />
              <button
                onClick={() => onChange(photos.filter((_, x) => x !== i))}
                aria-label={ml ? "നീക്കം ചെയ്യൂ" : "Remove"}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        className={`block rounded-xl border border-dashed border-line bg-surf py-3 text-center text-[11px] font-bold ${
          full || busy ? "text-dim" : "cursor-pointer text-kaam"
        }`}
      >
        {working
          ? ml ? "ചേർക്കുന്നു…" : "Adding…"
          : full
            ? ml ? "8 ചിത്രങ്ങൾ ആയി" : "8 photos is the limit"
            : `⬆ ${ml ? "ചിത്രങ്ങൾ ചേർക്കൂ" : "Add photos"}`}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={full || busy || working}
          onChange={(e) => add(e.target.files)}
          className="hidden"
        />
      </label>

      {error && <p className="mt-1 text-[11px] font-semibold text-kaam">{error}</p>}
    </div>
  );
}

/**
 * The same editor, wired straight to a saved company — so a business can keep
 * adding work after it has been approved, which is when it has new photographs
 * and the strongest reason to.
 */
export function LivePortfolio({ company }: { company: EventCompany }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-extrabold text-ink">
        📸 {ml ? "നിങ്ങളുടെ ജോലികൾ" : "Your work"}
      </p>
      <PortfolioEditor
        photos={company.portfolio}
        onChange={(portfolio) => updateCompany(company.id, { portfolio })}
      />
    </div>
  );
}

/** Read-only strip for the customer and the admin desk. */
export function PortfolioStrip({
  photos,
  size = 56,
}: {
  photos: EventCompany["portfolio"];
  size?: number;
}) {
  if (photos.length === 0) return null;
  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {photos.map((m, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={i}
          src={m.dataUrl}
          alt={`Work ${i + 1}`}
          style={{ width: size, height: size }}
          className="shrink-0 rounded-lg border border-line object-cover"
        />
      ))}
    </div>
  );
}
