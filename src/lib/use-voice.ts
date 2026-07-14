"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Lang } from "./i18n";

/**
 * Voice input (speech-to-text) and output (text-to-speech) built on the
 * browser's Web Speech API — free, offline-capable on most Android phones,
 * and available in every language KAAM supports. Designed for elderly and
 * low-literacy users who prefer speaking over typing.
 */

/** BCP-47 locales for speech recognition & synthesis per app language. */
const SPEECH_LOCALE: Record<Lang, string> = {
  en: "en-IN",
  ml: "ml-IN",
};

/* Minimal typings — SpeechRecognition is not in TypeScript's DOM lib. */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseVoiceResult {
  /** Speech-to-text is available in this browser. */
  canListen: boolean;
  /** Text-to-speech is available in this browser. */
  canSpeak: boolean;
  listening: boolean;
  speaking: boolean;
  /** Live transcript while the user is speaking. */
  interim: string;
  /** Start listening; onFinal fires once with the finished sentence. */
  startListening: (onFinal: (transcript: string) => void) => void;
  stopListening: () => void;
  /** Read text aloud in the app's language. */
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

/** Capabilities never change after page load — expose them SSR-safely. */
const noopSubscribe = () => () => {};

export function useVoice(lang: Lang): UseVoiceResult {
  const canListen = useSyncExternalStore(
    noopSubscribe,
    () => getRecognitionCtor() !== null,
    () => false,
  );
  const canSpeak = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const startListening = useCallback(
    (onFinal: (transcript: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor || listening) return;

      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.lang = SPEECH_LOCALE[lang];
      recognition.continuous = false;
      recognition.interimResults = true;

      let finalTranscript = "";
      recognition.onresult = (event) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalTranscript += result[0].transcript;
          else interimText += result[0].transcript;
        }
        setInterim(finalTranscript + interimText);
      };
      recognition.onend = () => {
        setListening(false);
        setInterim("");
        const spoken = finalTranscript.trim();
        if (spoken) onFinal(spoken);
      };
      recognition.onerror = () => {
        setListening(false);
        setInterim("");
      };

      setListening(true);
      recognition.start();
    },
    [lang, listening],
  );

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LOCALE[lang];
      utterance.rate = 0.92; // slightly slower — easier for elderly listeners
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [lang],
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return { canListen, canSpeak, listening, speaking, interim, startListening, stopListening, speak, stopSpeaking };
}
