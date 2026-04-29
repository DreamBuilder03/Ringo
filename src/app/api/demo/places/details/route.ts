import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// Google Places (New) Details proxy.
// Fetch name, address, hours, phone, cuisine, photo for a given placeId.

const FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
  'currentOpeningHours',
  'primaryTypeDisplayName',
  'primaryType',
  'rating',
  'userRatingCount',
  'photos',
  'location',
  'businessStatus',
].join(',');

export async function GET(req: NextRequest) {
  // Rate limit at DEMO_PUBLIC tier — proxies a paid Google Places API.
  const blocked = await checkRateLimit(req, 'DEMO_PUBLIC');
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_PLACES_API_KEY not configured' },
      { status: 500 }
    );
  }

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELDS,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[${new Date().toISOString()}] Places details failed:`, text);
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }

  const p = await res.json();

  // Pick first photo and proxy it via our own URL so the Google key stays hidden.
  const photoName: string | undefined = p.photos?.[0]?.name;
  const photoUrl = photoName
    ? `/api/demo/places/photo?name=${encodeURIComponent(photoName)}&maxWidth=960`
    : null;

  const hours = p.regularOpeningHours?.weekdayDescriptions || null;
  const openNow = p.currentOpeningHours?.openNow ?? null;

  return NextResponse.json({
    placeId: p.id,
    name: p.displayName?.text || '',
    address: p.formattedAddress || '',
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
    website: p.websiteUri || '',
    cuisineType: p.primaryTypeDisplayName?.text || p.primaryType || 'Restaurant',
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    hours,
    openNow,
    photoUrl,
    location: p.location || null,
    businessStatus: p.businessStatus || null,
  });
}
