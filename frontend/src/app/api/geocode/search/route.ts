import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Hit = { lat: string; lon: string; display_name?: string };
type CacheEntry = { hit: Hit | null; at: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 1000 * 60 * 60 * 6;

function normQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
}

/**
 * Forward geocode (Nominatim search). Same-origin proxy; cache + User-Agent.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') ?? '';
  const q = normQuery(raw);
  if (q.length < 4) {
    return NextResponse.json({ lat: null, lon: null, displayName: null });
  }

  const key = q;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    const h = hit.hit;
    if (!h) return NextResponse.json({ lat: null, lon: null, displayName: null });
    return NextResponse.json({
      lat: Number(h.lat),
      lon: Number(h.lon),
      displayName: typeof h.display_name === 'string' ? h.display_name.trim() : null,
    });
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', raw.trim().slice(0, 200));
  url.searchParams.set('limit', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BarakaBoxCheckout/1.0 (+https://github.com/elyorka22/barakabox)',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      cache.set(key, { hit: null, at: Date.now() });
      return NextResponse.json({ lat: null, lon: null, displayName: null });
    }
    const data = (await res.json()) as Hit[];
    const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
    cache.set(key, { hit: first, at: Date.now() });
    if (!first) {
      return NextResponse.json({ lat: null, lon: null, displayName: null });
    }
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ lat: null, lon: null, displayName: null });
    }
    const displayName = typeof first.display_name === 'string' ? first.display_name.trim() : null;
    return NextResponse.json({ lat, lon, displayName });
  } catch {
    return NextResponse.json({ lat: null, lon: null, displayName: null });
  }
}
