import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

    if (!call?.agent_id || !call?.call_id) {
      return NextResponse.json(
        { result: 'Error: Unable to identify the call. Please try again.' },
        { status: 400 }
      );
    }

    if (!item_name) {
      return NextResponse.json(
        { result: 'Error: Item name is required.' },
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
        { result: 'Error: Restaurant not found. Please contact support.' },
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
        { result: 'Error: No active order found. Please add items first.' },
        { status: 404 }
      );
    }

    // Filter out the item (case-insensitive match)
    const currentItems = (order.items as OrderItem[]) || [];
    const updatedItems = currentItems.filter(
      (item) => item.name.toLowerCase() !== item_name.toLowerCase()
    );

    // Check if anything was actually removed
    if (updatedItems.length === currentItems.length) {
      return NextResponse.json({
        result: `Item "${item_name}" not found in your order.`,
      });
    }

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
        { result: 'Error: Unable to remove item from order. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: `Removed ${item_name}. ${formatOrderSummary(updatedItems, totals)}`,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Remove-from-order error:`, error);
    return NextResponse.json(
      { result: 'Error: Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
