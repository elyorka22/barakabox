const FALLBACK_SITE_URL = "https://chust-online-bozor.uz";

const INVALID_HOSTS = new Set(["localhost", "127.0.0.1", "64.226.106.88"]);

function getSiteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL).replace(/\/$/, "");
}

function shouldRewriteHost(hostname: string) {
  const host = hostname.toLowerCase();
  return INVALID_HOSTS.has(host);
}

export function normalizeAssetUrl(input?: string | null): string {
  if (!input) return "";
  const raw = input.trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  const siteOrigin = getSiteOrigin();

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (shouldRewriteHost(parsed.hostname)) {
        const fallback = new URL(siteOrigin);
        parsed.protocol = fallback.protocol;
        parsed.host = fallback.host;
      }
      return parsed.toString();
    } catch {
      return raw;
    }
  }

  if (raw.startsWith("/")) {
    return `${siteOrigin}${raw}`;
  }

  return `${siteOrigin}/${raw.replace(/^\/+/, "")}`;
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
