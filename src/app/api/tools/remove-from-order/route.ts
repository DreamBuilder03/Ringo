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

const TAX_RATE = 0.0875; // 8.75%

function calculateTotals(items: OrderItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
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

    // Look up restaurant by agent_id
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('retell_agent_id', call.agent_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed:`, restaurantError);
      return NextResponse.json(
        { result: 'Error: Restaurant not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Fetch the building order
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, items')
      .eq('call_id', call.call_id)
      .eq('status', 'building')
      .single();

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

    const totals = calculateTotals(updatedItems);

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
