import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaam.app";
const DESCRIPTION =
  "Kerala's own on-demand marketplace for verified skilled workers — electricians, plumbers, nurses, maids, cooks, tutors and musicians, nearest-first across all 14 districts. Book, track and pay in the app.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KAAM — Kerala's Verified Workers, Near You",
    template: "%s · KAAM",
  },
  description: DESCRIPTION,
  applicationName: "KAAM",
  keywords: [
    "Kerala services", "home services Kerala", "electrician near me", "home nurse Kerala",
    "maid", "cook", "plumber", "tutor", "KAAM", "on-demand workers", "Kochi", "Thiruvananthapuram",
  ],
  authors: [{ name: "KAAM" }],
  category: "marketplace",
  openGraph: {
    type: "website",
    siteName: "KAAM",
    title: "KAAM — Kerala's Verified Workers, Near You",
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_IN",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "KAAM" }],
  },
  twitter: {
    card: "summary",
    title: "KAAM — Kerala's Verified Workers, Near You",
    description: DESCRIPTION,
    images: ["/icon.png"],
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KAAM",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#C41E3A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${jakarta.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('kaam.theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
