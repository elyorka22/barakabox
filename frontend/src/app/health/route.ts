import { NextResponse } from 'next/server';

/** Liveness for Docker / LB — App Router route handler (no page shell). */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

export function HEAD() {
  return new NextResponse(null, { status: 200 });
}
