const FALLBACK_SITE_URL = "https://chust-online-bozor.uz";
const FALLBACK_ASSET_BASE_URL = "https://test.fra1.digitaloceanspaces.com";

const INVALID_HOSTS = new Set(["localhost", "127.0.0.1", "64.226.106.88"]);

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function getSiteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }
  return trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL);
}

function getAssetBaseUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_ASSET_BASE_URL || FALLBACK_ASSET_BASE_URL,
  );
}

function isSpacesHost(hostname: string) {
  return hostname.toLowerCase().endsWith(".digitaloceanspaces.com");
}

function shouldRewriteHost(hostname: string) {
  return INVALID_HOSTS.has(hostname.toLowerCase());
}

export function normalizeAssetUrl(input?: string | null): string {
  if (!input) return "";
  const raw = input.trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (isSpacesHost(parsed.hostname)) {
        parsed.protocol = "https:";
        return parsed.toString();
      }
      if (shouldRewriteHost(parsed.hostname)) {
        const fallback = new URL(getAssetBaseUrl());
        parsed.protocol = fallback.protocol;
        parsed.host = fallback.host;
      }
      return parsed.toString();
    } catch {
      return raw;
    }
  }

  const base = getAssetBaseUrl() || getSiteOrigin();
  if (raw.startsWith("/")) {
    return `${base}${raw}`;
  }

  return `${base}/${raw.replace(/^\/+/, "")}`;
}

export function normalizeAssetUrlsDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAssetUrlsDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(obj)) {
      if (
        typeof nested === "string" &&
        (key.toLowerCase().includes("image") ||
          key.toLowerCase().includes("icon") ||
          key.toLowerCase().includes("asset") ||
          key.toLowerCase().includes("url"))
      ) {
        next[key] = normalizeAssetUrl(nested);
      } else {
        next[key] = normalizeAssetUrlsDeep(nested);
      }
    }
    return next as T;
  }

  return value;
}
