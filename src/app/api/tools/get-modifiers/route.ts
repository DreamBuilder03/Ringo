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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RetellRequest;
    const { call, args } = body;
    const { item_name } = args;

    if (!call?.agent_id) {
      return NextResponse.json(
        { result: 'Error: Unable to identify the restaurant. Please try again.' },
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

    // Search for menu item (case-insensitive)
    const { data: menuItems, error: itemError } = await supabase
      .from('menu_items')
      .select('name, modifiers')
      .eq('restaurant_id', restaurant.id)
      .ilike('name', `%${item_name}%`);

    if (itemError) {
      console.error(`[${new Date().toISOString()}] Menu item search failed:`, itemError);
      return NextResponse.json(
        { result: 'Error: Unable to search menu. Please try again.' },
        { status: 500 }
      );
    }

    if (!menuItems || menuItems.length === 0) {
      return NextResponse.json({
        result: `Sorry, we don't have "${item_name}" on our menu.`,
      });
    }

    // Return modifiers for the first matching item
    const item = menuItems[0];

    if (!item.modifiers || !Array.isArray(item.modifiers) || item.modifiers.length === 0) {
      return NextResponse.json({
        result: `${item.name} has no available modifiers.`,
      });
    }

    const modifierStrings = item.modifiers
      .map((mod: any) => `${mod.name} (+$${(mod.price || 0).toFixed(2)})`)
      .join(', ');

    return NextResponse.json({
      result: `Available modifiers for ${item.name}: ${modifierStrings}`,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Get-modifiers error:`, error);
    return NextResponse.json(
      { result: 'Error: Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
