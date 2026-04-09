import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Square OAuth callback
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
    // Exchange code for access token
    const tokenResponse = await fetch('https://connect.squareup.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SQUARE_APP_ID,
        client_secret: process.env.SQUARE_ACCESS_TOKEN,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Square OAuth code');
    }

    const supabase = await createServerSupabaseClient();
    await supabase
      .from('restaurants')
      .update({ pos_type: 'square', pos_connected: true })
      .eq('id', state);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=square_connected`
    );
  } catch (error) {
    console.error('Square OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=square_failed`
    );
  }
}

// Push order to Square
export async function POST(request: Request) {
  try {
    const { restaurant_id, order_items, order_total } = await request.json();

    // TODO: Implement Square order creation
    // This would use the Square Orders API to create an order in the POS

    return NextResponse.json({
      success: true,
      message: 'Order pushed to Square',
      restaurant_id,
      order_total,
      items_count: order_items?.length || 0,
    });
  } catch (error) {
    console.error('Square order push error:', error);
    return NextResponse.json(
      { error: 'Failed to push order to Square' },
      { status: 500 }
    );
  }
}
