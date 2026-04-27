import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rankMenuMatches } from '@/lib/menu-search';
import { reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { addToOrderSchema } from '@/lib/schemas/tools';

interface RetellRequest {
  call: {
    call_id: string;
    agent_id: string;
    from_number: string;
    [key: string]: any;
  };
  args: {
    item_name: string;
    quantity: number;
    modifiers?: string[];
    customer_phone?: string;
    is_upsell?: boolean;
  };
}

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

  let callId: string | undefined = check.callId;
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

    // Initialize Supabase client
    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent_id (check both English and Spanish agents)
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, tax_rate')
      .or(`retell_agent_id.eq.${call.agent_id},retell_agent_id_es.eq.${call.agent_id}`)
      .single();

    if (restaurantError || !restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed:`, restaurantError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Give me just a second — I'm having trouble pulling up the menu. I'll try again." },
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

    // Token-matched menu lookup (see src/lib/menu-search.ts — handles
    // word-order swaps like "18-inch Nonna's Pepperoni" vs
    // "Nonna's Pepperoni 18-inch").
    const { data: allMenu, error: itemError } = await supabase
      .from('menu_items')
      .select('id, name, price')
      .eq('restaurant_id', restaurant.id);

    if (itemError) {
      console.error(`[${new Date().toISOString()}] Menu item lookup failed:`, itemError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Hmm, give me just a second — I'm pulling up the menu." },
        { status: 200 }
      );
    }

    const matches = rankMenuMatches(allMenu || [], item_name);
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
