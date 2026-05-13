// ──────────────────────────────────────────────────────────────────────────────
// /api/pos/toast — push a paid order into Toast (B2 of Ryno demo sprint).
//
// What this route does:
//   Internal-only POST endpoint. Called by /api/webhooks/toast after Toast
//   reports a customer payment cleared. Takes our internal order ID, looks
//   up the restaurant's toast_restaurant_guid, and calls Toast Orders API
//   (via toast-client) to push the order into the restaurant's Toast queue
//   so the kitchen ticket fires.
//
// Why it's a separate route (not inline in the webhook):
//   - Reusable for manual replay / ops tooling: if the webhook fires but the
//     push fails, an admin can curl this route with the order ID to retry.
//   - Idempotent on order.id — same input → same Toast order GUID (the
//     toast-client uses externalOrderId for Toast's internal dedupe).
//   - Same architecture mirror as /api/pos/square/route.ts so future
//     POS adapters (Clover, SpotOn) follow one pattern.
//
// MOCK vs LIVE:
//   toast-client.createOrder returns canned data in MOCK mode, real Toast
//   API calls in LIVE mode (when TOAST_MODE='live' + credentials are set).
//   Same return shape either way, so this route doesn't know the difference.
//   Until Toast partner approval lands, every call here runs against MOCK
//   and returns a deterministic toast-order-{externalOrderId} GUID.
//
// Failure modes:
//   - Restaurant not found / wrong pos_type → 400, no alert (data error)
//   - Restaurant has no toast_restaurant_guid → 400 + alert (config error)
//   - toast-client throws (LIVE mode network failure, schema mismatch) →
//     500 + payment_link_failure founder alert (the customer has already
//     paid at this point; failing to fire the kitchen is a P0)
//   - Supabase update failure → log + alert, but still return success since
//     the Toast push itself worked (admin can backfill pos_order_id)
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { sendFounderAlert } from '@/lib/alerts';
import { createOrder as toastCreateOrder, getToastMode } from '@/lib/toast/toast-client';
import type { ToastOrderCreateRequest } from '@/lib/toast/toast-client';

interface InternalOrderItem {
  name: string;
  quantity: number;
  price: number;
  /** Mapping from our internal menu_items to Toast menu GUIDs. Optional —
   *  if missing, toast-client receives the name and resolves via Toast's
   *  menu lookup. In MOCK mode this resolution is canned. */
  toast_menu_item_guid?: string;
  modifier_option_guids?: string[];
  special_instructions?: string;
}

interface PushRequestBody {
  restaurant_id: string;
  order_id: string;
  /** Items pulled from orders.items (JSON column). Same shape as Square push. */
  items: InternalOrderItem[];
  /** Optional pickup time as ISO. null = ASAP. */
  scheduled_pickup_at?: string | null;
  /** Optional guest info (sourced from the call.customer_phone / customer_name). */
  guest_name?: string;
  guest_phone?: string;
}

