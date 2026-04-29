import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rankMenuMatches } from '@/lib/menu-search';
import { reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { lookupItemSchema } from '@/lib/schemas/tools';

export async function POST(request: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback
  // (Retell goes silent on non-2xx). See with-retell-validation.ts.
  const check = await validateRetellBody(request, lookupItemSchema, 'lookup-item');
  if (!check.ok) return check.response;

  const callId: string | undefined = check.callId;
  let restaurantId: string | undefined;
  try {
    const { call, args } = check.body;
    const { item_name } = args;

    // Every `result` string below is spoken verbatim by the Retell agent.
    // Use natural spoken English so the agent never freezes. Never "Error:".
    // NOTE: status 200 (not 400) on the friendly fallbacks below is deliberate.
    // Retell treats non-2xx tool responses as hard failures and refuses to speak
    // the `result` back to the caller — the agent goes silent until the
    // reminder_message fires. We learned this the hard way on call
    // call_d920aad6087e00095bd08f0eb95 (2026-04-21): agent invoked lookup_item
    // with empty item_name, hit the 400 fallback, and froze for 13s instead of
    // asking the caller what they wanted. Speakable fallbacks must return 200.
    if (!call?.agent_id) {
      return NextResponse.json(
        { result: "Give me one second — I'm pulling that up." },
        { status: 200 }
      );
    }

    if (!item_name) {
      return NextResponse.json(
        { result: "Sure — what would you like me to look up on the menu?" },
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
        { result: "Give me just a second — I'm having trouble pulling up the menu." },
        { status: 200 }
      );
    }

    restaurantId = restaurant.id;

    // Pull the whole menu and filter in memory with token-based matching.
    // ilike `%query%` fails on word-order swaps like "18-inch Nonna's Pepperoni"
    // vs "Nonna's Pepperoni 18-inch". Token matching is robust to it.
    // Menu is small (<200 rows per restaurant), so this is cheap.
    const { data: allMenu, error: itemError } = await supabase
      .from('menu_items')
      .select('id, name, price, modifiers, available')
      .eq('restaurant_id', restaurant.id);

    if (itemError) {
      console.error(`[${new Date().toISOString()}] Menu item search failed:`, itemError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Hmm, the menu search just hiccuped. Let me try once more." },
        { status: 200 }
      );
    }

    const menuItems = rankMenuMatches(allMenu || [], item_name);

    if (!menuItems || menuItems.length === 0) {
      // Suggestion fallback — pull 5 available items.
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

    // Multiple-match disambiguation.
    //
    // Why: callers say "large pepperoni" but the DB has 10/14/18/24-inch
    // variants. Before 2026-04-22 the tokenizer would drop the caller's
    // query entirely on size adjectives and we'd hit the no-match fallback.
    // Now that size adjectives are STOPWORDS, "large pepperoni" correctly
    // matches every pepperoni variant — but silently returning menuItems[0]
    // (the 10-inch) quotes the wrong price for "large".
    //
    // When more than one variant matches (and they clearly differ by size
    // or count), return a list of all matches with prices so the agent can
    // ask "which size?". Single match → return as before.
    //
    // Safety cap at 5 to keep the spoken response short. Ordered by
    // rankMenuMatches' hit-count sort, so best matches speak first.
    if (menuItems.length > 1) {
      const options = menuItems
        .slice(0, 5)
        .map((m) => `${m.name} for $${m.price.toFixed(2)}`)
        .join(', ');
      return NextResponse.json({
        result: `We have a few options: ${options}. Which one would you like?`,
      });
    }

    // Single match — return it with price + modifiers.
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
    reportToolFailure({
      toolName: 'lookup-item',
      restaurantId: restaurantId ?? null,
      retellCallId: callId ?? null,
      shortReason: `unhandled exception: ${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}`,
    }).catch(() => {});
    // 200 — speakable fallback, see note at top of handler.
    return NextResponse.json(
      { result: "Sorry — give me one second. Something hiccuped on our end." },
      { status: 200 }
    );
  }
}
