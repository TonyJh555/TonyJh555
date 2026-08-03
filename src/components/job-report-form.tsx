"use client";

import { useState } from "react";
import {
  DID_OPTIONS,
  LEFT_OPTIONS,
  reportComplete,
  type DidId,
  type JobReport,
  type LeftId,
} from "@/lib/job-report";
import { compressImage } from "@/lib/media";
import { useLanguage } from "@/components/language-provider";

/**
 * What the worker did, in taps.
 *
 * The person filling this in may have left school at fourteen and is standing
 * on a ladder with one hand free. A text box would come back empty, and an
 * empty report is worse than none — everyone downstream assumes it says
 * something. So: chips for the two questions that matter, a short line for the
 * part, and photographs, which are the only evidence nobody argues with.
 *
 * It is asked once, at the moment the job closes, because that is the only
 * moment the worker is definitely still standing in front of the work.
 */
export function JobReportForm({
  onDone,
  onCancel,
}: {
  onDone: (report: JobReport) => void;
  onCancel: () => void;
}) {
  const ml = useLanguage().lang === "ml";
  const [did, setDid] = useState<DidId[]>([]);
  const [left, setLeft] = useState<LeftId | null>(null);
  const [part, setPart] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const draft = { did, left: left ?? undefined, photos };
  const ready = reportComplete(draft as Partial<JobReport>);

  const toggle = (id: DidId) =>
    setDid((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const next: string[] = [];
    // Four is plenty: enough to show before, after and a close-up, few enough
    // that a worker on mobile data is not waiting on an upload.
    for (const file of Array.from(files).slice(0, 4 - photos.length)) {
      try {
        next.push(await compressImage(file));
      } catch {
        /* skip a photo the phone can't read rather than block the report */
      }
    }
    setPhotos((cur) => [...cur, ...next].slice(0, 4));
    setBusy(false);
  };

  return (
    <div className="mt-3 rounded-2xl border-2 border-good bg-good-light p-3">
      <p className="text-xs font-extrabold text-good">
        📋 {ml ? "എന്താണ് ചെയ്തത്?" : "What did you do?"}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink">
        {ml
          ? "അമർത്തി തിരഞ്ഞെടുക്കൂ. ഇത് ഉപഭോക്താവ് കാണും — പിന്നീട് ഒരു തർക്കം വന്നാൽ നിങ്ങളുടെ തെളിവാണിത്."
          : "Just tap. The customer sees this — and if there's ever an argument later, it's your proof."}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {DID_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => toggle(o.id)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              did.includes(o.id)
                ? "border-good bg-good text-white"
                : "border-line bg-white text-mid"
            }`}
          >
            {ml ? o.labelMl : o.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs font-extrabold text-good">
        🔧 {ml ? "ഇനി ബാക്കിയുള്ളത്?" : "Anything left to do?"}
      </p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {LEFT_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setLeft(o.id)}
            className={`rounded-xl border px-3 py-2 text-left text-[11px] font-bold ${
              left === o.id ? "border-good bg-good text-white" : "border-line bg-white text-ink"
            }`}
          >
            {ml ? o.labelMl : o.label}
          </button>
        ))}
      </div>

      {/* Only worth asking once something is actually outstanding. */}
      {left && left !== "nothing" && (
        <input
          value={part}
          onChange={(e) => setPart(e.target.value.slice(0, 80))}
          placeholder={ml ? "ഏത് പാർട്സ്? (ഐച്ഛികം)" : "Which part? (optional)"}
          className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs outline-none focus:border-good"
        />
      )}

      <div className="mt-3">
        <label className="block cursor-pointer rounded-xl border border-dashed border-good-mid bg-white py-2.5 text-center text-[11px] font-bold text-good">
          📷 {photos.length > 0
            ? ml ? `${photos.length} ഫോട്ടോ ചേർത്തു — വേറെ ചേർക്കാം` : `${photos.length} photo${photos.length === 1 ? "" : "s"} added — add more`
            : ml ? "ഫോട്ടോ ചേർക്കൂ (ഐച്ഛികം)" : "Add photos (optional)"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addPhotos(e.target.files)}
          />
        </label>
        {photos.length > 0 && (
          <div className="mt-2 flex gap-2">
            {photos.map((p, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={i} src={p} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            onDone({
              did,
              left: left!,
              part: part.trim() || undefined,
              photos,
              at: new Date().toISOString(),
            })
          }
          disabled={!ready || busy}
          className="flex-1 rounded-xl bg-good py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
        >
          {ml ? "ജോലി തീർന്നു →" : "Work is done →"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-mid"
        >
          {ml ? "വേണ്ട" : "Back"}
        </button>
      </div>
      {!ready && (
        <p className="mt-1.5 text-center text-[11px] font-semibold text-mid">
          {ml
            ? "ചെയ്തത് ഒന്നെങ്കിലും തിരഞ്ഞെടുക്കൂ, പിന്നെ ബാക്കിയുള്ളത്."
            : "Pick at least one thing you did, then what's left."}
        </p>
      )}
    </div>
  );
}
