import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaam.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Crawl the public app; keep the admin console and APIs out of search.
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
