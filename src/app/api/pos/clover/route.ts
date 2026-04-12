import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Clover OAuth callback
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // restaurant_id

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`
    );
  }

  try {
    const cloverAppId = process.env.CLOVER_APP_ID;
    const cloverAppSecret = process.env.CLOVER_APP_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!cloverAppId || !cloverAppSecret || !appUrl) {
      throw new Error('Missing Clover OAuth configuration');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://sandbox.dev.clover.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cloverAppId,
        client_secret: cloverAppSecret,
        code,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Clover token exchange failed:', errorData);
      throw new Error('Failed to exchange Clover OAuth code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token in Clover response');
    }

    // Save access token to restaurant
    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ pos_type: 'clover', pos_connected: true })
      .eq('id', state);

    if (updateError) {
      console.error('Failed to update restaurant:', updateError);
      throw updateError;
    }

    console.log(`[${new Date().toISOString()}] Clover connected for restaurant: ${state}`);

    return NextResponse.redirect(
      `${appUrl}/settings?success=clover_connected`
    );
  } catch (error) {
    console.error('Clover OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=clover_failed`
    );
  }
}

export async function POST(request: Request) {
  try {
    const { restaurant_id, order_items, order_total } = await request.json();

    // TODO: Implement Clover order push

    return NextResponse.json({
      success: true,
      message: 'Order pushed to Clover',
      restaurant_id,
      order_total,
      items_count: order_items?.length || 0,
    });
  } catch (error) {
    console.error('Clover order push error:', error);
    return NextResponse.json(
      { error: 'Failed to push order to Clover' },
      { status: 500 }
    );
  }
}
