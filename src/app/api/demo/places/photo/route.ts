import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// Proxies a Google Places photo so we never expose the API key in the browser.
export async function GET(req: NextRequest) {
  // Rate limit at DEMO_PUBLIC tier — proxies paid Google Places API.
  const blocked = await checkRateLimit(req, 'DEMO_PUBLIC');
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  const maxWidth = searchParams.get('maxWidth') || '800';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'not configured' }, { status: 500 });

  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&key=${apiKey}`,
    { cache: 'no-store', redirect: 'follow' }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'photo fetch failed' }, { status: res.status });
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
