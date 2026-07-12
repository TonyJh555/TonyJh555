"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBookings } from "@/lib/bookings";
import { useLanguage } from "./language-provider";

export function BottomNav() {
  const pathname = usePathname();
  const bookings = useBookings();
  const { t } = useLanguage();
  const active = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled").length;

  const tabs = [
    { href: "/app", icon: "🏠", label: t.home, badge: 0 },
    { href: "/app/search", icon: "🔍", label: t.search, badge: 0 },
    { href: "/app/bookings", icon: "📋", label: t.bookings, badge: active },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t border-line bg-white pt-2 pb-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 ${
              isActive ? "text-kaam" : "text-dim"
            }`}
          >
            {tab.badge > 0 && (
              <span className="absolute -top-0.5 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-kaam text-[9px] font-extrabold text-white">
                {tab.badge}
              </span>
            )}
            <span className={`text-xl transition-transform ${isActive ? "scale-110" : ""}`}>
              {tab.icon}
            </span>
            <span className="text-[9px] font-bold">{tab.label}</span>
            {isActive && (
              <span className="absolute -bottom-2 h-0.5 w-6 rounded-t bg-kaam" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
