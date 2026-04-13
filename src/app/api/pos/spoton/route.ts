import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Push order to SpotOn POS
export async function POST(request: Request) {
  try {
    const { restaurant_id, order_id, items, total } = await request.json();

    if (!restaurant_id || !order_id || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const spotonApiKey = process.env.SPOTON_API_KEY;
    const spotonLocationId = process.env.SPOTON_LOCATION_ID;

    if (!spotonApiKey || !spotonLocationId) {
      console.warn(
        `[${new Date().toISOString()}] SpotOn not configured — order push skipped for ${order_id}`
      );
      return NextResponse.json({
        success: true,
        warning: 'SpotOn not configured. Order not pushed to POS.',
      });
    }

    // Build SpotOn order payload
    const spotonOrder = buildSpotOnOrderPayload(order_id, items, total);

    // Create order in SpotOn
    const spotonResponse = await fetch('https://api.spoton.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${spotonApiKey}`,
        'X-Location-Id': spotonLocationId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spotonOrder),
    });

    if (!spotonResponse.ok) {
      const errorData = await spotonResponse.text();
      console.error(
        `[${new Date().toISOString()}] SpotOn order creation failed: ${spotonResponse.status} - ${errorData}`
      );
      return NextResponse.json(
        { error: 'Failed to push order to SpotOn' },
        { status: 500 }
      );
    }

    const spotonData = await spotonResponse.json();
    const spotonOrderId = spotonData.id || spotonData.externalId;

    console.log(
      `[${new Date().toISOString()}] Order pushed to SpotOn: ${spotonOrderId} (Ringo order: ${order_id})`
    );

    // Update order with SpotOn POS order ID
    const supabase = await createServerSupabaseClient();
    await supabase
      .from('orders')
      .update({
        pos_order_id: spotonOrderId,
        pos_pushed_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    return NextResponse.json({
      success: true,
      spoton_order_id: spotonOrderId,
    });
  } catch (error) {
    console.error('SpotOn order push error:', error);
    return NextResponse.json(
      { error: 'Failed to push order to SpotOn' },
      { status: 500 }
    );
  }
}

/**
 * Build a SpotOn API order payload from Ringo order data
 */
function buildSpotOnOrderPayload(
  orderId: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  total: number
) {
  // Build items array for SpotOn
  const spotonItems = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: Math.round(item.price * 100), // SpotOn uses cents
  }));

  return {
    externalId: orderId,
    type: 'TAKEOUT',
    items: spotonItems,
    metadata: {
      source: 'ringo',
      ringoOrderId: orderId,
    },
  };
}
