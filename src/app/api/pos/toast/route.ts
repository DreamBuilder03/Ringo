import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// Push order to Toast POS — called by /api/webhooks/square after payment confirms.
export async function POST(request: NextRequest) {
  // Rate limit at POS tier — internal call from our own webhook.
  const blocked = await checkRateLimit(request, 'POS');
  if (blocked) return blocked;

  try {
    const { restaurant_id, order_id, items, total } = await request.json();

    if (!restaurant_id || !order_id || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const toastApiKey = process.env.TOAST_API_KEY;
    const toastRestaurantGuid = process.env.TOAST_RESTAURANT_GUID;

    if (!toastApiKey || !toastRestaurantGuid) {
      console.warn(
        `[${new Date().toISOString()}] Toast not configured — order push skipped for ${order_id}`
      );
      return NextResponse.json({
        success: true,
        warning: 'Toast not configured. Order not pushed to POS.',
      });
    }

    // Determine Toast API environment
    const toastEnvironment = process.env.TOAST_ENVIRONMENT || 'production';
    const toastBaseUrl =
      toastEnvironment === 'sandbox'
        ? 'https://ws-sandbox-api.toasttab.com'
        : 'https://ws-api.toasttab.com';

    // Build Toast order payload
    const toastOrder = buildToastOrderPayload(order_id, items, total);

    // Create order in Toast
    const toastResponse = await fetch(`${toastBaseUrl}/orders/v2/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${toastApiKey}`,
        'Toast-Restaurant-External-ID': toastRestaurantGuid,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toastOrder),
    });

    if (!toastResponse.ok) {
      const errorData = await toastResponse.text();
      console.error(
        `[${new Date().toISOString()}] Toast order creation failed: ${toastResponse.status} - ${errorData}`
      );
      return NextResponse.json(
        { error: 'Failed to push order to Toast' },
        { status: 500 }
      );
    }

    const toastData = await toastResponse.json();
    const toastOrderId = toastData.externalId || toastData.guid;

    console.log(
      `[${new Date().toISOString()}] Order pushed to Toast: ${toastOrderId} (Ringo order: ${order_id})`
    );

    // Update order with Toast POS order ID
    const supabase = await createServerSupabaseClient();
    await supabase
      .from('orders')
      .update({
        pos_order_id: toastOrderId,
        pos_pushed_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    return NextResponse.json({
      success: true,
      toast_order_id: toastOrderId,
    });
  } catch (error) {
    console.error('Toast order push error:', error);
    return NextResponse.json(
      { error: 'Failed to push order to Toast' },
      { status: 500 }
    );
  }
}

/**
 * Build a Toast API order payload from Ringo order data
 * Ref: https://docs.toasttab.com/doc/enterprise/orders-api.html
 */
function buildToastOrderPayload(
  orderId: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  total: number
) {
  const now = new Date().toISOString();

  // Build menu item selections for Toast
  const selections = items.map((item) => ({
    entityType: 'MenuItemSelection',
    itemGroup: {
      entityType: 'MenuGroup',
      guid: null,
    },
    item: {
      entityType: 'MenuItem',
      externalId: item.name,
    },
    quantity: item.quantity,
    unitOfMeasure: 'NONE',
    preDiscountPrice: Math.round(item.price * 100), // Toast uses cents
    displayName: item.name,
  }));

  return {
    entityType: 'Order',
    externalId: orderId,
    openedDate: now,
    diningOption: {
      entityType: 'DiningOption',
      externalId: 'takeout',
    },
    checks: [
      {
        entityType: 'Check',
        selections,
      },
    ],
  };
}
