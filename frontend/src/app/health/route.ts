import { NextResponse } from 'next/server';

/** Liveness for Docker / load balancers — no auth, minimal work. */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
