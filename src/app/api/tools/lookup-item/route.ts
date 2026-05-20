import { NextRequest, NextResponse } from 'next/server';
import { rankMenuMatches } from '@/lib/menu-search';
import { reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { lookupItemSchema } from '@/lib/schemas/tools';
import { getRestaurantByAgentId, getMenuForRestaurant, getToastMenuSnapshot } from '@/lib/restaurant-cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isOpenNow, findItem, extractSizeInches } from '@/lib/toast/toast-availability';

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

    // ─── Toast branch (B3) ────────────────────────────────────────────────
    // If this restaurant runs on Toast, route through the Toast cached
    // snapshot + availability guards instead of the Supabase menu_items
    // path. The Supabase path stays the default for Square/Clover/etc.
    //
    // Why the branch lives here, not in a wrapper: the decline phrasings
    // for "closed", "86'd", and "ambiguous match" are different enough
    // between Toast (carries business hours + availability flags from the
    // POS itself) and Square (manual store_status + menu_items.available)
    // that flattening them costs more code than it saves. Each path stays
    // readable on its own.
    if (restaurant.pos_type === 'toast') {
      const toastResult = await lookupItemToast(restaurant, item_name);
      if (toastResult) return toastResult;
      // Fall through if Toast branch couldn't decide (e.g., no
      // toast_restaurant_guid configured yet) — try the legacy Supabase
      // path. This is the migration safety net during pilot onboarding.
    }

    // Cached menu — full token-match still happens in memory (cheap; menu <200 rows).
    const allMenu = await getMenuForRestaurant(restaurant.id);
    const menuItems = rankMenuMatches(allMenu, item_name);

    if (!menuItems || menuItems.length === 0) {
      // Suggestion fallback — pull 5 available items from the cached menu.
      // Same speakable conversion as multi-match path so the agent doesn't
      // choke on quote-mark sizes in the suggestions.
      const toSpeakable = (n: string) =>
        n
          .replace(/\((\d+)\s*["'])/g, '$1 inch')
          .replace(/(\d+)\s*["']/g, '$1 inch')
          .replace(/[()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const suggestions = allMenu
        .filter((m) => m.available !== false)
        .slice(0, 5)
        .map((m) => toSpeakable(m.name))
        .join(', ') || 'Please check the menu';
      // Also drop the quoted-back item_name so the spoken response is clean.
      return NextResponse.json({
        result: `Sorry, we don't have that. We do have: ${suggestions}. What sounds good?`,
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
      // TTS-friendly name conversion same as single-match path: strip quote
      // characters and unwrap parens around sizes, so Hailey doesn't choke
      // on `Pepperoni Pizza (12")` and go silent mid-disambiguation.
      // This was the smoking-gun bug from the Ryno dry-run 2026-05-20 —
      // single-match path got the fix, multi-match was missed.
      const toSpeakable = (n: string) =>
        n
          .replace(/\((\d+)\s*["'])/g, '$1 inch')
          .replace(/(\d+)\s*["']/g, '$1 inch')
          .replace(/[()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const options = menuItems
        .slice(0, 5)
        .map((m) => `${toSpeakable(m.name)} for $${m.price.toFixed(2)}`)
        .join(', or ');
      return NextResponse.json({
        result: `We have a few: ${options}. Which one would you like?`,
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
      modifiersText = ` We can add ${modifierStrings} if you'd like.`;
    }

    if (item.available === false) {
      return NextResponse.json({
        result: `Sorry, we're out of ${item.name} right now. What else can I get you?`,
      });
    }

    // TTS-friendly response.
    // Why this matters: menu names like 'Pepperoni Pizza (12")' contain a
    // literal quote character. When Retell's TTS reads that verbatim, it
    // either pronounces 'quote' aloud, pauses oddly, or silently fails
    // (the agent goes mute mid-turn — exactly the symptom we hit during
    // the Ryno demo dry-run, May 19 transcript). Convert quoted sizes to
    // spoken form ('12 inch') and drop trailing punctuation/parens before
    // building the response. Also: conversational shape ('Got it — X for
    // $Y. Want me to add it?') gives the agent an unambiguous next step,
    // matching the Toast-path fix.
    const speakableName = item.name
      .replace(/\((\d+)\s*[""'']\)/g, '$1 inch')
      .replace(/(\d+)\s*[""'']/g, '$1 inch')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json({
      result: `Got it — ${speakableName} for $${item.price.toFixed(2)}.${modifiersText} Want me to add it to your order?`,
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

// ─── Toast branch (B3) ─────────────────────────────────────────────────────────
//
// Handles lookup-item for restaurants on Toast. Returns a 200 JSON response
// with a spoken `result` string the Retell agent reads verbatim — or null
// if this path can't decide (e.g., toast_restaurant_guid missing), letting
// the caller fall through to the legacy Supabase path.
//
// Three decline scenarios covered (per sprint brief acceptance criteria):
//   1. Outside hours → polite "we're closed" + nextOpenSpoken
//   2. 86'd item    → polite "we're out of X" + 3 in-category alternatives
//   3. Ambiguous    → "we have a few options" + first 5 candidates

async function lookupItemToast(
  restaurant: { id: string; name: string; toast_restaurant_guid?: string | null },
  itemName: string
): Promise<Response | null> {
  // Bail if not yet configured — let the legacy path try.
  if (!restaurant.toast_restaurant_guid) {
    console.warn(
      `[lookup-item][toast] Restaurant ${restaurant.id} has pos_type='toast' but no toast_restaurant_guid; falling through.`
    );
    return null;
  }

  let snapshot;
  try {
    snapshot = await getToastMenuSnapshot(restaurant.toast_restaurant_guid);
  } catch (err) {
    console.error(`[lookup-item][toast] Snapshot fetch failed:`, err);
    return NextResponse.json(
      { result: "Give me one second — I'm pulling up the menu." },
      { status: 200 }
    );
  }

  // Hours check first — if we're closed, no point looking up the item.
  const hours = isOpenNow(snapshot);
  if (!hours.isOpen) {
    const opener = hours.nextOpenSpoken
      ? `we open ${hours.nextOpenSpoken}`
      : "we're closed right now";
    return NextResponse.json({
      result: `Sorry, ${opener}. Want me to take your order for then, or is there anything else I can help with?`,
    });
  }

  // Item match.
  const found = findItem(snapshot, itemName);

  if (!found.matched) {
    // No menu match at all — read a few available items.
    const suggestions = snapshot.items
      .filter((i) => i.available)
      .slice(0, 5)
      .map((i) => i.name)
      .join(', ');
    return NextResponse.json({
      result: `Sorry, we don't have "${itemName}" on the menu. We do have: ${suggestions}. What sounds good?`,
    });
  }

  // Ambiguous — let the agent ask which one.
  if (found.ambiguousMatches.length > 1) {
    const options = found.ambiguousMatches
      .slice(0, 5)
      .map((i) => `${i.name} for $${(i.priceCents / 100).toFixed(2)}`)
      .join(', ');
    return NextResponse.json({
      result: `We have a few options: ${options}. Which one would you like?`,
    });
  }

  // 86'd / unavailable.
  if (!found.available) {
    const alts = found.alternatives
      .slice(0, 3)
      .map((i) => i.name)
      .join(', ');
    return NextResponse.json({
      result: alts
        ? `We're actually out of ${found.matched.name} for today. Could I interest you in ${alts}?`
        : `We're out of ${found.matched.name} for today — what else can I get you?`,
    });
  }

  // Available — return name + price + minimal modifier hint.
  //
  // The response is conversational ("Got it — X for $Y. Want me to add it?")
  // so the agent's next step is unambiguous: add_to_order. The terse
  // "Name: $X" format we used before could be re-read by the LLM as data
  // that still needed a follow-up question, which caused the agent to
  // narrate "pulling up sizes" and then freeze on single-size matches
  // during the Ryno demo dry-run (call_xx 2026-05-17).
  //
  // Size modifier suppression: if the item name already carries a size
  // (extractSizeInches finds one), drop the "Size" modifier group from
  // the response. Otherwise the agent reads "Modifiers available: Size"
  // and thinks it still needs to ask which size — even though the size
  // is right there in the name.
  const item = found.matched;
  const itemHasSizeInName = extractSizeInches(item.name) !== null;
  const modGroups = snapshot.modifierGroups
    .filter((g) => item.modifierGroupGuids.includes(g.guid))
    .filter((g) => !(itemHasSizeInName && /size/i.test(g.name)));

  // Only mention modifiers if there's something the customer can actually
  // pick (toppings, sauce, etc.) — and even then, frame it as optional.
  const modText =
    modGroups.length > 0
      ? ` We can customize with ${modGroups
          .map((g) => g.name.toLowerCase())
          .join(' or ')} if you'd like.`
      : '';

  return NextResponse.json({
    result: `Got it — ${item.name} for $${(item.priceCents / 100).toFixed(2)}.${modText} Want me to add it to your order?`,
  });
}
