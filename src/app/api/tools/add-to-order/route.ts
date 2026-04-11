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
    quantity: number;
    modifiers?: string[];
    customer_phone?: string;
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
  const itemsList = items
    .map((item) => `${item.quantity}x ${item.name} ($${(item.price * item.quantity).toFixed(2)})`)
    .join(', ');

  return `Added ${items[items.length - 1].quantity}x ${items[items.length - 1].name}. Current order: ${itemsList}. Subtotal: $${totals.subtotal.toFixed(2)}, Tax: $${totals.tax.toFixed(2)}, Total: $${totals.total.toFixed(2)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RetellRequest;
    const { call, args } = body;
    const { item_name, quantity, modifiers, customer_phone } = args;

    if (!call?.agent_id || !call?.call_id) {
      return NextResponse.json(
        { result: 'Error: Unable to identify the call. Please try again.' },
        { status: 400 }
      );
    }

    if (!item_name || !quantity) {
      return NextResponse.json(
        { result: 'Error: Item name and quantity are required.' },
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

    // Look up menu item
    const { data: menuItems, error: itemError } = await supabase
      .from('menu_items')
      .select('id, name, price')
      .eq('restaurant_id', restaurant.id)
      .ilike('name', `%${item_name}%`)
      .limit(1);

    if (itemError || !menuItems || menuItems.length === 0) {
      console.error(`[${new Date().toISOString()}] Menu item lookup failed:`, itemError);
      return NextResponse.json(
        { result: `Error: "${item_name}" not found on the menu. Please try another item.` },
        { status: 404 }
      );
    }

    const menuItem: MenuItem = menuItems[0];

    // Check if an order already exists for this call
    const { data: existingOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, items, subtotal, tax, total')
      .eq('call_id', call.call_id)
      .eq('status', 'building')
      .single();

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
      is_upsell: false,
    };

    currentItems.push(newOrderItem);
    const totals = calculateTotals(currentItems);

    // Upsert the order
    const { error: upsertError } = await supabase.from('orders').upsert(
      {
        call_id: call.call_id,
        restaurant_id: restaurant.id,
        customer_phone: customer_phone || null,
        items: currentItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        status: 'building',
      },
      {
        onConflict: 'call_id',
      }
    );

    if (upsertError) {
      console.error(`[${new Date().toISOString()}] Order upsert failed:`, upsertError);
      return NextResponse.json(
        { result: 'Error: Unable to add item to order. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: formatOrderSummary(currentItems, totals),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Add-to-order error:`, error);
    return NextResponse.json(
      { result: 'Error: Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
