import type { MetadataRoute } from "next";

/** PWA manifest — makes KAAM installable from the browser to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAAM — Find Verified Workers Near You",
    short_name: "KAAM",
    description:
      "India's trusted services marketplace. Book electricians, plumbers, nurses, violinists and 26 more verified services.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F7F9FC",
    theme_color: "#C41E3A",
    orientation: "portrait",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
