import type { NextConfig } from "next";

/**
 * Security response headers applied to every route. These are the
 * "never-break-functionality" hardening layer:
 *  - HSTS forces HTTPS for a year (browsers remember).
 *  - X-Frame-Options blocks click-jacking (KAAM embedded in an iframe).
 *  - nosniff stops MIME-type confusion attacks.
 *  - Referrer-Policy avoids leaking full URLs to third parties.
 *  - Permissions-Policy disables device APIs the app doesn't use (camera, mic),
 *    leaving geolocation on for nearest-first search.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
