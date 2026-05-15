import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { confirmOrderSchema } from '@/lib/schemas/tools';
import { getToastMenuSnapshot } from '@/lib/restaurant-cache';
import { isOpenNow, findItem } from '@/lib/toast/toast-availability';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  is_upsell?: boolean;
}

export async function POST(request: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(request, confirmOrderSchema, 'confirm-order');
  if (!check.ok) return check.response;

  const callId: string | undefined = check.callId;
  let restaurantId: string | undefined;
  try {
    const { call, args } = check.body as any;
    // Phone resolution — accept every arg alias we've ever shipped:
    //   customer_phone (canonical) → phone (legacy) → phone_number (Retell schema drift)
    //   → call.from_number (Twilio caller ID fallback)
    // Mirrors finalize-payment so the agent never dead-loops asking for a phone.
    const customer_phone =
      args.customer_phone || args.phone || args.phone_number || call?.from_number;

    // Every `result` string below is spoken verbatim by the Retell agent.
    // Use natural spoken English so the agent never freezes. Never "Error:".
    if (!call?.agent_id || !call?.call_id) {
      // STATUS 200 ON ALL FALLBACKS: Retell treats non-2xx as a hard tool failure
      // and refuses to speak the `result` field — agent goes silent until the
      // reminder_message fires. We learned this on call_d920aad6087e00095bd08f0eb95
      // (2026-04-21): empty-args fallback returned 400, agent froze 13s. Speakable
      // fallbacks must always return 200.
      return NextResponse.json(
        { result: "Give me just a moment — I'm looking that up." },
        { status: 200 }
      );
    }

    if (!customer_phone) {
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "I just need a phone number to text the payment link to. What's the best number?" },
        { status: 200 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent_id (check both English and Spanish agents).
    // pos_type + toast_restaurant_guid are needed so the Toast availability
    // re-check below can verify the order is still fulfillable.
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, pos_type, toast_restaurant_guid')
      .or(`retell_agent_id.eq.${call.agent_id},retell_agent_id_es.eq.${call.agent_id}`)
      .single();

    if (restaurantError || !restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed:`, restaurantError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Give me one second — I'm pulling up the restaurant's system." },
        { status: 200 }
      );
    }

    restaurantId = restaurant.id;

    // Look up internal call ID from Retell call ID
    const { data: callRecord } = await supabase
      .from('calls')
      .select('id')
      .eq('retell_call_id', call.call_id)
      .single();

    const internalCallId = callRecord?.id || null;

    // Fetch the building order
    let order = null;
    if (internalCallId) {
      const { data } = await supabase
        .from('orders')
        .select('id, items, subtotal, tax, total')
        .eq('call_id', internalCallId)
        .eq('status', 'building')
        .single();
      order = data;
    }

    const orderFetchError = order ? null : new Error('Order not found');

    if (orderFetchError || !order) {
      console.error(`[${new Date().toISOString()}] Order fetch failed:`, orderFetchError);
      return NextResponse.json(
        { result: "I don't have any items in the order yet — can you tell me what you'd like and I'll add it?" },
        { status: 200 }
      );
    }

    // Verify order has items
    const items = order.items as OrderItem[];
    if (!items || items.length === 0) {
      return NextResponse.json({
        result: "Looks like the order is empty so far. What can I get started for you?",
      });
    }

    // ─── Toast availability re-check at confirm time (gap close) ─────────
    // B3 guards lookup_item + add_to_order so a caller can't add a 86'd
    // item or order outside hours. But items can flip availability between
    // the add and the confirm (someone walks in and orders the last
    // cannoli during the call). Re-check the whole order here so we never
    // confirm an unfulfillable basket.
    //
    // Three failure modes covered:
    //   1. Restaurant just closed → tell the caller, suggest next open
    //   2. One+ items in the order are now 86'd → name them, ask to remove
    //   3. (Edge case) Toast cache fetch fails → fall through and let the
    //      confirm proceed (better a borderline confirm than a hard freeze)
    if (
      restaurant.pos_type === 'toast' &&
      restaurant.toast_restaurant_guid
    ) {
      const decline = await reCheckToastAvailability(
        restaurant.toast_restaurant_guid,
        items
      );
      if (decline) return decline;
    }

    // ─── store_status re-check (Square / Clover / SpotOn restaurants) ────
    // Toast carries availability flags in its menu snapshot (above branch
    // handles it). For all other POS systems, OMRI's store_status table is
    // the universal source of truth for "what's 86'd today." Staff flips
    // items off via the dashboard or admin SQL; the voice agent sees the
    // change within seconds at the next confirm_order.
    //
    // Same architectural pattern as the Toast branch — re-check the whole
    // basket at confirm time so we never lock in an order that includes
    // an item that flipped 86'd after add_to_order ran.
    if (restaurant.pos_type !== 'toast') {
      const decline = await reCheckStoreStatusAvailability(supabase, restaurant.id, items);
      if (decline) return decline;
    }

    // Update order status to pending and store customer phone
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pending',
        customer_phone,
      })
      .eq('id', order.id);

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Order update failed:`, updateError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Hmm, I hit a snag locking that in. Let me try one more time." },
        { status: 200 }
      );
    }

    return NextResponse.json({
      result: `Order confirmed! Total: $${order.total.toFixed(2)}. We'll send a payment link to your phone shortly.`,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Confirm-order error:`, error);
    reportToolFailure({
      toolName: 'confirm-order',
      restaurantId: restaurantId ?? null,
      retellCallId: callId ?? null,
      shortReason: `unhandled exception: ${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}`,
    }).catch(() => {});
    // 200 — speakable fallback, see note at top of handler.
    return NextResponse.json(
      { result: "Sorry — give me just a second. Something hiccuped on our end." },
      { status: 200 }
    );
  }
}

// ─── Toast availability re-check at confirm time ──────────────────────────────
//
// Walks every item in the basket against the current Toast snapshot.
// Returns a 200 NextResponse with a speakable decline if the order is no
// longer fulfillable, or null if everything still checks out.
//
// Why a re-check here is worth the extra cache read:
//   - Items can flip 86'd between add_to_order and confirm_order (the call
//     can take 3-5 minutes; in the dinner rush a hot item runs out fast)
//   - The hours guard at lookup/add doesn't catch the edge case where the
//     caller dawdles past closing time
//   - Confirming an unfulfillable order is worse than declining at this
//     step — the kitchen ticket would fire, food wouldn't get made, the
//     customer would show up to an empty pickup window
//
// Cache-fetch failure path: we return null (let the confirm proceed). Better
// to accept a slightly-stale order than freeze the agent on a transient cache
// hiccup. Worst case the Toast Orders API push later catches the issue.

async function reCheckToastAvailability(
  toastRestaurantGuid: string,
  items: OrderItem[]
): Promise<Response | null> {
  let snapshot;
  try {
    snapshot = await getToastMenuSnapshot(toastRestaurantGuid);
  } catch (err) {
    console.warn(`[confirm-order][toast] Snapshot fetch failed, allowing confirm:`, err);
    return null;
  }

  // Hours check first — if the restaurant just closed, decline outright.
  const hours = isOpenNow(snapshot);
  if (!hours.isOpen) {
    const opener = hours.nextOpenSpoken
      ? `we open ${hours.nextOpenSpoken}`
      : "we're closed right now";
    return NextResponse.json({
      result: `Sorry, ${opener} — I can't lock this order in. Want me to take it for then?`,
    });
  }

  // Per-item availability check. Build a list of items that are now 86'd so
  // we can name them specifically in the decline phrasing.
  const unavailable: string[] = [];
  for (const it of items) {
    const found = findItem(snapshot, it.name);
    if (found.matched && !found.available) {
      unavailable.push(found.matched.name);
    }
  }

  if (unavailable.length === 0) {
    return null; // everything still fulfillable
  }

  // One-item decline: offer to swap.
  if (unavailable.length === 1) {
    return NextResponse.json({
      result: `Quick check — we actually just ran out of ${unavailable[0]}. Want me to swap it for something else, or take it off the order?`,
    });
  }

  // Multi-item decline: list them.
  return NextResponse.json({
    result: `Quick heads-up — we just ran out of ${unavailable.join(' and ')}. Want me to take them off the order, or swap them for something else?`,
  });
}

