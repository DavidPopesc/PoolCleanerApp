import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: Retrieve pool data from cookie
export async function GET() {
  const cookieStore = await cookies();
  const poolData = cookieStore.get('PoolData')?.value;
  return NextResponse.json({ poolData: poolData ? JSON.parse(poolData) : null });
}

// POST: Store pool data in cookie
export async function POST(request: Request) {
  const { pool } = await request.json(); //
  const cookieStore = await cookies();
  const existing = cookieStore.get('PoolData')?.value;
  const pools = existing ? JSON.parse(existing) : [];
  pools.push(pool);
  // Serialize and check size before setting cookie. Browsers generally limit cookies to ~4KB each.
  const serialized = JSON.stringify(pools);
  const MAX_COOKIE_BYTES = 3800; // conservative limit (4KB minus overhead)
  // Use TextEncoder for size measurement so this works in Edge and Node runtimes
  const byteLength = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(serialized).length
    : Buffer.byteLength(serialized, 'utf8');
  if (byteLength > MAX_COOKIE_BYTES) {
    return NextResponse.json({ success: false, error: 'Pool data too large for cookie. Use server-side storage.' }, { status: 413 });
  }

  const response = NextResponse.json({ success: true, pools });
  // Persist cookie for a very long time. Browsers do not support a true "forever" cookie,
  // but we can set a far-future expiry. Note: many browsers (Chrome, Firefox, etc.) may cap
  // cookie lifetime (for example Chrome enforces a ~400 day cap), so this will be capped by
  // the user agent regardless of the value here.
  const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10; // conservative 10-year lifetime
  response.cookies.set('PoolData', serialized, {
    path: '/',
    maxAge: TEN_YEARS_SECONDS,
    // `expires` is provided as an additional hint; it's redundant if maxAge is present but
    // can help some clients. It must be a Date object.
    expires: new Date(Date.now() + TEN_YEARS_SECONDS * 1000),
    sameSite: 'lax',
  });
  return response;
}
