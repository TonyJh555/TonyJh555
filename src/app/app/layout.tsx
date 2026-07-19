import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-provider";
import { BottomNav } from "@/components/bottom-nav";
import { CustomerNotifier } from "@/components/customer-notifier";
import { PwaInstall } from "@/components/pwa-install";
import { OnboardingTour } from "@/components/onboarding-tour";
import { MandatoryRating } from "@/components/mandatory-rating";
import { DispatchEngine } from "@/components/dispatch-engine";

export const metadata: Metadata = {
  title: "KAAM App — Book Verified Workers",
};

export default function UserAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-page pb-24 shadow-[0_0_40px_rgba(0,0,0,0.15)] max-[430px]:shadow-none">
        {children}
        <BottomNav />
        <CustomerNotifier />
        <PwaInstall />
        <OnboardingTour />
        <MandatoryRating />
        <DispatchEngine />
      </div>
    </LanguageProvider>
  );
}
