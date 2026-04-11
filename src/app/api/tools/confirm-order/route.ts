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
    customer_phone: string;
  };
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  is_upsell?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RetellRequest;
    const { call, args } = body;
    const { customer_phone } = args;

    if (!call?.agent_id || !call?.call_id) {
      return NextResponse.json(
        { result: 'Error: Unable to identify the call. Please try again.' },
        { status: 400 }
      );
    }

    if (!customer_phone) {
      return NextResponse.json(
        { result: 'Error: Customer phone number is required.' },
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
      .select('id, items, subtotal, tax, total')
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

    // Verify order has items
    const items = order.items as OrderItem[];
    if (!items || items.length === 0) {
      return NextResponse.json({
        result: 'Error: Your order is empty. Please add items before confirming.',
      });
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
      return NextResponse.json(
        { result: 'Error: Unable to confirm order. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: `Order confirmed! Total: $${order.total.toFixed(2)}. We'll send a payment link to your phone shortly.`,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Confirm-order error:`, error);
    return NextResponse.json(
      { result: 'Error: Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
