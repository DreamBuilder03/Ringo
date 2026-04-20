import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { tokenizeMenuName } from '@/lib/menu-search';

interface RetellRequest {
  call: {
    call_id: string;
    agent_id: string;
    from_number: string;
    [key: string]: any;
  };
  args: {
    item_name: string;
  };
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
  if (items.length === 0) {
    return 'Your order is now empty.';
  }

  const itemsList = items
    .map((item) => `${item.quantity}x ${item.name} ($${(item.price * item.quantity).toFixed(2)})`)
    .join(', ');

  return `Current order: ${itemsList}. Subtotal: $${totals.subtotal.toFixed(2)}, Tax: $${totals.tax.toFixed(2)}, Total: $${totals.total.toFixed(2)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RetellRequest;
    const { call, args } = body;
    const { item_name } = args;

    // Every `result` string below is spoken verbatim by the Retell agent.
    // Use natural spoken English so the agent never freezes. Never "Error:".
    if (!call?.agent_id || !call?.call_id) {
      return NextResponse.json(
        { result: "Give me one second — I'm updating your order." },
        { status: 400 }
      );
    }

    if (!item_name) {
      return NextResponse.json(
        { result: "Sure — which item would you like me to remove?" },
        { status: 400 }
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
      return NextResponse.json(
        { result: "Give me one second — I'm pulling up your order." },
        { status: 404 }
      );
    }

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
        .select('id, items')
        .eq('call_id', internalCallId)
        .eq('status', 'building')
        .single();
      order = data;
    }

    const orderFetchError = order ? null : new Error('Order not found');

    if (orderFetchError || !order) {
      console.error(`[${new Date().toISOString()}] Order fetch failed:`, orderFetchError);
      return NextResponse.json(
        { result: "I don't have anything in the order yet — want me to start a new one?" },
        { status: 200 }
      );
    }

    // Token-based matching (see src/lib/menu-search.ts).
    // Customer says "remove the pepperoni" → we tokenize their phrase,
    // then find order items whose names contain every query token.
    // Handles word-order swaps and size omissions: "the pepperoni" matches
    // "Nonna's Pepperoni 18-inch" just fine.
    const currentItems = (order.items as OrderItem[]) || [];
    const queryTokens = tokenizeMenuName(item_name);

    const matchedIndices: number[] = [];
    if (queryTokens.length > 0) {
      currentItems.forEach((item, idx) => {
        const itemTokens = new Set(tokenizeMenuName(item.name));
        const allHit = queryTokens.every((t) => itemTokens.has(t));
        if (allHit) matchedIndices.push(idx);
      });
    }

    // No matches — speakable "I don't see it" message.
    if (matchedIndices.length === 0) {
      return NextResponse.json({
        result: `I don't see ${item_name} in your order yet. What would you like me to take off?`,
      });
    }

    // Multiple matches — ask which one instead of guessing.
    if (matchedIndices.length > 1) {
      const options = matchedIndices
        .map((i) => currentItems[i].name)
        .join(' or the ');
      return NextResponse.json({
        result: `I see a few matches — did you mean the ${options}? Let me know which and I'll take it off.`,
      });
    }

    // Exactly one match — remove it.
    const removedItem = currentItems[matchedIndices[0]];
    const updatedItems = currentItems.filter((_, i) => i !== matchedIndices[0]);

    const taxRate = restaurant.tax_rate ?? DEFAULT_TAX_RATE;
    const totals = calculateTotals(updatedItems, taxRate);

    // Update the order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        items: updatedItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      })
      .eq('id', order.id);

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Order update failed:`, updateError);
      return NextResponse.json(
        { result: "Hmm, I hit a snag updating the order. Let me try that again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: `Removed ${removedItem.name}. ${formatOrderSummary(updatedItems, totals)}`,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Remove-from-order error:`, error);
    return NextResponse.json(
      { result: "Sorry — give me just a second. Something hiccuped on our end." },
      { status: 500 }
    );
  }
}
