import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// Safe fallback Voice URL for freshly-bought Twilio numbers.
// After provisioning attaches the number to Retell, Retell controls the voice
// routing and this endpoint is bypassed. If a number ever hits this endpoint
// (because provisioning broke or the number was released), we just politely
// say we can't take the call right now rather than 500-ing into Twilio's ear.
//
// Twilio sends form-urlencoded (not JSON) so no Zod body schema. Twilio
// signature verification could be added — deferred until provisioning
// hardening (out of B scope).
async function buildResponse() {
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

export async function POST(request: NextRequest) {
  // Rate limit at WEBHOOK tier — Twilio retries on non-2xx so 429 is
  // recoverable for them; defends against URL spam.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;
  return buildResponse();
}

export async function GET(request: NextRequest) {
  // Some Twilio configs ping GET on validation — return a harmless 200.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;
  return buildResponse();
}
