import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ max: 30, windowMs: 60_000, message: 'Too many search requests — please slow down.' });

// Google Places (New) Autocomplete proxy — keeps the API key server-side.
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete

export async function POST(req: NextRequest) {
  const blocked = limiter(req);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { input, sessionToken } = body as { input?: string; sessionToken?: string };
    // Client-provided lat/lng (from browser geolocation) takes priority over IP geo.
    const clientLat = typeof body?.lat === 'number' ? body.lat : null;
    const clientLng = typeof body?.lng === 'number' ? body.lng : null;

    if (!input || typeof input !== 'string' || input.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Bias results to the visitor's location. Prefer browser geolocation if provided,
    // else fall back to Vercel's IP-based geo headers.
    const latStr = clientLat != null ? String(clientLat) : req.headers.get('x-vercel-ip-latitude');
    const lngStr = clientLng != null ? String(clientLng) : req.headers.get('x-vercel-ip-longitude');
    const lat = latStr ? parseFloat(latStr) : null;
    const lng = lngStr ? parseFloat(lngStr) : null;

    const requestBody: Record<string, unknown> = {
      input,
      // Max 5 primary types; "food" is not a valid primary type.
      includedPrimaryTypes: ['restaurant', 'cafe', 'bakery', 'bar', 'meal_takeaway'],
      sessionToken,
    };

    if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      // 50km radius around the visitor. Bias (not restrict) — still allows national chains.
      requestBody.locationBias = {
        circle: { center: { latitude: lat, longitude: lng }, radius: 50000 },
      };
    }

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[${new Date().toISOString()}] Places autocomplete failed:`, text);
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    type PlacePrediction = {
      placeId: string;
      structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
      text?: { text: string };
    };
    type Suggestion = { placePrediction?: PlacePrediction };

    const suggestions = ((data.suggestions as Suggestion[]) || [])
      .filter((s) => s.placePrediction)
      .map((s) => ({
        placeId: s.placePrediction!.placeId,
        mainText:
          s.placePrediction!.structuredFormat?.mainText?.text ||
          s.placePrediction!.text?.text ||
          '',
        secondaryText: s.placePrediction!.structuredFormat?.secondaryText?.text || '',
      }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] autocomplete error:`, err);
    return NextResponse.json({ suggestions: [] });
  }
}
