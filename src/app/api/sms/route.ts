import { NextRequest, NextResponse } from 'next/server';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

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

// POST: Send SMS via GoHighLevel Conversations API
export async function POST(req: NextRequest) {
  try {
    const { to, message, type } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing to or message' }, { status: 400 });
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
      console.warn(`[${new Date().toISOString()}] GHL not configured — SMS skipped to ${to}`);
      return NextResponse.json({
        success: true,
        warning: 'GoHighLevel not configured. SMS not sent.',
        message_preview: message.substring(0, 100),
      });
    }

    // Step 1: Find or create the contact in GHL
    const contactId = await getOrCreateGHLContact(to, apiKey, locationId);

    if (!contactId) {
      console.error(`[${new Date().toISOString()}] Failed to find/create GHL contact for ${to}`);
      return NextResponse.json({ error: 'Failed to find or create contact' }, { status: 500 });
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
      console.error(`[${new Date().toISOString()}] GHL SMS error:`, errorData);
      return NextResponse.json({ error: 'SMS send failed' }, { status: 500 });
    }

    const data = await smsRes.json();
    console.log(`[${new Date().toISOString()}] SMS sent via GHL to ${to}: ${data.messageId || data.id || 'sent'} (type: ${type || 'general'})`);

    return NextResponse.json({ success: true, messageId: data.messageId || data.id });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] SMS API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
