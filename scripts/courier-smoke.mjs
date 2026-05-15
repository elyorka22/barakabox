#!/usr/bin/env node
/**
 * Courier E2E smoke test (API + optional browser).
 * Requires: backend on :4000, Postgres migrated+seeded, frontend on :3000 (or FRONTEND_URL).
 *
 * Usage:
 *   node scripts/courier-smoke.mjs
 *   FRONTEND_URL=http://127.0.0.1:3000 API_URL=http://127.0.0.1:4000 node scripts/courier-smoke.mjs
 */
const API = (process.env.API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const FRONTEND = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const LOGIN = process.env.COURIER_LOGIN || 'courier';
const PASSWORD = process.env.COURIER_PASSWORD || 'password123';

let failed = 0;
function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg, err) {
  failed += 1;
  console.error(`✗ ${msg}`, err?.message || err || '');
}

async function json(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(typeof data === 'object' && data?.message ? data.message : `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  console.log(`API=${API} FRONTEND=${FRONTEND}`);

  try {
    const health = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`health ${health.status}`);
    ok('Backend health');
  } catch (e) {
    fail('Backend health', e);
    process.exit(1);
  }

  let token;
  try {
    const auth = await json('POST', '/auth/login', { login: LOGIN, password: PASSWORD });
    token = auth.accessToken;
    if (auth.user?.role !== 'COURIER') throw new Error(`Expected COURIER, got ${auth.user?.role}`);
    ok('Courier login');
  } catch (e) {
    fail('Courier login', e);
    process.exit(1);
  }

  let statsBefore;
  try {
    statsBefore = await json('GET', '/orders/courier/stats', null, token);
    ok(`Stats loaded (today deliveries: ${statsBefore.today?.deliveries ?? 0})`);
  } catch (e) {
    fail('Courier stats', e);
  }

  let queue = [];
  try {
    queue = await json('GET', '/orders/courier', null, token);
    ok(`Queue loaded (${queue.length} orders)`);
  } catch (e) {
    fail('Courier queue', e);
  }

  const ready = queue.find((o) => o.status === 'READY');
  if (!ready) {
    console.log('  (no READY order — create one via picker or seed script)');
  } else {
    try {
      await json('PATCH', `/orders/${ready.id}/start-delivery`, undefined, token);
      ok(`Accept order ${ready.id.slice(-8)}`);
    } catch (e) {
      fail('Accept order', e);
    }
  }

  const delivering = (await json('GET', '/orders/courier', null, token)).find(
    (o) => o.status === 'DELIVERING',
  );
  if (delivering) {
    try {
      await json('PATCH', `/orders/${delivering.id}/delivered`, undefined, token);
      ok(`Complete delivery ${delivering.id.slice(-8)}`);
    } catch (e) {
      fail('Complete delivery', e);
    }
  }

  const ready2 = (await json('GET', '/orders/courier', null, token)).find((o) => o.status === 'READY');
  if (ready2) {
    try {
      await json('PATCH', `/orders/${ready2.id}/reject`, { reason: 'smoke-test' }, token);
      ok(`Reject order ${ready2.id.slice(-8)}`);
    } catch (e) {
      fail('Reject order', e);
    }
  }

  try {
    const history = await json('GET', '/orders/courier/history', null, token);
    ok(`History (${history.length} rows)`);
  } catch (e) {
    fail('Courier history', e);
  }

  try {
    await json('POST', '/orders/courier/shift/start', undefined, token);
    await json('PATCH', '/orders/courier/shift/end', undefined, token);
    ok('Shift start/end');
  } catch (e) {
    fail('Shift', e);
  }

  try {
    const fe = await fetch(`${FRONTEND}/courier`, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    ok(`Frontend /courier responds (${fe.status})`);
  } catch (e) {
    fail('Frontend reachability', e);
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll API smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
