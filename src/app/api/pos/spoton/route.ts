// ──────────────────────────────────────────────────────────────────────────────
// /api/pos/spoton — push a paid order into SpotOn (multi-tenant refactor).
//
// What this route does:
//   Internal-only POST endpoint. Called by a webhook handler (or admin
//   replay tool) after a SpotOn customer payment clears. Takes our internal
//   order ID, looks up the restaurant's per-tenant SpotOn credentials, and
//   calls SpotOn Orders API to push the order into the kitchen queue.
//
// Migration note:
//   This route previously read SPOTON_API_KEY + SPOTON_LOCATION_ID from
//   environment variables — single-tenant only. Now it reads per-restaurant
//   credentials from restaurants.spoton_api_key + restaurants.spoton_location_id.
//   The env vars stay as a fallback for legacy single-tenant deployments and
//   for the development sandbox.
//
// Failure modes:
//   - Restaurant not found / wrong pos_type → 400 (data error)
//   - Restaurant has no SpotOn creds AND no env fallback → 200 + warning
//     (don't crash — restaurant just hasn't connected yet)
//   - SpotOn API returns non-2xx → 500 + P0 founder alert (customer paid,
//     kitchen won't fire without manual intervention)
//   - Order row update fails after successful SpotOn push → log + alert
//     but still return success (the SpotOn side worked; ops can backfill)
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { sendFounderAlert } from '@/lib/alerts';

export async function POST(request: NextRequest) {
  const t0 = new Date().toISOString();

  // Rate limit at POS tier — internal call from our own webhook.
  const blocked = await checkRateLimit(request, 'POS');
  if (blocked) return blocked;

  try {
    const { restaurant_id, order_id, items, total } = await request.json();

    if (!restaurant_id || !order_id || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up the restaurant + its SpotOn credentials.
    const supabase = await createServiceRoleClient();
    const { data: restaurant, error: lookupErr } = await supabase
      .from('restaurants')
      .select('id, name, pos_type, spoton_api_key, spoton_location_id')
      .eq('id', restaurant_id)
      .single();

    if (lookupErr || !restaurant) {
      console.error(`[${t0}] [spoton] restaurant lookup failed`, lookupErr);
      return NextResponse.json(
        { error: 'Restaurant not found', restaurant_id },
        { status: 400 }
      );
    }

    if (restaurant.pos_type !== 'spoton') {
      console.warn(
        `[${t0}] [spoton] Wrong pos_type for restaurant ${restaurant_id}: expected 'spoton', got '${restaurant.pos_type}'. Skipping.`
      );
      return NextResponse.json(
        {
          error: `Restaurant pos_type is '${restaurant.pos_type}', not 'spoton'`,
          hint: 'Route the order to the correct POS adapter.',
        },
        { status: 400 }
      );
    }

    // Resolve credentials: per-restaurant first, env fallback second.
    // Env fallback keeps single-tenant dev/staging environments working.
    const apiKey =
      (restaurant as { spoton_api_key?: string }).spoton_api_key ||
      process.env.SPOTON_API_KEY;
    const locationId =
      (restaurant as { spoton_location_id?: string }).spoton_location_id ||
      process.env.SPOTON_LOCATION_ID;

    if (!apiKey || !locationId) {
      console.warn(
        `[${t0}] [spoton] No SpotOn credentials for restaurant ${restaurant_id} — order push skipped`
      );
      return NextResponse.json({
        success: true,
        warning: 'SpotOn not configured for this restaurant. Order not pushed to POS.',
      });
    }

    // Build SpotOn order payload.
    const spotonOrder = buildSpotOnOrderPayload(order_id, items, total);

    // Create order in SpotOn.
    let spotonResponse;
    try {
      spotonResponse = await fetch('https://api.spoton.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Location-Id': locationId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(spotonOrder),
      });
    } catch (err) {
      // Network failure — escalate immediately. Customer paid, kitchen won't fire.
      console.error(`[${t0}] [spoton] SpotOn API unreachable:`, err);
      sendFounderAlert({
        restaurantId: restaurant.id,
        failureType: 'payment_link_failure',
        shortReason: `SpotOn API unreachable from /api/pos/spoton for ${restaurant.name}`,
        actionHint: 'Customer paid but order is NOT in SpotOn. Manually enter the order in SpotOn NOW.',
        metadata: {
          order_id,
          restaurant_id,
          error: err instanceof Error ? err.message.slice(0, 200) : String(err),
        },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'SpotOn API unreachable' },
        { status: 502 }
      );
    }

    if (!spotonResponse.ok) {
      const errorData = await spotonResponse.text();
      console.error(
        `[${t0}] [spoton] SpotOn order creation failed: ${spotonResponse.status} - ${errorData}`
      );
      sendFounderAlert({
        restaurantId: restaurant.id,
        failureType: 'payment_link_failure',
        shortReason: `SpotOn order push returned ${spotonResponse.status} for ${restaurant.name}`,
        actionHint: 'Customer paid but order is NOT in SpotOn. Manually enter the order NOW.',
        metadata: {
          order_id,
          restaurant_id,
          status: spotonResponse.status,
          body: errorData.slice(0, 500),
        },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Failed to push order to SpotOn', details: errorData.slice(0, 500) },
        { status: 500 }
      );
    }

    const spotonData = await spotonResponse.json();
    const spotonOrderId = spotonData.id || spotonData.externalId;

    console.log(
      `[${t0}] [spoton] Order pushed to SpotOn: ${spotonOrderId} (OMRI order: ${order_id})`
    );

    // Update order with SpotOn POS order ID. Non-fatal if it fails — SpotOn
    // already has the order, ops can backfill pos_order_id from logs.
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pos_order_id: spotonOrderId,
        pos_pushed_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    if (updateError) {
      console.error(`[${t0}] [spoton] Order row update failed:`, updateError);
      sendFounderAlert({
        restaurantId: restaurant.id,
        failureType: 'tool_call_failure',
        shortReason: `orders row update failed after successful SpotOn push: ${updateError.message}`,
        actionHint: `SpotOn order ${spotonOrderId} exists; backfill orders.pos_order_id for order ${order_id}.`,
        metadata: { order_id, spoton_order_id: spotonOrderId, db_error: updateError.message },
      }).catch(() => {});
    }

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
 * Build a SpotOn API order payload from OMRI order data.
 * Unchanged from pre-refactor shape — SpotOn's external order schema
 * doesn't depend on per-restaurant vs env credentials.
 */
function buildSpotOnOrderPayload(
  orderId: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  total: number
) {
  const spotonItems = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: Math.round(item.price * 100), // SpotOn uses cents
  }));

  return {
    externalId: orderId,
    type: 'TAKEOUT',
    items: spotonItems,
    total: Math.round((total || 0) * 100), // SpotOn uses cents
    metadata: {
      source: 'omri',
      ringoOrderId: orderId,
    },
  };
}
