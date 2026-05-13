// ──────────────────────────────────────────────────────────────────────────────
// /api/toast/menu — admin-only Toast menu inspection route (B1).
//
// What it's for:
//   Misael / future ops want to ask "what does OMRI currently see as the
//   menu for restaurant X via Toast?" This route exposes the cached Toast
//   menu snapshot so we can verify availability, prices, and modifier
//   groups without poking the production Toast API directly.
//
//   It's the Toast analog of clicking through the menu_items table in
//   Supabase for Square-connected restaurants — same purpose, different
//   source of truth.
//
// Auth model:
//   ADMIN_READ rate-limit tier + Supabase service-role lookup. NOT a
//   tool route — Retell agents don't call this directly. The voice tool
//   routes (lookup-item, add-to-order) hit getToastMenuSnapshot()
//   internally; this route is purely for human/admin inspection.
//
// Modes:
//   - GET /api/toast/menu?restaurant_id={uuid}
//       Looks up the restaurant in Supabase, reads toast_restaurant_guid,
//       calls getToastMenuSnapshot() (which serves from Upstash if cached).
//   - GET /api/toast/menu?toast_guid={guid}
//       Skip the Supabase lookup and probe a Toast restaurant GUID directly.
//       Useful when bootstrapping a new pilot before the restaurant row
//       has toast_restaurant_guid populated.
//   - POST /api/toast/menu/refresh?restaurant_id={uuid}
//       Force-invalidate the cache and re-fetch. (Future — not in this commit.)
//
// MOCK vs LIVE:
//   getToastMenuSnapshot ultimately calls toast-client.getMenu which returns
//   MOCK data until Toast partner credentials arrive. The response shape is
//   identical between MOCK and LIVE; mode is reported in the envelope so
//   the caller can tell. This lets us build the entire UI + cache + tool-
//   route stack right now and swap to real data on credential delivery.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { getToastMenuSnapshot } from '@/lib/restaurant-cache';
import { getToastMode } from '@/lib/toast/toast-client';

export async function GET(req: NextRequest) {
  const blocked = await checkRateLimit(req, 'ADMIN_READ');
  if (blocked) return blocked;

  const t0 = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurant_id');
    const toastGuidDirect = url.searchParams.get('toast_guid');

    let toastRestaurantGuid: string | null = null;
    let restaurantName: string | null = null;

    if (toastGuidDirect) {
      // Direct probe path — bypass Supabase, hit Toast (or mock) by GUID.
      toastRestaurantGuid = toastGuidDirect;
      restaurantName = '(direct GUID probe)';
    } else if (restaurantId) {
      // Look up the restaurant to get its toast_restaurant_guid.
      const supabase = await createServiceRoleClient();
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, pos_type, toast_restaurant_guid, toast_menu_last_synced_at')
        .eq('id', restaurantId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Restaurant not found', restaurant_id: restaurantId },
          { status: 404 }
        );
      }

      if (data.pos_type !== 'toast') {
        return NextResponse.json(
          {
            error: `Restaurant is configured for pos_type='${data.pos_type}', not 'toast'`,
            restaurant_id: restaurantId,
            hint: "Use /api/menu/items for non-Toast restaurants, or update restaurants.pos_type='toast'.",
          },
          { status: 400 }
        );
      }

      if (!data.toast_restaurant_guid) {
        return NextResponse.json(
          {
            error: 'Restaurant has no toast_restaurant_guid configured',
            restaurant_id: restaurantId,
            hint: 'Set restaurants.toast_restaurant_guid for this restaurant first, or use ?toast_guid=... for a direct probe.',
          },
          { status: 400 }
        );
      }

      toastRestaurantGuid = data.toast_restaurant_guid;
      restaurantName = data.name;
    } else {
      return NextResponse.json(
        {
          error: 'Missing required query parameter',
          hint: 'Pass either ?restaurant_id={uuid} or ?toast_guid={guid}.',
        },
        { status: 400 }
      );
    }

    // Narrow — every path above either assigns toastRestaurantGuid or returns.
    if (!toastRestaurantGuid) {
      return NextResponse.json({ error: 'Internal: unreachable null guid' }, { status: 500 });
    }

    // Fetch (cached) snapshot.
    const snapshot = await getToastMenuSnapshot(toastRestaurantGuid);
    const mode = getToastMode();

    console.log(
      `[${t0}] [toast/menu] mode=${mode} restaurant_id=${restaurantId || 'direct'} ` +
        `toast_guid=${toastRestaurantGuid} items=${snapshot.items.length} ` +
        `mod_groups=${snapshot.modifierGroups.length}`
    );

    return NextResponse.json({
      mode,
      restaurant: {
        id: restaurantId,
        name: restaurantName,
        toast_restaurant_guid: toastRestaurantGuid,
      },
      snapshot: {
        fetched_at: snapshot.fetchedAt,
        item_count: snapshot.items.length,
        modifier_group_count: snapshot.modifierGroups.length,
        items: snapshot.items,
        modifier_groups: snapshot.modifierGroups,
        hours: snapshot.hours,
      },
    });
  } catch (err) {
    console.error(`[${t0}] [toast/menu] exception:`, err);
    return NextResponse.json(
      { error: 'Internal error fetching Toast menu', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
