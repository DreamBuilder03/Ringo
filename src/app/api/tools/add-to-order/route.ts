import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getRestaurantByAgentId, getMenuForRestaurant, getToastMenuSnapshot } from '@/lib/restaurant-cache';
import { rankMenuMatches } from '@/lib/menu-search';
import { reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { addToOrderSchema } from '@/lib/schemas/tools';
import { isOpenNow, findItem } from '@/lib/toast/toast-availability';

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  is_upsell?: boolean;
}

const DEFAULT_TAX_RATE = 0.0875; // 8.75% fallback

function calculateTotals(items: OrderItem[], taxRate: number = DEFAULT_TAX_RATE) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

function formatOrderSummary(items: OrderItem[], totals: ReturnType<typeof calculateTotals>) {
  const itemsList = items
    .map((item) => `${item.quantity}x ${item.name} ($${(item.price * item.quantity).toFixed(2)})`)
    .join(', ');

  return `Added ${items[items.length - 1].quantity}x ${items[items.length - 1].name}. Current order: ${itemsList}. Subtotal: $${totals.subtotal.toFixed(2)}, Tax: $${totals.tax.toFixed(2)}, Total: $${totals.total.toFixed(2)}`;
}

export async function POST(request: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(request, addToOrderSchema, 'add-to-order');
  if (!check.ok) return check.response;

  const callId: string | undefined = check.callId;
  let restaurantId: string | undefined;
  try {
    const { call, args } = check.body;
    const { item_name, quantity, modifiers, customer_phone } = args as any;

    // Every `result` string below is spoken verbatim by the Retell agent.
    // Use natural spoken English so the agent never freezes. Never "Error:".
    //
    // STATUS 200 ON ALL FALLBACKS: Retell treats non-2xx as a hard tool failure
    // and refuses to speak the `result` field — agent goes silent until the
    // reminder_message fires. We learned this on call_d920aad6087e00095bd08f0eb95
    // (2026-04-21): empty-args fallback returned 400, agent froze 13s. Speakable
    // fallbacks must always return 200.
    if (!call?.agent_id || !call?.call_id) {
      return NextResponse.json(
        { result: "Give me just one second — I'm looking that up." },
        { status: 200 }
      );
    }

    if (!item_name || !quantity) {
      return NextResponse.json(
        { result: "Sorry — did you want to add an item? If so, tell me what and how many and I'll put it in." },
        { status: 200 }
      );
    }

    // Restaurant + menu now come from Upstash cache (5min TTL) — fixes
    // scenarios 1+22. Falls through to Supabase on miss / Redis unavailable.
    const restaurant = await getRestaurantByAgentId(call.agent_id);
    if (!restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed for agent_id=${call.agent_id}`);
      return NextResponse.json(
        { result: "Give me just a second — I'm having trouble pulling up the menu. I'll try again." },
        { status: 200 }
      );
    }

    restaurantId = restaurant.id;

    // ─── Toast availability guard (B3) ───────────────────────────────────
    // For Toast-connected restaurants, refuse to add items we know are
    // 86'd or out-of-hours. Toast carries availability flags + business
    // hours in the cached menu snapshot, so this is a read against the
    // same 5-min cache as lookup-item.
    //
    // Why guard at add-to-order (not just lookup): callers don't always
    // re-look-up. Common pattern: lookup_item("pepperoni"), then 5 seconds
    // later "add a large pepperoni" — if the item flipped to 86'd in
    // between, lookup is stale and add would create an unfulfillable order.
    if (restaurant.pos_type === 'toast' && restaurant.toast_restaurant_guid) {
      const toastDecline = await checkToastAvailabilityForAdd(
        restaurant.toast_restaurant_guid,
        item_name as string
      );
      if (toastDecline) return toastDecline;
    }

    // Writes still go direct to Supabase. Look up internal call_id for the
    // order linkage (write-side, not cached).
    const supabase = await createServiceRoleClient();
    const { data: callRecord } = await supabase
      .from('calls')
      .select('id')
      .eq('retell_call_id', call.call_id)
      .single();

    const internalCallId = callRecord?.id || null;

    // Cached menu — token-match still happens in memory.
    const allMenu = await getMenuForRestaurant(restaurant.id);
    const matches = rankMenuMatches(allMenu, item_name);
    if (matches.length === 0) {
      return NextResponse.json(
        { result: `I don't see "${item_name}" on our menu. Want me to read off what we do have, or did you mean something else?` },
        { status: 200 }
      );
    }

    const menuItem: MenuItem = matches[0];

    // If we have an internal call ID, look for existing building order
    let existingOrder = null;
    if (internalCallId) {
      const { data } = await supabase
        .from('orders')
        .select('id, items, subtotal, tax, total')
        .eq('call_id', internalCallId)
        .eq('status', 'building')
        .single();
      existingOrder = data;
    }

    let currentItems: OrderItem[] = [];

    if (existingOrder) {
      // Order exists, append item
      currentItems = existingOrder.items as OrderItem[];
    }

    // Add new item to cart
    const newOrderItem: OrderItem = {
      name: menuItem.name,
      quantity,
      price: menuItem.price,
      is_upsell: args.is_upsell === true,
    };

    currentItems.push(newOrderItem);
    const taxRate = restaurant.tax_rate ?? DEFAULT_TAX_RATE;
    const totals = calculateTotals(currentItems, taxRate);

    // Insert or update order
    if (existingOrder) {
      // Update existing order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          items: currentItems,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
        })
        .eq('id', existingOrder.id);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] Order update failed:`, updateError);
        // 200 — speakable fallback, see note at top of handler.
        return NextResponse.json(
          { result: "Give me one more second — I'm adding that to your order now." },
          { status: 200 }
        );
      }
    } else {
      // Create new order
      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          call_id: internalCallId,
          restaurant_id: restaurant.id,
          customer_phone: customer_phone || call.from_number || '',
          items: currentItems,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          status: 'building',
        });

      if (insertError) {
        console.error(`[${new Date().toISOString()}] Order insert failed:`, insertError);
        // 200 — speakable fallback, see note at top of handler.
        return NextResponse.json(
          { result: "Give me one more second — I'm adding that to your order now." },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      result: formatOrderSummary(currentItems, totals),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Add-to-order error:`, error);
    reportToolFailure({
      toolName: 'add-to-order',
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

// ─── Toast availability guard (B3) ─────────────────────────────────────────────
//
// Returns a 200 JSON response if the add should be declined (closed, 86'd),
// or null if the add can proceed. Same decline phrasings as lookup-item for
// consistency.
//
// Performance: hits the Upstash-backed Toast menu snapshot (5-min cache).
// Adds one cache read per add_to_order — well under our latency budget.

async function checkToastAvailabilityForAdd(
  toastRestaurantGuid: string,
  itemName: string
): Promise<Response | null> {
  let snapshot;
  try {
    snapshot = await getToastMenuSnapshot(toastRestaurantGuid);
  } catch (err) {
    console.error(`[add-to-order][toast] Snapshot fetch failed:`, err);
    // Be permissive on cache failure — let the legacy menu_items path try.
    return null;
  }

  const hours = isOpenNow(snapshot);
  if (!hours.isOpen) {
    const opener = hours.nextOpenSpoken
      ? `we open ${hours.nextOpenSpoken}`
      : "we're closed right now";
    return NextResponse.json({
      result: `Sorry, ${opener} — I can't add anything to the order until we're open. Want me to take this for then?`,
    });
  }

  const found = findItem(snapshot, itemName);

  // No match on Toast menu — fall through to legacy path. The legacy path
  // may have a Supabase menu_items row that matches (during migration).
  if (!found.matched) return null;

  if (!found.available) {
    const alts = found.alternatives
      .slice(0, 3)
      .map((i) => i.name)
      .join(', ');
    return NextResponse.json({
      result: alts
        ? `We're actually out of ${found.matched.name} for today. Could I swap it for ${alts} instead?`
        : `We're out of ${found.matched.name} for today — what else can I get you?`,
    });
  }

  // Available — let the legacy path actually insert the order row.
  return null;
}
