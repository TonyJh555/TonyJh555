import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "KAAM Worker — Your Jobs & Earnings",
};

/**
 * Worker portal shell.
 *
 * The worker app deliberately shows both languages inline (no toggle) so a
 * worker never has to hunt for a setting. It still needs the language context,
 * because components shared with the customer app — chat, price breakdown,
 * alerts, job completion — read it. Without this provider those components
 * crash the page.
 */
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
