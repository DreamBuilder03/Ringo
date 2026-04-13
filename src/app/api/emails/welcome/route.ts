import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { welcomeEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, restaurantName, ownerName, ownerEmail } = body;

    if (!restaurantId || !restaurantName || !ownerName || !ownerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: restaurantId, restaurantName, ownerName, ownerEmail',
        },
        { status: 400 }
      );
    }

    const html = welcomeEmail({
      restaurantName,
      ownerName,
    });

    const result = await sendEmail({
      to: ownerEmail,
      subject: `Welcome to Ringo, ${ownerName}!`,
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
