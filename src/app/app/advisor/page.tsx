"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCategory } from "@/data/categories";
import { WORKERS } from "@/data/workers";
import { rankWorkers } from "@/lib/matching";
import { shortId } from "@/lib/format";
import { useVoice, SPEECH_LANGS } from "@/lib/use-voice";
import type { CategoryId } from "@/lib/types";
import { BackLink, Tag } from "@/components/ui";
import { WorkerCard } from "@/components/worker-card";
import { useLanguage } from "@/components/language-provider";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  categoryId?: CategoryId | null;
  altCategoryId?: CategoryId | null;
  urgency?: "low" | "medium" | "high";
  safetyTips?: string[];
  source?: "claude" | "rules";
}

const STARTERS = [
  "എന്റെ ഫാൻ ശബ്ദമുണ്ടാക്കുന്നു 🔧",
  "Need a violinist for my wedding 🎻",
  "അമ്മയ്ക്ക് ഒരു നഴ്സിനെ വേണം",
  "Water leaking under the sink 💧",
];

export default function AdvisorPage() {
  const { lang } = useLanguage();
  const voice = useVoice(lang);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  // Which language the user speaks to the mic in — defaults to the UI language.
  const [voiceLocale, setVoiceLocale] = useState(lang === "ml" ? "ml-IN" : "en-IN");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  const send = async (text: string, { spoken = false } = {}) => {
    const content = text.trim();
    if (!content || loading) return;
    const history = [...messages, { id: shortId(), role: "user" as const, content }];
    setMessages(history);
    setDraft("");
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Omit<Msg, "id" | "role">;
      const assistant: Msg = { id: shortId(), role: "assistant", ...data };
      setMessages((m) => [...m, assistant]);
      if (spoken && voice.canSpeak && data.content) voice.speak(data.content, voiceLocale);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: shortId(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
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
      setDraft(transcript);
      send(transcript, { spoken: true });
    }, voiceLocale);
  };

  return (
    <main className="flex min-h-screen flex-col px-4 pt-5">
      <header className="mb-3 flex items-center gap-3">
        <BackLink href="/app" />
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold">🤖 KAAM Assist</h1>
          <p className="text-[11px] text-dim">Ask in any language — Malayalam, English, Hindi…</p>
        </div>
      </header>

      {messages.some((m) => m.role === "assistant" && m.source === "rules") && (
        <div className="mb-3 rounded-xl border border-warn-mid bg-warn-light px-3 py-2 text-[11px] leading-relaxed text-warn">
          ⚡ <b>Basic mode</b> — full multilingual AI (Malayalam &amp; every language) needs an
          <b> ANTHROPIC_API_KEY</b> in Vercel → Settings → Environment Variables. Until then, replies
          use simple English keyword matching.
        </div>
      )}

      {/* Conversation */}
      <div className="flex-1 space-y-3 pb-40">
        {messages.length === 0 && !loading && (
          <div className="fade-up">
            <div className="rounded-2xl rounded-tl-md border border-line bg-white p-3 text-sm shadow-card">
              നമസ്കാരം! 👋 എന്ത് സഹായമാണ് വേണ്ടത്? നിങ്ങളുടെ പ്രശ്നം ഏത് ഭാഷയിലും പറയാം.
              <br />
              <span className="text-mid">
                Hello! Tell me what you need — in Malayalam, English, or any language.
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-line bg-white p-3 text-left text-xs font-semibold text-mid shadow-card hover:border-kaam"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-kaam px-3.5 py-2.5 text-sm text-white shadow-card">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="fade-up">
              <div className="max-w-[90%] rounded-2xl rounded-tl-md border border-line bg-white px-3.5 py-2.5 text-sm shadow-card">
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {voice.canSpeak && (
                  <button
                    onClick={() => (voice.speaking ? voice.stopSpeaking() : voice.speak(m.content, voiceLocale))}
                    className="mt-1.5 text-[11px] font-bold text-info"
                  >
                    {voice.speaking ? "⏹ Stop" : "🔊 Listen"}
                  </button>
                )}
              </div>

              {m.urgency === "high" && (m.safetyTips?.length ?? 0) > 0 && (
                <div className="mt-2 max-w-[90%] rounded-xl border border-warn-mid bg-warn-light p-2.5">
                  <p className="mb-1 text-[10px] font-bold tracking-wide text-warn uppercase">
                    🛡️ Safety first
                  </p>
                  {m.safetyTips!.map((tip) => (
                    <p key={tip} className="text-[11px] leading-relaxed text-warn">
                      • {tip}
                    </p>
                  ))}
                </div>
              )}

              {m.categoryId && <Recommendation categoryId={m.categoryId} />}
            </div>
          ),
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-dim">
            <span className="flex gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-dim" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-dim [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-dim [animation-delay:300ms]" />
            </span>
            KAAM Assist is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-page px-4 py-3">
        {voice.listening && (
          <p className="mb-2 rounded-lg bg-kaam-light px-3 py-1.5 text-xs font-semibold text-kaam">
            🎤 Listening… {voice.interim}
          </p>
        )}
        {voice.canListen && !voice.listening && (
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-dim">🎤 Speak in</span>
            <select
              value={voiceLocale}
              onChange={(e) => setVoiceLocale(e.target.value)}
              aria-label="Voice language"
              className="rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold text-mid outline-none focus:border-kaam"
            >
              {SPEECH_LANGS.map((l) => (
                <option key={l.locale} value={l.locale}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          {voice.canListen && (
            <button
              onClick={handleMic}
              aria-label={voice.listening ? "Stop" : "Speak"}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${
                voice.listening ? "animate-pulse bg-kaam" : "bg-good"
              }`}
            >
              <span className="text-lg">{voice.listening ? "⏹" : "🎤"}</span>
            </button>
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(draft);
            }}
            placeholder="Type your message…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-kaam"
          />
          <button
            onClick={() => send(draft)}
            disabled={!draft.trim() || loading}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kaam text-lg text-white shadow-kaam disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </div>
    </main>
  );
}

/** Inline worker recommendation for a suggested category. */
function Recommendation({ categoryId }: { categoryId: CategoryId }) {
  const category = getCategory(categoryId);
  const workers = rankWorkers(WORKERS.filter((w) => w.categoryId === categoryId)).slice(0, 2);
  return (
    <div className="mt-2 max-w-[92%]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-kaam-light text-lg">
          {category.icon}
        </span>
        <p className="text-xs font-bold">{category.label}</p>
        <Link href={`/app/search?cat=${category.id}`} className="ml-auto text-[11px] font-bold text-kaam">
          View all →
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {workers.map((w) => (
          <WorkerCard key={w.id} worker={w} />
        ))}
        {workers.length === 0 && (
          <Tag color="gray">No {category.label.toLowerCase()} online right now — see the full list</Tag>
        )}
      </div>
    </div>
  );
}
