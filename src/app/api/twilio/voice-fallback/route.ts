import { NextResponse } from 'next/server';

// Safe fallback Voice URL for freshly-bought Twilio numbers.
// After provisioning attaches the number to Retell, Retell controls the voice
// routing and this endpoint is bypassed. If a number ever hits this endpoint
// (because provisioning broke or the number was released), we just politely
// say we can't take the call right now rather than 500-ing into Twilio's ear.
export async function POST() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling. Our ordering line is setting up. Please try again in a few minutes.</Say>
  <Hangup/>
</Response>`;
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function GET() {
  // Some Twilio configs ping GET on validation — return a harmless 200.
  return POST();
}
