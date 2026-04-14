import { NextRequest, NextResponse } from 'next/server';

// Google Places (New) Autocomplete proxy — keeps the API key server-side.
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete

export async function POST(req: NextRequest) {
  try {
    const { input, sessionToken } = await req.json();
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

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['restaurant', 'food', 'cafe', 'bakery', 'bar', 'meal_takeaway'],
        sessionToken,
      }),
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
