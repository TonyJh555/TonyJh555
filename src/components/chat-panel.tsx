"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  markThreadRead,
  QUICK_REPLIES,
  sendMessage,
  useChatMessages,
  type ChatMessage,
} from "@/lib/chat";
import { compressImage, MediaTooLargeError, readVideo } from "@/lib/media";
import { useLanguage } from "@/components/language-provider";

/** Render text with URLs as clickable links. */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.sender === "system") {
    return (
      <div className="my-1 text-center">
        <span className="rounded-full bg-surf px-3 py-1 text-[10px] font-semibold text-mid">
          {message.text} · {time}
        </span>
      </div>
    );
  }

  const read = mine && message.readByUser && message.readByWorker;
  let body: ReactNode;
  if (message.kind === "image" && message.dataUrl) {
    body = (
      <a href={message.dataUrl} target="_blank" rel="noopener noreferrer">
        {/* Data-URL image from local store — next/image adds nothing here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={message.dataUrl} alt="Shared photo" className="max-h-56 w-full rounded-xl object-cover" />
      </a>
    );
  } else if (message.kind === "video" && message.dataUrl) {
    body = <video src={message.dataUrl} controls playsInline className="max-h-56 w-full rounded-xl" />;
  } else {
    body = (
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
        <Linkify text={message.text ?? ""} />
      </p>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-card ${
          mine ? "rounded-br-md bg-kaam text-white" : "rounded-bl-md border border-line bg-white text-ink"
        }`}
      >
        {message.kind !== "text" && message.text && (
          <p className="mb-1 text-[13px]">{message.text}</p>
        )}
        {body}
        <p className={`mt-1 text-right text-[9px] ${mine ? "text-white/70" : "text-dim"}`}>
          {time}
          {mine && <span className={read ? "ml-1" : "ml-1 opacity-50"}>✓✓</span>}
        </p>
      </div>
    </div>
  );
}

export function ChatPanel({
  bookingId,
  side,
  heightClass = "h-72",
}: {
  bookingId: string;
  side: "user" | "worker";
  heightClass?: string;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const allMessages = useChatMessages();
  const messages = useMemo(
    () => allMessages.filter((m) => m.bookingId === bookingId),
    [allMessages, bookingId],
  );
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markThreadRead(bookingId, side);
  }, [bookingId, side, allMessages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!sendMessage({ bookingId, sender: side, text: trimmed })) {
      setNotice((ml ? "സ്റ്റോറേജ് നിറഞ്ഞു — ചില മീഡിയ സന്ദേശങ്ങൾ നീക്കം ചെയ്യൂ." : "Storage full — delete some media messages."));
      return;
    }
    setDraft("");
  };

  const attach = async (file: File) => {
    setAttaching(true);
    setNotice(null);
    try {
      const isVideo = file.type.startsWith("video/");
      const dataUrl = isVideo ? await readVideo(file) : await compressImage(file);
      const ok = sendMessage({
        bookingId,
        sender: side,
        kind: isVideo ? "video" : "image",
        dataUrl,
      });
      if (!ok) setNotice("Storage full — this file doesn't fit. Try a photo instead.");
    } catch (error) {
      setNotice(
        error instanceof MediaTooLargeError
          ? error.message
          : "Couldn't read that file — try a different photo or video.",
      );
    } finally {
      setAttaching(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-page">
      <div className={`${heightClass} flex flex-col gap-2 overflow-y-auto p-3`}>
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-dim">
            💬 Say hello! Share photos or videos of the {side === "user" ? "problem" : "work"} —
            everything stays inside KAAM, no phone numbers needed.
          </p>
        )}
        {messages.map((message) => (
          <Bubble key={message.id} message={message} mine={message.sender === side} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t border-line bg-white px-2 pt-2">
        {QUICK_REPLIES[side].map((reply) => (
          <button
            key={reply}
            onClick={() => send(reply)}
            className="shrink-0 rounded-full border border-line bg-surf px-3 py-1 text-[11px] font-semibold text-mid hover:border-kaam hover:text-kaam"
          >
            {reply}
          </button>
        ))}
      </div>

      {notice && (
        <p className="bg-warn-light px-3 py-1.5 text-[11px] font-semibold text-warn">{notice}</p>
      )}

      <div className="flex items-center gap-2 bg-white p-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) attach(file);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={attaching}
          aria-label={ml ? "ഫോട്ടോ അല്ലെങ്കിൽ വീഡിയോ ചേർക്കൂ" : "Attach photo or video"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surf text-lg disabled:opacity-50"
        >
          {attaching ? "⏳" : "📎"}
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          placeholder={ml ? "സന്ദേശം എഴുതൂ…" : "Type a message…"}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surf px-3 py-2.5 text-sm outline-none focus:border-kaam"
        />
        <button
          onClick={() => send(draft)}
          disabled={!draft.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kaam text-lg text-white shadow-kaam disabled:opacity-40"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
