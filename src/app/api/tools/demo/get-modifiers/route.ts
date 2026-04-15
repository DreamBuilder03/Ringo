import { NextRequest, NextResponse } from 'next/server';

// Demo-only get_modifiers stub. Returns a generic set of common modifiers
// so the agent can keep the conversation flowing without a DB lookup.

export async function POST(_req: NextRequest) {
  return NextResponse.json({
    result:
      'Common options: size (small/medium/large), protein choice, spice level, extra cheese, no onion, side choice. Ask the customer what they\u2019d like.',
    modifiers: [
      { group: 'Size', options: ['Small', 'Medium', 'Large'] },
      { group: 'Extras', options: ['Extra cheese', 'Extra sauce', 'No onion', 'No cilantro'] },
    ],
  });
}
