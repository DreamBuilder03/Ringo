import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantByAgentId, getMenuForRestaurant } from '@/lib/restaurant-cache';
import { rankMenuMatches } from '@/lib/menu-search';
import { reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { getModifiersSchema } from '@/lib/schemas/tools';

export async function POST(request: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(request, getModifiersSchema, 'get-modifiers');
  if (!check.ok) return check.response;

  const callId: string | undefined = check.callId;
  let restaurantId: string | undefined;
  try {
    const { call, args } = check.body;
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

    // Restaurant + menu via Upstash cache — fixes scenarios 1+22.
    const restaurant = await getRestaurantByAgentId(call.agent_id);
    if (!restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed for agent_id=${call.agent_id}`);
      return NextResponse.json(
        { result: "Give me one second — I'm having trouble pulling up the menu." },
        { status: 200 }
      );
    }

    restaurantId = restaurant.id;

    // Cached menu — token-match still happens in memory.
    const allMenu = await getMenuForRestaurant(restaurant.id);
    const menuItems = rankMenuMatches(allMenu, item_name);

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
    reportToolFailure({
      toolName: 'get-modifiers',
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