// ─── store_status re-check (Square / Clover / SpotOn) ─────────────────────────
//
// Universal availability guard for non-Toast restaurants. Reads the
// restaurant's store_status row (1 row per restaurant, keyed by restaurant_id)
// and walks every item in the basket against the items_unavailable_today array.
//
// Stale-data guard: if store_status hasn't been updated in 60+ minutes, we
// treat the flag as unknown and let the confirm proceed. Prevents a forgotten
// "off" flag from killing orders all day.
//
// Cache-fetch / DB failure → return null (let confirm proceed). Better to
// accept a borderline order than freeze the agent on a transient hiccup.

const STORE_STATUS_STALE_MS = 60 * 60 * 1000; // 1 hour

async function reCheckStoreStatusAvailability(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  restaurantId: string,
  items: OrderItem[]
): Promise<Response | null> {
  try {
    const { data: status } = await supabase
      .from('store_status')
      .select('items_unavailable_today, items_updated_at')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!status) return null;
    if (!status.items_unavailable_today || status.items_unavailable_today.length === 0) {
      return null;
    }

    // Honor the 1-hour staleness window — same as lookup-item.
    const updatedAt = status.items_updated_at
      ? new Date(status.items_updated_at).getTime()
      : 0;
    if (Date.now() - updatedAt >= STORE_STATUS_STALE_MS) {
      return null;
    }

    const unavailableSet = new Set(
      (status.items_unavailable_today as string[]).map((s) => s.toLowerCase())
    );

    const unavailable: string[] = [];
    for (const it of items) {
      if (unavailableSet.has(it.name.toLowerCase())) {
        unavailable.push(it.name);
      }
    }

    if (unavailable.length === 0) return null;

    if (unavailable.length === 1) {
      return NextResponse.json({
        result: `Quick check — we actually just ran out of ${unavailable[0]} for today. Want me to swap it for something else, or take it off the order?`,
      });
    }

    return NextResponse.json({
      result: `Quick heads-up — we just sold out of ${unavailable.join(' and ')} for today. Want me to take them off the order, or swap them for something else?`,
    });
  } catch (err) {
    // Be permissive on lookup failure — let the confirm proceed.
    console.warn('[confirm-order][store_status] read failed (non-fatal):', err);
    return null;
  }
}
