"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import {
  KERALA_CITIES,
  setMyApplicationId,
  slaHoursLeft,
  submitApplication,
  useApplications,
} from "@/lib/applications";
import { compressImage, MediaTooLargeError, readVideo } from "@/lib/media";
import type { CategoryId } from "@/lib/types";
import { Card, Tag } from "@/components/ui";

type Step = 1 | 2 | 3;

/** One tappable upload slot with preview. */
function UploadSlot({
  label,
  required,
  value,
  onFile,
  accept = "image/*",
}: {
  label: string;
  required?: boolean;
  value?: string;
  onFile: (file: File) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`relative flex h-28 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center ${
        value ? "border-good bg-good-light" : "border-line bg-surf"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <span className="relative rounded-full bg-good px-3 py-1 text-[11px] font-bold text-white">
            ✓ {label} uploaded — tap to change
          </span>
        </>
      ) : (
        <>
          <span className="text-2xl">📄</span>
          <span className="mt-1 text-xs font-bold text-mid">
            {label} {required ? <span className="text-kaam">*</span> : "(optional)"}
          </span>
          <span className="text-[10px] text-dim">Tap to upload</span>
        </>
      )}
    </button>
  );
}

export default function WorkerSignupPage() {
  const applications = useApplications();
  const [step, setStep] = useState<Step>(1);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Step 1 — profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(KERALA_CITIES[0]);
  const [categoryId, setCategoryId] = useState<CategoryId>("elec");
  const [experienceYears, setExperienceYears] = useState(3);
  const [bio, setBio] = useState("");

  // Step 2 — KYC docs
  const [aadhaarFront, setAadhaarFront] = useState<string>();
  const [aadhaarBack, setAadhaarBack] = useState<string>();
  const [certificate, setCertificate] = useState<string>();

  // Step 3 — work proof + social profiles (optional)
  const [media, setMedia] = useState<{ kind: "image" | "video"; dataUrl: string }[]>([]);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");

  const submitted = useMemo(
    () => applications.find((a) => a.id === submittedId),
    [applications, submittedId],
  );

  const handleDoc = (setter: (v: string) => void) => async (file: File) => {
    setNotice(null);
    try {
      setter(await compressImage(file));
    } catch {
      setNotice("Couldn't read that image — try another photo.");
    }
  };

  const addMedia = async (file: File) => {
    setNotice(null);
    try {
      const isVideo = file.type.startsWith("video/");
      const dataUrl = isVideo ? await readVideo(file) : await compressImage(file);
      const kind: "image" | "video" = isVideo ? "video" : "image";
      setMedia((m) => [...m, { kind, dataUrl }].slice(0, 4));
    } catch (error) {
      setNotice(
        error instanceof MediaTooLargeError
          ? error.message
          : "Couldn't read that file — try another photo or a shorter video.",
      );
    }
  };

  const submit = () => {
    const id = submitApplication({
      name: name.trim(),
      phone: phone.trim(),
      city,
      categoryId,
      experienceYears,
      bio: bio.trim(),
      social: {
        instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
        facebook: facebook.trim() || undefined,
        website: website.trim() || undefined,
      },
      docs: { aadhaarFront, aadhaarBack, certificate },
      media,
    });
    if (!id) {
      setNotice("Storage full — remove a video and try again.");
      return;
    }
    setMyApplicationId(id); // so the worker portal can show their approval status
    setSubmittedId(id);
  };

  const step1Valid = name.trim().length >= 3 && /^\d{10}$/.test(phone.trim());
  const step2Valid = Boolean(aadhaarFront && aadhaarBack);

  /* ── Status screen after submitting ────────────────── */
  if (submitted) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-page px-4 pt-10 pb-10">
        <div className="fade-up text-center">
          {submitted.status === "pending" && (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-warn-light text-4xl">
                ⏳
              </div>
              <h1 className="font-display text-xl font-extrabold">Application Under Review</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-mid">
                Thanks, {submitted.name.split(" ")[0]}! Our verification team is checking your
                documents. You&apos;ll be approved to work with KAAM within{" "}
                <strong>{slaHoursLeft(submitted)} hours</strong>.
              </p>
              <Card className="mx-auto mt-6 max-w-xs text-left">
                <p className="text-xs font-bold tracking-wide text-dim uppercase">What happens next</p>
                <ul className="mt-2 flex flex-col gap-2 text-xs text-mid">
                  <li>1️⃣ Aadhaar & document check</li>
                  <li>2️⃣ Phone verification call</li>
                  <li>3️⃣ Approval SMS + you go live on KAAM</li>
                </ul>
              </Card>
            </>
          )}
          {submitted.status === "approved" && (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-good-light text-4xl">
                🎉
              </div>
              <h1 className="font-display text-xl font-extrabold">You&apos;re Approved!</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-mid">
                Welcome to KAAM, {submitted.name.split(" ")[0]}! You can now go online and start
                receiving jobs in {submitted.city}.
              </p>
              <Link
                href="/worker"
                className="mt-6 inline-block rounded-xl bg-good px-8 py-3.5 text-sm font-bold text-white"
              >
                Open Worker Dashboard →
              </Link>
            </>
          )}
          {submitted.status === "rejected" && (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-kaam-light text-4xl">
                📋
              </div>
              <h1 className="font-display text-xl font-extrabold">More Info Needed</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-mid">
                {submitted.rejectReason ||
                  "Our team couldn't verify your documents. Please apply again with clearer photos."}
              </p>
              <button
                onClick={() => {
                  setSubmittedId(null);
                  setStep(2);
                }}
                className="mt-6 rounded-xl bg-kaam px-8 py-3.5 text-sm font-bold text-white shadow-kaam"
              >
                Re-upload Documents
              </button>
            </>
          )}
          <p className="mt-8 text-[10px] text-dim">
            Application ID: <span className="font-mono">{submitted.id}</span>
          </p>
        </div>
      </div>
    );
  }

  /* ── Signup wizard ─────────────────────────────────── */
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-page pb-10">
      <header className="bg-ink px-4 pt-6 pb-6 text-white">
        <Link href="/worker" className="text-xs font-bold text-white/60 hover:text-white">
          ← Worker Portal
        </Link>
        <h1 className="mt-2 font-display text-xl font-extrabold">
          Earn with KAAM <span className="text-kaam-bright">🔨</span>
        </h1>
        <p className="text-xs text-white/60">
          Keep 85% of every job · weekly payouts · free insurance
        </p>
        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-kaam-bright" : "bg-white/20"}`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] font-semibold text-white/50">
          Step {step} of 3 ·{" "}
          {step === 1 ? "About you" : step === 2 ? "KYC documents" : "Show your work (optional)"}
        </p>
      </header>

      <main className="px-4 pt-5">
        {notice && (
          <p className="mb-3 rounded-xl bg-warn-light p-3 text-xs font-semibold text-warn">{notice}</p>
        )}

        {step === 1 && (
          <Card className="fade-up">
            <label className="mb-1 block text-xs font-bold text-mid">Full name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As on your Aadhaar card"
              className="mb-4 w-full rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none focus:border-kaam"
            />
            <label className="mb-1 block text-xs font-bold text-mid">Mobile number *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit number for OTP & job alerts"
              className="mb-4 w-full rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none focus:border-kaam"
            />
            <label className="mb-1 block text-xs font-bold text-mid">City *</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mb-4 w-full rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none"
            >
              {KERALA_CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <label className="mb-1 block text-xs font-bold text-mid">Your trade *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value as CategoryId)}
              className="mb-4 w-full rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-xs font-bold text-mid">
              Years of experience: <span className="text-kaam">{experienceYears}</span>
            </label>
            <input
              type="range"
              min={0}
              max={30}
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              className="mb-4 w-full accent-[#C41E3A]"
            />
            <label className="mb-1 block text-xs font-bold text-mid">About your work</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="e.g. 8 years fixing ACs, all brands, doorstep service"
              className="mb-4 w-full resize-none rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none focus:border-kaam"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
            >
              Continue to KYC →
            </button>
          </Card>
        )}

        {step === 2 && (
          <div className="fade-up">
            <Card>
              <p className="mb-1 text-sm font-bold">🪪 Identity verification</p>
              <p className="mb-4 text-xs text-mid">
                Clear photos of your Aadhaar card. This keeps customers safe and gets you the
                &quot;Verified ✅&quot; badge.
              </p>
              <div className="flex flex-col gap-3">
                <UploadSlot label="Aadhaar — front" required value={aadhaarFront} onFile={handleDoc(setAadhaarFront)} />
                <UploadSlot label="Aadhaar — back" required value={aadhaarBack} onFile={handleDoc(setAadhaarBack)} />
                <UploadSlot label="Trade certificate / license" value={certificate} onFile={handleDoc(setCertificate)} />
              </div>
            </Card>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-line bg-surf py-3.5 text-sm font-bold text-mid"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!step2Valid}
                className="flex-[2] rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-up">
            <Card>
              <p className="mb-1 text-sm font-bold">📸 Show customers your work (optional)</p>
              <p className="mb-4 text-xs text-mid">
                Photos or short videos of jobs you&apos;ve done. Profiles with work proof get up
                to 3× more bookings.
              </p>
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addMedia(file);
                  e.target.value = "";
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                {media.map((m, i) => (
                  <div key={i} className="relative h-24 overflow-hidden rounded-xl border border-line">
                    {m.kind === "image" ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={m.dataUrl} alt="Work proof" className="h-full w-full object-cover" />
                    ) : (
                      <video src={m.dataUrl} className="h-full w-full object-cover" />
                    )}
                    <button
                      onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-xs text-white"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                    {m.kind === "video" && (
                      <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 text-[9px] font-bold text-white">
                        🎥 video
                      </span>
                    )}
                  </div>
                ))}
                {media.length < 4 && (
                  <button
                    onClick={() => mediaInputRef.current?.click()}
                    className="flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surf"
                  >
                    <span className="text-xl">➕</span>
                    <span className="text-[10px] font-bold text-mid">Add photo / video</span>
                  </button>
                )}
              </div>
            </Card>

            <Card className="mt-4">
              <p className="mb-1 text-sm font-bold">🔗 Social media (optional)</p>
              <p className="mb-4 text-xs text-mid">
                Artists & performers — link your Instagram, YouTube or page so customers can see
                your published work. Shown on your KAAM profile.
              </p>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surf px-3">
                  <span className="text-base">📸</span>
                  <input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="Instagram username or link"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surf px-3">
                  <span className="text-base">▶️</span>
                  <input
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="YouTube channel link"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surf px-3">
                  <span className="text-base">👍</span>
                  <input
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="Facebook page link"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surf px-3">
                  <span className="text-base">🌐</span>
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website / portfolio link"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  />
                </div>
              </div>
            </Card>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 rounded-xl border border-line bg-surf py-3.5 text-sm font-bold text-mid"
              >
                ← Back
              </button>
              <button
                onClick={submit}
                className="flex-[2] rounded-xl bg-good py-3.5 text-sm font-bold text-white"
              >
                Submit for Verification ✓
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] text-dim">
              By submitting you agree to KAAM&apos;s worker terms. Our team reviews applications
              within 24 hours.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Tag color="green">85% earnings</Tag>
          <Tag color="blue">Weekly payouts</Tag>
          <Tag color="yellow">Free insurance</Tag>
        </div>
      </main>
    </div>
  );
}
