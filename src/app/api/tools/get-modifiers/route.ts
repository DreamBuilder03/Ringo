import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rankMenuMatches } from '@/lib/menu-search';

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
      // STATUS 200 ON ALL FALLBACKS: Retell treats non-2xx as a hard tool failure
      // and refuses to speak the `result` field — agent goes silent until the
      // reminder_message fires. We learned this on call_d920aad6087e00095bd08f0eb95
      // (2026-04-21): empty-args fallback returned 400, agent froze 13s. Speakable
      // fallbacks must always return 200.
      return NextResponse.json(
        { result: "Give me just a second — I'm pulling up the options." },
        { status: 200 }
      );
    }

    if (!item_name) {
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Sure — which item did you want the options for?" },
        { status: 200 }
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
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Give me one second — I'm having trouble pulling up the menu." },
        { status: 200 }
      );
    }

    // Token-matched search (see src/lib/menu-search.ts).
    const { data: allMenu, error: itemError } = await supabase
      .from('menu_items')
      .select('name, modifiers')
      .eq('restaurant_id', restaurant.id);
    const menuItems = allMenu ? rankMenuMatches(allMenu, item_name) : [];

    if (itemError) {
      console.error(`[${new Date().toISOString()}] Menu item search failed:`, itemError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Hmm, the menu search just hiccuped. Let me try once more." },
        { status: 200 }
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
    // 200 — speakable fallback, see note at top of handler.
    return NextResponse.json(
      { result: "Sorry — give me just a second. Something hiccuped on our end." },
      { status: 200 }
    );
  }
}
