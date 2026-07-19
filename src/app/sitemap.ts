import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaam.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/app", priority: 0.9 },
    { path: "/app/search", priority: 0.8 },
    { path: "/app/advisor", priority: 0.7 },
    { path: "/worker", priority: 0.6 },
    { path: "/worker/signup", priority: 0.6 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
  ];
  return paths.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  }));
}
