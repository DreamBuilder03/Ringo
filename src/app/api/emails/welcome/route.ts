import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { welcomeEmail } from '@/lib/email-templates';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { emailWelcomeSchema } from '@/lib/schemas/comms';

export async function POST(request: NextRequest) {
  // Rate limit at SEND tier (20/min) — Resend charges per send.
  const blocked = await checkRateLimit(request, 'SEND');
  if (blocked) return blocked;

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }
    const parsed = emailWelcomeSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed.',
          details: parsed.error.issues.map((i: any) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }
    const { restaurantId, restaurantName, ownerName, ownerEmail } = parsed.data;

    const html = welcomeEmail({
      restaurantName,
      ownerName,
    });

    const result = await sendEmail({
      to: ownerEmail,
      subject: `Welcome to OMRI, ${ownerName}!`,
      html,
    });

    if (!result.success) {
      console.error(`[${new Date().toISOString()}] Welcome email send failed:`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send welcome email',
          details: result.error,
        },
        { status: 500 }
      );
    }

    console.log(`[${new Date().toISOString()}] Welcome email sent to ${ownerEmail} for ${restaurantName}`);
    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
      emailId: result.id,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Welcome email API error:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
