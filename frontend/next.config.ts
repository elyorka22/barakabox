import path from "path";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

function getHostname(urlValue?: string) {
  if (!urlValue) return "";
  try {
    return new URL(urlValue).hostname;
  } catch {
    return "";
  }
}

const siteHostname = getHostname(process.env.NEXT_PUBLIC_SITE_URL);
const apiHostname = getHostname(process.env.NEXT_PUBLIC_API_BASE_URL);
const assetHostname = getHostname(process.env.NEXT_PUBLIC_ASSET_BASE_URL);
const remoteImageHostnames = Array.from(
  new Set(
    [
      "chust-online-bozor.uz",
      "test.fra1.digitaloceanspaces.com",
      siteHostname,
      apiHostname,
      assetHostname,
    ].filter(Boolean),
  ),
);

/** Monorepo root (contains `shared/`) so standalone output traces the alias import. */
const tracingRoot = path.join(__dirname, "..");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: false,
    clientsClaim: true,
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Standalone for local/CI; Docker uses `next start` and sets DOCKER_BUILD=1 (see frontend/Dockerfile).
  ...(process.env.DOCKER_BUILD === "1" ? {} : { output: "standalone" as const }),
  compress: true,
  poweredByHeader: false,
  outputFileTracingRoot: tracingRoot,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@onlinebozor/product-units": path.resolve(__dirname, "../shared/product-units.ts"),
    };
    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.digitaloceanspaces.com" },
      { protocol: "https", hostname: "**.digitaloceanspaces.com" },
      { protocol: "https", hostname: "*.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "**.cdn.digitaloceanspaces.com" },
      ...remoteImageHostnames.flatMap((hostname) => [
        { protocol: "https" as const, hostname },
        { protocol: "http" as const, hostname },
      ]),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|webp|svg|gif|woff|woff2)$",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(sitemap.xml|robots.txt)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
