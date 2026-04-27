import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// Demo-only get_modifiers stub. Returns a generic set of common modifiers
// so the agent can keep the conversation flowing without a DB lookup.

export async function POST(req: NextRequest) {
  // Rate limit only (no body to validate). 200 fallback so call doesn't break.
  const blocked = await checkRateLimit(req, 'TOOL');
  if (blocked) {
    return NextResponse.json({ result: 'One sec — let me grab the options.' }, { status: 200 });
  }
  return NextResponse.json({
    result:
      'Common options: size (small/medium/large), protein choice, spice level, extra cheese, no onion, side choice. Ask the customer what they\u2019d like.',
    modifiers: [
      { group: 'Size', options: ['Small', 'Medium', 'Large'] },
      { group: 'Extras', options: ['Extra cheese', 'Extra sauce', 'No onion', 'No cilantro'] },
    ],
  });
}
