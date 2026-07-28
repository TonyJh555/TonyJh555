"use client";

import { useContent } from "./content";
import { DEFAULT_FAQS } from "@/data/faqs";

/**
 * The Help centre's questions, owner-editable.
 *
 * Support content is the part of an app that is never finished: an answer goes
 * stale the week a policy changes, and the question everybody suddenly asks is
 * never the one you wrote. Needing a developer for that means the wrong answer
 * stays up for a fortnight.
 *
 * Sanitised on read for the same reason as the money settings: a broken or
 * half-written document must show the shipped questions, never an empty Help
 * page. An entry missing its Malayalam falls back to its English rather than
 * rendering blank — a customer reading Malayalam is better served by an answer
 * in the wrong language than by nothing at all.
 */

export interface Faq {
  q: string;
  qMl: string;
  a: string;
  aMl: string;
}

export const FAQ_KEY = "content.faqs";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** One entry, made safe, or null if there is no question and answer in it. */
export function sanitiseFaq(raw: unknown): Faq | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const q = text(r.q);
  const a = text(r.a);
  if (!q || !a) return null;
  return { q, a, qMl: text(r.qMl) || q, aMl: text(r.aMl) || a };
}

/** The list, made safe. An empty or unusable document falls back to shipped. */
export function sanitiseFaqs(raw: unknown): Faq[] {
  if (!Array.isArray(raw)) return DEFAULT_FAQS;
  const out = raw.map(sanitiseFaq).filter((f): f is Faq => f !== null);
  return out.length > 0 ? out : DEFAULT_FAQS;
}

export function useFaqs(): Faq[] {
  return sanitiseFaqs(useContent<unknown>(FAQ_KEY, DEFAULT_FAQS));
}

export { DEFAULT_FAQS };
