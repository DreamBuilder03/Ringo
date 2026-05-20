// ──────────────────────────────────────────────────────────────────────────────
// Restaurant + menu cache — closes Multi-Test scenarios 1 + 22.
//
// PROBLEM (Multi-Test 2026-05-09 audit):
//   Every Retell tool call hits Supabase to look up the restaurant by
//   agent_id AND the full menu_items list for that restaurant. At 100
//   concurrent calls × 4 tool invocations each = 400 serial DB hits per
//   minute. Pool exhaustion + cold-start spikes guaranteed.
//
// FIX:
//   Upstash Redis sliding cache. Reads are served from Redis with a 5-min
//   TTL. Cache miss falls through to Supabase, populates Redis, returns.
//   On Redis unavailable, transparently falls back to direct Supabase —
//   so dev / first-pilot environments without Upstash configured still work.
//
// CACHE INVALIDATION:
//   - On menu import (src/app/api/menu/import/route.ts) → invalidateMenu()
//   - On LC master menu clone (src/components/onboarding/onboarding-flow.tsx) → invalidateMenu()
//   - On admin dashboard menu edits (future /api/menu/items routes) → invalidateMenu()
//
// SCOPE:
//   Used by the read-heavy tool routes:
//     - lookup-item   (restaurant + menu)
//     - add-to-order  (restaurant + menu)
//     - get-modifiers (restaurant + menu)
//     - confirm-order (restaurant)
//     - finalize-payment (restaurant)
//     - remove-from-order (restaurant)
//     - request-handoff (restaurant)
//
//   NOT used for write operations (orders, handoff_requests, alerts_log) —
//   those keep going direct to Supabase. We never cache writes.
// ──────────────────────────────────────────────────────────────────────────────

import { Redis } from '@upstash/redis';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getMenu as toastGetMenu, type ToastMenuSnapshot } from '@/lib/toast/toast-client';

const TTL_SECONDS = 300; // 5 minutes — long enough to absorb a dinner-rush spike,
                          // short enough that menu edits surface within ~5 min.

let cachedRedis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedRedis = null;
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CachedRestaurant {
  id: string;
  name: string;
  brand?: string | null;
  pos_type?: string | null;
  pos_mode?: string | null;
  retell_agent_id?: string | null;
  retell_agent_id_es?: string | null;
  staff_phone_number?: string | null;
  preferred_language?: string | null;
  prompt_overrides?: Record<string, unknown>;
  tax_rate?: number | null;
  // B3: Toast routing fields. Null when the restaurant isn't on Toast.
  toast_restaurant_guid?: string | null;
  toast_management_group_guid?: string | null;
}

export interface CachedMenuItem {
  id: string;
  name: string;
  price: number;
  modifiers: unknown;
  available: boolean;
}

// ─── Restaurant lookup by Retell agent_id (English or Spanish) ───────────────

// Cache-key version bumped 2026-05-20 to invalidate stale entries that survived
// a pos_type change for Ryno's Pizza Demo (cached as 'toast' but DB updated to
// 'square'). Bumping the key prefix forces a cold lookup on the next request
// for every restaurant — small one-time cost, prevents the demo freeze pattern.
const RESTAURANT_BY_AGENT_KEY = (agentId: string) => `omri:restaurant:agent:v2:${agentId}`;

export async function getRestaurantByAgentId(agentId: string): Promise<CachedRestaurant | null> {
  const redis = getRedis();

  // Try cache first
  if (redis) {
    try {
      const cached = await redis.get<CachedRestaurant>(RESTAURANT_BY_AGENT_KEY(agentId));
      if (cached) return cached;
    } catch (err) {
      // Redis hiccup — fall through to Supabase
      console.warn('[restaurant-cache] Redis read failed, falling back to Supabase:', err);
    }
  }

  // Cache miss — fall through to Supabase
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, brand, pos_type, pos_mode, retell_agent_id, retell_agent_id_es, staff_phone_number, preferred_language, prompt_overrides, tax_rate, toast_restaurant_guid, toast_management_group_guid')
    .or(`retell_agent_id.eq.${agentId},retell_agent_id_es.eq.${agentId}`)
    .single();

  if (!data) return null;

  // Populate cache (best-effort)
  if (redis) {
    try {
      await redis.set(RESTAURANT_BY_AGENT_KEY(agentId), data, { ex: TTL_SECONDS });
    } catch (err) {
      console.warn('[restaurant-cache] Redis write failed (non-fatal):', err);
    }
  }

  return data as CachedRestaurant;
}