export async function POST(request: NextRequest) {
  const t0 = new Date().toISOString();

  // POS tier rate-limit — this endpoint is called from our own webhook
  // handler, but defensive against direct-call spam.
  const blocked = await checkRateLimit(request, 'POS');
  if (blocked) return blocked;

  let body: PushRequestBody;
  try {
    body = (await request.json()) as PushRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { restaurant_id, order_id, items, scheduled_pickup_at, guest_name, guest_phone } = body;

  if (!restaurant_id || !order_id || !items?.length) {
    return NextResponse.json(
      { error: 'Missing required fields: restaurant_id, order_id, items' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServiceRoleClient();

    // Look up the restaurant to get its Toast GUID + verify pos_type='toast'.
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, pos_type, toast_restaurant_guid, alerts_enabled')
      .eq('id', restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error(`[${t0}] [pos/toast] Restaurant lookup failed:`, restaurantError);
      return NextResponse.json(
        { error: 'Restaurant not found', restaurant_id },
        { status: 400 }
      );
    }

    if (restaurant.pos_type !== 'toast') {
      // This shouldn't happen if the webhook is wired correctly, but defense
      // in depth: don't push to Toast if the restaurant isn't on Toast.
      console.warn(
        `[${t0}] [pos/toast] Wrong pos_type for restaurant ${restaurant_id}: ` +
          `expected 'toast', got '${restaurant.pos_type}'. Skipping push.`
      );
      return NextResponse.json(
        {
          error: `Restaurant pos_type is '${restaurant.pos_type}', not 'toast'`,
          hint: 'Route the order to the correct POS adapter.',
        },
        { status: 400 }
      );
    }

    if (!restaurant.toast_restaurant_guid) {
      // Config error: restaurant is on Toast but we don't have their GUID.
      // This blocks every order until ops sets the GUID — surface immediately.
      console.error(
        `[${t0}] [pos/toast] No toast_restaurant_guid for ${restaurant_id} (${restaurant.name})`
      );
      sendFounderAlert({
        restaurantId: restaurant.id,
        failureType: 'payment_link_failure',
        shortReason: `Toast push blocked: restaurants.toast_restaurant_guid not set for ${restaurant.name}`,
        actionHint:
          'Set restaurants.toast_restaurant_guid in Supabase. Once set, the order can be retried.',
        metadata: { order_id, restaurant_id },
      }).catch(() => {}); // never block the response
      return NextResponse.json(
        {
          error: 'Restaurant has no toast_restaurant_guid configured',
          hint: 'Founder has been alerted; set restaurants.toast_restaurant_guid in Supabase.',
        },
        { status: 400 }
      );
    }

    // Build the Toast order request. The toast-client accepts a normalized
    // ToastOrderCreateRequest — we map our internal item shape to it.
    const toastRequest: ToastOrderCreateRequest = {
      restaurantGuid: restaurant.toast_restaurant_guid,
      externalOrderId: order_id, // Toast uses this for idempotency
      guestName: guest_name,
      guestPhone: guest_phone,
      scheduledPickupAt: scheduled_pickup_at ?? null,
      items: items.map((it) => ({
        // Prefer the Toast menu GUID if we mapped one; fall back to name-based
        // resolution. In MOCK mode the client doesn't actually look up by
        // name, so toast_menu_item_guid is the path that exercises real flow.
        menuItemGuid: it.toast_menu_item_guid || it.name,
        quantity: it.quantity,
        modifierOptionGuids: it.modifier_option_guids,
        specialInstructions: it.special_instructions,
      })),
    };

    const mode = getToastMode();
    const startedAt = Date.now();

    let result;
    try {
      result = await toastCreateOrder(toastRequest);
    } catch (err) {
      // toast-client throws in LIVE mode if the Toast API errors. P0 because
      // the customer has already paid — failing to fire the kitchen ticket
      // means food doesn't get made for an order Toast already collected
      // money for.
      console.error(`[${t0}] [pos/toast] toast-client.createOrder threw:`, err);
      const msg = err instanceof Error ? err.message : String(err);
      sendFounderAlert({
        restaurantId: restaurant.id,
        failureType: 'payment_link_failure',
        shortReason: `Toast Orders API failed: ${msg.slice(0, 120)}`,
        actionHint:
          'Customer has paid but order is not in Toast. Manually enter the order in Toast NOW, then debug.',
        metadata: {
          order_id,
          restaurant_id,
          toast_mode: mode,
          duration_ms: Date.now() - startedAt,
        },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Toast push failed', detail: msg.slice(0, 200) },
        { status: 500 }
      );
    }

    console.log(
      `[${t0}] [pos/toast] mode=${mode} restaurant=${restaurant_id} ` +
        `order=${order_id} → toast_order=${result.toastOrderGuid} ` +
        `total_cents=${result.totalCents} latency_ms=${Date.now() - startedAt}`
    );

    // Update the order row with the Toast order GUID + push timestamp so the
    // dashboard shows "fired" status and analytics can join across systems.
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pos_order_id: result.toastOrderGuid,
        pos_pushed_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    if (updateError) {
      // Toast push succeeded but DB update failed. Non-fatal for the customer
      // (kitchen has the order), but ops needs to backfill. Alert + return
      // success (the Toast side worked).
      console.error(`[${t0}] [pos/toast] Order row update failed:`, updateError);
      sendFounderAlert({
        restaurantId: restaurant.id,
        failureType: 'tool_call_failure',
        shortReason: `orders row update failed after successful Toast push: ${updateError.message}`,
        actionHint: `Toast order ${result.toastOrderGuid} exists; backfill orders.pos_order_id for order ${order_id}.`,
        metadata: { order_id, toast_order_guid: result.toastOrderGuid, db_error: updateError.message },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      mode,
      toast_order_guid: result.toastOrderGuid,
      estimated_ready_at: result.estimatedReadyAt,
      total_cents: result.totalCents,
    });
  } catch (err) {
    // Catch-all — should not normally hit since toast-client.createOrder
    // has its own try/catch above. Defense in depth.
    console.error(`[${t0}] [pos/toast] exception:`, err);
    sendFounderAlert({
      restaurantId: restaurant_id || null,
      failureType: 'tool_call_failure',
      shortReason: `Unhandled exception in /api/pos/toast: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown'}`,
      metadata: { order_id, restaurant_id },
    }).catch(() => {});
    return NextResponse.json(
      { error: 'Internal error pushing order to Toast' },
      { status: 500 }
    );
  }
}
