import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const smsLimiter = rateLimit({ max: 10, windowMs: 60_000, message: 'Too many SMS requests — please wait.' });

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01/Accounts';

// Helper: Normalize phone numbers to E.164 format
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone; // return as-is if we can't normalize
}

// Helper: Find or create a GHL contact by phone number
async function getOrCreateGHLContact(phone: string, apiKey: string, locationId: string): Promise<string | null> {
  // Search for existing contact by phone
  const searchRes = await fetch(
    `${GHL_API_BASE}/contacts/search/duplicate?locationId=${locationId}&number=${encodeURIComponent(phone)}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
      },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.contact?.id) {
      return searchData.contact.id;
    }
  }

  // If not found, create the contact
  const createRes = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify({
      locationId,
      phone,
      name: 'Ringo Customer',
      source: 'Ringo AI',
    }),
  });

  if (createRes.ok) {
    const createData = await createRes.json();
    return createData.contact?.id || null;
  }

  return null;
}

// Helper: Send SMS via GoHighLevel Conversations API
async function sendViaGHL(
  to: string,
  message: string,
  apiKey: string,
  locationId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Step 1: Find or create the contact in GHL
    const contactId = await getOrCreateGHLContact(to, apiKey, locationId);

    if (!contactId) {
      return { success: false, error: 'Failed to find or create GHL contact' };
    }

    // Step 2: Send SMS via GHL Conversations API
    const smsRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId,
        message,
      }),
    });

    if (!smsRes.ok) {
      const errorData = await smsRes.json().catch(() => ({}));
      return { success: false, error: `GHL API error: ${smsRes.status}` };
    }

    const data = await smsRes.json();
    return { success: true, messageId: data.messageId || data.id || 'sent' };
  } catch (err) {
    return { success: false, error: `GHL exception: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// Helper: Send SMS via Twilio
async function sendViaTwilio(
  to: string,
  message: string,
  accountSid: string,
  authToken: string,
  fromNumber: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const normalizedTo = normalizePhone(to);
    const normalizedFrom = normalizePhone(fromNumber);

    // Prepare form-encoded body
    const params = new URLSearchParams();
    params.append('To', normalizedTo);
    params.append('From', normalizedFrom);
    params.append('Body', message);

    // Prepare Basic auth header
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const twilioRes = await fetch(`${TWILIO_API_BASE}/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!twilioRes.ok) {
      const errorData = await twilioRes.json().catch(() => ({}));
      return { success: false, error: `Twilio API error: ${twilioRes.status}` };
    }

    const data = await twilioRes.json();
    return { success: true, messageId: data.sid || 'sent' };
  } catch (err) {
    return { success: false, error: `Twilio exception: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// POST: Send SMS with fallback chain (GHL → Twilio)
export async function POST(req: NextRequest) {
  const blocked = smsLimiter(req);
  if (blocked) return blocked;

  try {
    const { to, message, type } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing to or message' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    // GHL Configuration
    const ghlApiKey = process.env.GHL_API_KEY;
    const ghlLocationId = process.env.GHL_LOCATION_ID;

    // Twilio Configuration
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Attempt 1: Try GoHighLevel
    if (ghlApiKey && ghlLocationId) {
      console.log(`[${timestamp}] Attempting SMS to ${to} via GoHighLevel...`);
      const ghlResult = await sendViaGHL(to, message, ghlApiKey, ghlLocationId);

      if (ghlResult.success) {
        console.log(`[${timestamp}] SMS sent via GHL to ${to}: ${ghlResult.messageId} (type: ${type || 'general'})`);
        return NextResponse.json({
          success: true,
          provider: 'ghl',
          messageId: ghlResult.messageId,
        });
      }

      console.warn(`[${timestamp}] GHL SMS failed: ${ghlResult.error}. Falling back to Twilio...`);
    } else {
      console.log(`[${timestamp}] GHL not configured. Attempting Twilio...`);
    }

    // Attempt 2: Fall back to Twilio
    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      console.log(`[${timestamp}] Attempting SMS to ${to} via Twilio...`);
      const twilioResult = await sendViaTwilio(to, message, twilioAccountSid, twilioAuthToken, twilioPhoneNumber);

      if (twilioResult.success) {
        console.log(`[${timestamp}] SMS sent via Twilio to ${to}: ${twilioResult.messageId} (type: ${type || 'general'})`);
        return NextResponse.json({
          success: true,
          provider: 'twilio',
          messageId: twilioResult.messageId,
        });
      }

      console.error(`[${timestamp}] Twilio SMS failed: ${twilioResult.error}`);
      return NextResponse.json(
        { error: 'All SMS providers failed', details: twilioResult.error },
        { status: 500 }
      );
    }

    // Both providers unavailable
    console.error(`[${timestamp}] No SMS providers configured for ${to}`);
    return NextResponse.json(
      { error: 'No SMS providers configured (GHL and Twilio)' },
      { status: 500 }
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] SMS API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
