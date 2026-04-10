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

// Push order to Square POS
export async function POST(request: Request) {
  try {
    const { restaurant_id, order_id, items, total } = await request.json();

    if (!restaurant_id || !order_id || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
    const squareLocationId = process.env.SQUARE_LOCATION_ID;

    if (!squareAccessToken || !squareLocationId) {
      console.warn(`[${new Date().toISOString()}] Square not configured — order push skipped for ${order_id}`);
      return NextResponse.json({
        success: true,
        warning: 'Square not configured. Order not pushed to POS.',
      });
    }

    // Build Square line items from order items
    const lineItems = items.map((item: { name: string; quantity: number; price: number }) => ({
      name: item.name,
      quantity: String(item.quantity),
      base_price_money: {
        amount: Math.round(item.price * 100), // Square uses cents
        currency: 'USD',
      },
    }));

    // Create order in Square
    const squareResponse = await fetch('https://connect.squareup.com/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        order: {
          location_id: squareLocationId,
          reference_id: order_id,
          line_items: lineItems,
          state: 'OPEN',
          metadata: {
            ringo_order_id: order_id,
            ringo_restaurant_id: restaurant_id,
          },
        },
        idempotency_key: `ringo-${order_id}`,
      }),
    });

    if (!squareResponse.ok) {
      const errorData = await squareResponse.json();
      console.error(`[${new Date().toISOString()}] Square order creation failed:`, errorData);
      return NextResponse.json({ error: 'Failed to push order to Square' }, { status: 500 });
    }

    const squareData = await squareResponse.json();
    const squareOrderId = squareData.order?.id;

    console.log(`[${new Date().toISOString()}] Order pushed to Square: ${squareOrderId} (Ringo order: ${order_id})`);

    // Update order with Square POS order ID
    const supabase = await createServerSupabaseClient();
    await supabase
      .from('orders')
      .update({
        pos_order_id: squareOrderId,
        pos_pushed_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    return NextResponse.json({
      success: true,
      square_order_id: squareOrderId,
    });
  } catch (error) {
    console.error('Square order push error:', error);
    return NextResponse.json(
      { error: 'Failed to push order to Square' },
      { status: 500 }
    );
  }
}