// ─── Menu lookup for a restaurant ────────────────────────────────────────────

const MENU_KEY = (restaurantId: string) => `omri:menu:${restaurantId}`;

export async function getMenuForRestaurant(restaurantId: string): Promise<CachedMenuItem[]> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<CachedMenuItem[]>(MENU_KEY(restaurantId));
      if (cached) return cached;
    } catch (err) {
      console.warn('[restaurant-cache] Menu Redis read failed, falling back to Supabase:', err);
    }
  }

  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from('menu_items')
    .select('id, name, price, modifiers, available')
    .eq('restaurant_id', restaurantId);

  const menu = (data || []) as CachedMenuItem[];

  if (redis) {
    try {
      await redis.set(MENU_KEY(restaurantId), menu, { ex: TTL_SECONDS });
    } catch (err) {
      console.warn('[restaurant-cache] Menu Redis write failed (non-fatal):', err);
    }
  }

  return menu;
}

// ─── Invalidation — call after writes that change menu or restaurant config ─

/** Invalidate when menu_items changes (import, edit, delete, LC master clone). */
export async function invalidateMenu(restaurantId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(MENU_KEY(restaurantId));
  } catch (err) {
    console.warn('[restaurant-cache] invalidateMenu failed (non-fatal):', err);
  }
}

/** Invalidate when restaurant config changes (agent_id, pos_mode, prompt_overrides, etc).
 *  Pass agentId(s) explicitly — we don't store a reverse-lookup index. */
export async function invalidateRestaurantByAgentId(agentId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(RESTAURANT_BY_AGENT_KEY(agentId));
  } catch (err) {
    console.warn('[restaurant-cache] invalidateRestaurantByAgentId failed (non-fatal):', err);
  }
}

/** Invalidate both restaurant + menu in one call. Use when you've updated
 *  a restaurant row that may have changed its menu (e.g., LC clone after brand
 *  switch).  Pass the restaurant's agent_ids explicitly so we can clear them. */
export async function invalidateAll(restaurantId: string, agentIds: (string | null | undefined)[]): Promise<void> {
  await invalidateMenu(restaurantId);
  for (const agentId of agentIds) {
    if (agentId) await invalidateRestaurantByAgentId(agentId);
  }
}

// ─── Toast menu snapshot cache (B1 — Ryno demo sprint) ─────────────────────────
//
// Toast menus are kept in a separate cache namespace from Supabase-backed
// menus because the shape is different — Toast carries modifier groups +
// business hours that the existing CachedMenuItem doesn't model.
//
// Tool routes (lookup-item, add-to-order, get-modifiers, etc.) check the
// restaurant's pos_type and call this function when pos_type='toast' instead
// of getMenuForRestaurant().
//
// While Toast is in MOCK mode, this function still hits Upstash (the cache
// is upstream of mode detection) so we can verify the cache layer works
// before real credentials arrive. The mock returns are cheap so this is
// purely about exercising the code path.

const TOAST_MENU_KEY = (toastRestaurantGuid: string) => `omri:toast-menu:${toastRestaurantGuid}`;

export async function getToastMenuSnapshot(toastRestaurantGuid: string): Promise<ToastMenuSnapshot> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<ToastMenuSnapshot>(TOAST_MENU_KEY(toastRestaurantGuid));
      if (cached) return cached;
    } catch (err) {
      console.warn('[restaurant-cache] Toast menu Redis read failed, falling back to source:', err);
    }
  }

  // Cache miss — fall through to toast-client.getMenu() (which itself returns
  // MOCK or LIVE based on env). This is what gets cached for 5 min.
  const snapshot = await toastGetMenu(toastRestaurantGuid);

  if (redis) {
    try {
      await redis.set(TOAST_MENU_KEY(toastRestaurantGuid), snapshot, { ex: TTL_SECONDS });
    } catch (err) {
      console.warn('[restaurant-cache] Toast menu Redis write failed (non-fatal):', err);
    }
  }

  return snapshot;
}

/** Invalidate a cached Toast menu — call from Toast webhook handlers when
 *  Toast notifies us that the menu changed for a restaurant. */
export async function invalidateToastMenu(toastRestaurantGuid: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(TOAST_MENU_KEY(toastRestaurantGuid));
  } catch (err) {
    console.warn('[restaurant-cache] invalidateToastMenu failed (non-fatal):', err);
  }
}
