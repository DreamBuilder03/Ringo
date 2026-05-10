// ──────────────────────────────────────────────────────────────────────────────
// /api/twilio/voice-fallback — Twilio fallback voice handler.
//
// Closes Multi-Test scenario #21 — "Retell upstream is down or returning 5xx
// during a live call; the customer should NOT hear silence and the founder
// should be paged within 60s."
//
// How Twilio routes here:
//   Each provisioned OMRI number is configured in Twilio admin with two
//   handlers (Phone Numbers → Configure → Voice & Fax):
//     • "A CALL COMES IN"        → SIP Trunk (OMRI) → Retell SIP termination
//     • "PRIMARY HANDLER FAILS"  → Webhook → POST {APP_URL}/api/twilio/voice-fallback
//
//   Twilio invokes the fallback when the primary errors out — SIP 5xx,
//   timeout, network failure, or any non-2xx HTTP from a webhook handler.
//   It's Twilio-side; we never need to detect upstream-down ourselves to
//   trigger it. Our job is only to (a) speak to the caller so they don't
//   hear dead air and (b) page Misael so he knows to investigate.
//
// What we do here:
//   1. Verify the request actually came from Twilio (X-Twilio-Signature).
//      Soft-fails when TWILIO_AUTH_TOKEN missing (dev). Strict in prod.
//   2. Look up the restaurant by the dialed number (`To` parameter).
//   3. Fire a founder alert (failureType='voice_fallback_triggered').
//      sendFounderAlert is fire-and-forget — must not block TwiML response.
//   4. Return TwiML:
//      • Brief friendly Polly voice line (no "Sorry our AI is broken")
//      • If staff_phone_number is set → <Dial> forwards to that line
//      • Otherwise → <Say> "please leave a message" + <Record> 60s voicemail
//
// Why TwiML and not Retell:
//   The whole point is Retell is unreachable. Anything that calls back into
//   Retell here defeats the failover. We use Twilio's native <Say> + <Dial>
//   + <Record> verbs only. Zero external dependencies in the response path.
//
// What we do NOT do:
//   • Try to "queue" the call for Retell when it comes back. Twilio voice
//     calls are real-time — by the time Retell is back the caller is gone.
//   • Take an order via DTMF. That's a different product. Failover's job is
//     "don't drop the call, page the founder, give the caller a human path."
//
// Companion piece: src/app/api/cron/retell-health-check/route.ts proactively
// pings Retell every 2 minutes so the founder learns about an outage before
// the first customer call hits this fallback.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFounderAlert } from '@/lib/alerts';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// Twilio signs every webhook with HMAC-SHA1(authToken, fullURL + sortedFormParams).
// Verifying it is what makes this endpoint safe to expose publicly — without
// it, anyone who guessed the URL could forge a hangup or trigger spurious
// founder pages by hammering us with fake POSTs.
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken: string | null
): boolean {
  // Soft-fail when TWILIO_AUTH_TOKEN missing — dev / staging environments
  // don't always have it. Becomes strict the moment the env var is set.
  if (!authToken) return true;
  if (!signature) return false;
  const sortedKeys = Object.keys(params).sort();
  const data = url + sortedKeys.map((k) => k + params[k]).join('');
  const computed = crypto.createHmac('sha1', authToken).update(data).digest('base64');
  if (computed.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Minimal HTML/XML escape so a malicious-looking restaurant name can't break
// the TwiML response (very unlikely with our owners but cheap insurance).
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

// "Polite, brief, doesn't admit AI" — restaurant owner approved phrasing.
// Polly.Joanna-Neural lands closest to a real receptionist; Twilio falls back
// to Polly.Joanna automatically if the neural voice isn't available.
function buildFallbackTwiml(opts: {
  restaurantName: string;
  staffPhone: string | null;
  callerNumber: string;
}): string {
  const name = xmlEscape(opts.restaurantName || 'the restaurant');

  if (opts.staffPhone) {
    // Forward to staff. timeout=20s (~5 rings) — long enough to grab the phone,
    // short enough that the caller doesn't bail. callerId preserves the original
    // caller's number so staff sees who's calling. answerOnBridge=true so the
    // caller hears ringback (not silence) while we connect.
    // After <Dial>: if nobody picks up we still capture a voicemail rather
    // than dropping the call.
    return `<Response>
  <Say voice="Polly.Joanna-Neural">Thanks for calling ${name}. One moment, connecting you to the team.</Say>
  <Dial timeout="20" callerId="${xmlEscape(opts.callerNumber)}" answerOnBridge="true">${xmlEscape(opts.staffPhone)}</Dial>
  <Say voice="Polly.Joanna-Neural">Sorry, no one's available right now. Please leave a brief message after the tone and we'll call you back.</Say>
  <Record maxLength="60" playBeep="true" trim="trim-silence" />
  <Say voice="Polly.Joanna-Neural">Thanks. We'll be in touch shortly.</Say>
</Response>`;
  }

  // No staff phone configured → straight to voicemail. We DON'T name OMRI or
  // mention "our AI is down" — that's the worst possible thing the caller could
  // hear. To them this is just "the restaurant's voicemail."
  return `<Response>
  <Say voice="Polly.Joanna-Neural">Thanks for calling ${name}. We can't take your call right now. Please leave a brief message after the tone and we'll call you back.</Say>
  <Record maxLength="60" playBeep="true" trim="trim-silence" />
  <Say voice="Polly.Joanna-Neural">Thanks. We'll be in touch shortly.</Say>
</Response>`;
}

export async function POST(req: NextRequest) {
  const t0 = new Date().toISOString();

  // WEBHOOK rate-limit tier (200/min per IP). Twilio's own infra calls us so
  // legitimate traffic is bounded; this is anti-abuse against spoof attempts.
  const blocked = await checkRateLimit(req, 'WEBHOOK');
  if (blocked) return blocked;

  try {
    // Twilio posts application/x-www-form-urlencoded, NOT JSON.
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((value, key) => {
      params[key] = value;
    });

    // Reconstruct the exact URL Twilio signed. Vercel proxies set x-forwarded-*
    // headers — use them to rebuild the public URL the request came in on.
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const host =
      req.headers.get('x-forwarded-host') || req.headers.get('host') || 'joinomri.com';
    const url = `${proto}://${host}${req.nextUrl.pathname}`;

    const signature = req.headers.get('x-twilio-signature');
    const authToken = process.env.TWILIO_AUTH_TOKEN || null;
    if (!verifyTwilioSignature(url, params, signature, authToken)) {
      console.warn(`[${t0}] [voice-fallback] Invalid Twilio signature — rejecting.`);
      // 403 — Twilio retries are NOT desired here; this is a forgery attempt.
      return new NextResponse('Forbidden', { status: 403 });
    }

    const calledNumber = params.To || ''; // restaurant's OMRI number
    const callerNumber = params.From || ''; // customer
    const callSid = params.CallSid || '';

    // Look up restaurant by the dialed number. Numbers in our DB are stored
    // E.164 — `To` from Twilio is already E.164.
    const supabase = await createServiceRoleClient();
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, staff_phone_number')
      .eq('phone', calledNumber)
      .maybeSingle();

    const restaurantName = restaurant?.name || 'the restaurant';
    const staffPhone = restaurant?.staff_phone_number || null;

    // Fire-and-forget founder alert. sendFounderAlert has its own catch-all,
    // but we still wrap and don't await — we MUST return TwiML in <200ms or
    // Twilio plays its own error tone instead of our friendly handoff.
    void sendFounderAlert({
      restaurantId: restaurant?.id || null,
      failureType: 'voice_fallback_triggered',
      shortReason: `Twilio fallback fired for ${restaurantName} — Retell SIP unreachable`,
      retellCallId: null,
      actionHint: staffPhone
        ? `Caller forwarded to ${staffPhone}. Check Retell status NOW.`
        : `No staff_phone_number set — caller went to voicemail. Check Retell status NOW.`,
      metadata: {
        twilio_call_sid: callSid,
        called_number: calledNumber,
        // Caller number masked even in alert metadata — PII discipline applies
        // here too. The CallSid is the link to the full record in Twilio.
        caller_number_masked: callerNumber ? callerNumber.slice(0, -4) + 'XXXX' : null,
      },
    }).catch((err) => {
      console.error(`[${t0}] [voice-fallback] alert dispatch failed:`, err);
    });

    const xml = buildFallbackTwiml({ restaurantName, staffPhone, callerNumber });

    // Mask phones in success log (Privacy Day 1).
    const maskedCalled = calledNumber ? calledNumber.slice(0, -4) + 'XXXX' : 'unknown';
    const maskedCaller = callerNumber ? callerNumber.slice(0, -4) + 'XXXX' : 'unknown';
    console.log(
      `[${t0}] [voice-fallback] fallback fired — restaurant=${restaurant?.id || 'unknown'} ` +
        `called=${maskedCalled} from=${maskedCaller} sid=${callSid} ` +
        `forwardedTo=${staffPhone ? 'staff' : 'voicemail'}`
    );

    return twimlResponse(xml);
  } catch (err) {
    console.error(`[${t0}] [voice-fallback] exception`, err);

    // Even on exception we MUST return valid TwiML — anything else and the
    // caller hears a generic Twilio error and we look broken. This is the
    // safety net behind every other safety net.
    return twimlResponse(`<Response>
  <Say voice="Polly.Joanna-Neural">Thanks for calling. We can't take your call right now. Please leave a brief message after the tone.</Say>
  <Record maxLength="60" playBeep="true" trim="trim-silence" />
  <Say voice="Polly.Joanna-Neural">Thanks. We'll be in touch shortly.</Say>
</Response>`);
  }
}

// Twilio occasionally pings the fallback URL with a GET during number config
// to verify it responds. Return valid TwiML so the verification passes.
export async function GET(req: NextRequest) {
  const blocked = await checkRateLimit(req, 'WEBHOOK');
  if (blocked) return blocked;
  return twimlResponse(`<Response>
  <Say voice="Polly.Joanna-Neural">OMRI fallback handler is online.</Say>
</Response>`);
}
