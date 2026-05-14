import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CacheEntry = { displayName: string; at: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 1000 * 60 * 60 * 24;

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

/**
 * Reverse geocode proxy (Nominatim). Same-origin only; respects Nominatim usage policy via User-Agent + caching.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lon = Number(req.nextUrl.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'out_of_range' }, { status: 400 });
  }

  const key = cacheKey(lat, lon);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ displayName: hit.displayName });
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BarakaBoxCheckout/1.0 (+https://github.com/elyorka22/barakabox)',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ displayName: null });
    }
    const data = (await res.json()) as { display_name?: string };
    const displayName = typeof data.display_name === 'string' ? data.display_name.trim() : null;
    if (displayName) {
      cache.set(key, { displayName, at: Date.now() });
    }
    return NextResponse.json({ displayName: displayName ?? null });
  } catch {
    return NextResponse.json({ displayName: null });
  }
}
