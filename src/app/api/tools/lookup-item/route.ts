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

    // Every `result` string below is spoken verbatim by the Retell agent.
    // Use natural spoken English so the agent never freezes. Never "Error:".
    if (!call?.agent_id) {
      return NextResponse.json(
        { result: "Give me one second — I'm pulling that up." },
        { status: 400 }
      );
    }

    if (!item_name) {
      return NextResponse.json(
        { result: "Sure — what would you like me to look up on the menu?" },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent_id (check both English and Spanish agents)
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .or(`retell_agent_id.eq.${call.agent_id},retell_agent_id_es.eq.${call.agent_id}`)
      .single();

    if (restaurantError || !restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed:`, restaurantError);
      return NextResponse.json(
        { result: "Give me just a second — I'm having trouble pulling up the menu." },
        { status: 404 }
      );
    }

    // Search for menu item (case-insensitive)
    const { data: menuItems, error: itemError } = await supabase
      .from('menu_items')
      .select('id, name, price, modifiers, available')
      .eq('restaurant_id', restaurant.id)
      .ilike('name', `%${item_name}%`);

    if (itemError) {
      console.error(`[${new Date().toISOString()}] Menu item search failed:`, itemError);
      return NextResponse.json(
        { result: "Hmm, the menu search just hiccuped. Let me try once more." },
        { status: 500 }
      );
    }

    if (!menuItems || menuItems.length === 0) {
      // Get all items for suggestions
      const { data: allItems } = await supabase
        .from('menu_items')
        .select('name')
        .eq('restaurant_id', restaurant.id)
        .eq('available', true)
        .limit(5);

      const suggestions = allItems?.map((item) => item.name).join(', ') || 'Please check the menu';
      return NextResponse.json({
        result: `Sorry, we don't have "${item_name}" on our menu. We do have: ${suggestions}`,
      });
    }

    // Return the first matching item
    const item = menuItems[0];
    let modifiersText = '';

    if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      const modifierStrings = item.modifiers
        .map((mod: any) => `${mod.name} (+$${(mod.price || 0).toFixed(2)})`)
        .join(', ');
      modifiersText = `. Available modifiers: ${modifierStrings}`;
    }

    const availabilityText = item.available === false ? ' (Currently unavailable)' : '';

    return NextResponse.json({
      result: `${item.name}: $${item.price.toFixed(2)}${availabilityText}${modifiersText}`,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Lookup-item error:`, error);
    return NextResponse.json(
      { result: "Sorry — give me one second. Something hiccuped on our end." },
      { status: 500 }
    );
  }
}
