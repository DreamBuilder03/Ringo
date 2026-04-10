import { NextRequest, NextResponse } from 'next/server';

// POST: Send SMS via Twilio
export async function POST(req: NextRequest) {
  try {
    const { to, message, type } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing to or message' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn(`[${new Date().toISOString()}] Twilio not configured — SMS skipped to ${to}`);
      return NextResponse.json({
        success: true,
        warning: 'Twilio not configured. SMS not sent.',
        message_preview: message.substring(0, 100),
      });
    }

    // Send via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[${new Date().toISOString()}] Twilio error:`, errorData);
      return NextResponse.json({ error: 'SMS send failed' }, { status: 500 });
    }

    const data = await response.json();
    console.log(`[${new Date().toISOString()}] SMS sent to ${to}: ${data.sid} (type: ${type || 'general'})`);

    return NextResponse.json({ success: true, sid: data.sid });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] SMS API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
