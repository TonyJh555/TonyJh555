"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

/**
 * "How KAAM works" — a dead-simple, picture-led, bilingual (English +
 * Malayalam) walkthrough for skilled workers who may not read English
 * comfortably. Eight steps from going online to getting paid. Collapsible
 * so it never gets in the way of a working pro.
 */
const STEPS: { icon: string; en: string; ml: string }[] = [
  { icon: "🟢", en: "Go online", ml: "ഓൺലൈൻ ആകുക" },
  { icon: "🔔", en: "A job in your trade arrives", ml: "നിങ്ങളുടെ ജോലി വരും" },
  { icon: "✓", en: "Accept the job", ml: "സ്വീകരിക്കുക" },
  { icon: "📍", en: "Reach the customer", ml: "സ്ഥലത്ത് എത്തുക" },
  { icon: "🔐", en: "Enter their OTP to start", ml: "OTP നൽകി തുടങ്ങുക" },
  { icon: "🔧", en: "Do the work", ml: "ജോലി ചെയ്യുക" },
  { icon: "🏁", en: "Mark complete", ml: "പൂർത്തിയാക്കുക" },
  { icon: "💰", en: "Money comes to your bank", ml: "പണം ബാങ്കിൽ വരും" },
];

export function WorkerGuide() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <span className="text-left">
          <span className="block text-sm font-bold">❓ How KAAM works</span>
          <span className="block text-[11px] text-mid">കാം എങ്ങനെ പ്രവർത്തിക്കുന്നു — 8 steps</span>
        </span>
        <span className="text-mid">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <ol className="mt-3 flex flex-col gap-2">
          {STEPS.map((s, i) => (
            <li key={s.en} className="flex items-center gap-3 rounded-xl bg-surf p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kaam text-sm font-extrabold text-white">
                {i + 1}
              </span>
              <span className="text-xl">{s.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{s.en}</span>
                <span className="block text-[11px] text-mid">{s.ml}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
