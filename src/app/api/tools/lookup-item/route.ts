import { NextRequest, NextResponse } from 'next/server';
import { rankMenuMatches } from '@/lib/menu-search';
import { reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { lookupItemSchema } from '@/lib/schemas/tools';
import { getRestaurantByAgentId, getMenuForRestaurant } from '@/lib/restaurant-cache';
import { createServiceRoleClient } from '@/lib/supabase/server';

// 1-hour staleness window. If store_status hasn't been updated in 60+ min, we
// treat the flag as unknown and default to "available" — prevents a stale
// "off" flag from killing orders all day if staff forgets to flip it back.
const STORE_STATUS_STALE_MS = 60 * 60 * 1000;

function looksLikeHotNReady(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('hot-n-ready') || n.includes('hot n ready') || n.includes('hot and ready');
}

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

    // Restaurant + menu come from Upstash cache (5min TTL) — fixes scenarios
    // 1 + 22. Falls through to Supabase on cache miss / Redis unavailable.
    const restaurant = await getRestaurantByAgentId(call.agent_id);
    if (!restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed for agent_id=${call.agent_id}`);
      return NextResponse.json(
        { result: "Give me just a second — I'm having trouble pulling up the menu." },
        { status: 200 }
      );
    }

    restaurantId = restaurant.id;

    // Cached menu — full token-match still happens in memory (cheap; menu <200 rows).
    const allMenu = await getMenuForRestaurant(restaurant.id);
    const menuItems = rankMenuMatches(allMenu, item_name);

    if (!menuItems || menuItems.length === 0) {
      // Suggestion fallback — pull 5 available items from the cached menu.
      const suggestions = allMenu
        .filter((m) => m.available !== false)
        .slice(0, 5)
        .map((m) => m.name)
        .join(', ') || 'Please check the menu';
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

    // ─── Real-time availability check (closes Multi-Test scenario 28) ──────
    // store_status is read on every match — NOT cached. Cost: one extra DB
    // read per lookup. Worth it: prevents the agent confidently confirming
    // sold-out items (LC's flagship Hot-N-Ready false-promise was the
    // smoking-gun customer-facing failure).
    try {
      const ssClient = await createServiceRoleClient();
      const { data: status } = await ssClient
        .from('store_status')
        .select('hnr_available, hnr_updated_at, items_unavailable_today, items_updated_at')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (status) {
        const itemNameLower = item.name.toLowerCase();

        // Check explicit-unavailable list (case-insensitive) — only if recently updated
        if (status.items_unavailable_today && status.items_unavailable_today.length > 0) {
          const itemsUpdatedAge = Date.now() - new Date(status.items_updated_at).getTime();
          if (itemsUpdatedAge < STORE_STATUS_STALE_MS) {
            const unavailableSet = new Set(
              status.items_unavailable_today.map((s: string) => s.toLowerCase())
            );
            if (unavailableSet.has(itemNameLower)) {
              const altSuggestions = allMenu
                .filter((m) => m.id !== item.id && m.available !== false)
                .filter((m) => !unavailableSet.has(m.name.toLowerCase()))
                .slice(0, 3)
                .map((m) => m.name)
                .join(', ');
              return NextResponse.json({
                result: `Sorry, we just sold out of ${item.name} for today. ${altSuggestions ? `Could I interest you in ${altSuggestions}?` : 'What else can I get you?'}`,
              });
            }
          }
        }

        // LC HnR special-case — only if HnR flag is recent + the item is HnR-shaped
        if (looksLikeHotNReady(item.name)) {
          const hnrUpdatedAge = Date.now() - new Date(status.hnr_updated_at).getTime();
          if (status.hnr_available === false && hnrUpdatedAge < STORE_STATUS_STALE_MS) {
            return NextResponse.json({
              result: `We're actually out of Hot-N-Ready right now — they go fast at peak. I can take your order for a fresh pizza, about 12 to 15 minutes. Would that work?`,
            });
          }
        }
      }
    } catch (statusErr) {
      // store_status read failure is non-fatal — proceed with the item as
      // if status were "available" (better to risk a small wait than freeze
      // the agent over a missing row).
      console.warn('[lookup-item] store_status read failed (non-fatal):', statusErr);
    }

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
