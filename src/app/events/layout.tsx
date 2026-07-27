import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "KAAM for Event Companies — Get wedding & function work",
};

/**
 * Event-company portal shell. Needs the language context for the same reason
 * the worker portal does: shared components read it, and without the provider
 * they crash the page at prerender.
 */
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
