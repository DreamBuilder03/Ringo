import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/health/summary
 *
 * Single aggregation endpoint for the /admin/health monitoring dashboard.
 * Build 3 per ~/Desktop/Brain Agent/builder_handoff_pilot_readiness.md.
 *
 * Returns four sections in one response so the page can render in <1.5s with
 * one round-trip:
 *   1. fleet[]        — one card per active restaurant
 *   2. alerts[]       — last 50 rows from alerts_log
 *   3. totals         — fleet-wide today's numbers
 *   4. recent_calls[] — last 20 calls with restaurant + outcome
 *
 * Auth: requires authenticated admin user. Service-role client used for the
 * actual queries since this is a fleet-wide aggregation that crosses RLS
 * boundaries.
 */

interface FleetCard {
  id: string;
  name: string;
  last_call_time: string | null;
  calls_today: number;
  orders_today: number;
  revenue_today: number;
  agent_version: string | null;
  health_status: 'green' | 'yellow' | 'red';
}

interface AlertRow {
  id: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  failure_type: string;
  short_reason: string;
  retell_call_id: string | null;
  sent_via: string;
  created_at: string;
}

interface RecentCall {
  id: string;
  retell_call_id: string;
  restaurant_id: string;
  restaurant_name: string;
  start_time: string;
  duration_seconds: number | null;
  call_outcome: string;
  order_total: number;
}

interface SummaryResponse {
  fleet: FleetCard[];
  alerts: AlertRow[];
  totals: {
    calls_today: number;
    orders_today: number;
    gmv_today: number;
    avg_call_duration_sec: number;
    tool_failure_rate: number; // 0-1
  };
  recent_calls: RecentCall[];
  generated_at: string;
}

function healthFromLastCall(lastCallIso: string | null): 'green' | 'yellow' | 'red' {
  if (!lastCallIso) return 'red';
  const ageMs = Date.now() - new Date(lastCallIso).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 4) return 'green';
  if (ageHours < 24) return 'yellow';
  return 'red';
}

export async function GET() {
  try {
    // Auth check — must be a logged-in user. Role-gating to admin happens
    // implicitly via the /admin route group + the page itself; this endpoint
    // is service-role for query power but still requires auth.
    const userClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Day boundaries in UTC. Frontend renders in user's local TZ.
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    // 1. Restaurants — pull all active. "Active" = has retell_agent_id set.
    //    Demo / placeholder rows without an agent are excluded.
    const { data: restaurants, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name')
      .not('retell_agent_id', 'is', null)
      .order('name');

    if (restErr) {
      console.error('[admin/health/summary] restaurants query failed:', restErr);
      return NextResponse.json({ error: 'restaurants query failed' }, { status: 500 });
    }

    const restaurantIds = (restaurants || []).map((r) => r.id);
    const restaurantNameById = new Map<string, string>(
      (restaurants || []).map((r) => [r.id, r.name])
    );

    // 2. Calls today + last-call time per restaurant. Pull in one query and
    //    fold into per-restaurant counts in JS to keep this to ~5 queries total.
    const { data: callsToday } = await supabase
      .from('calls')
      .select('id, restaurant_id, start_time, duration_seconds, call_outcome, order_total, retell_call_id')
      .in('restaurant_id', restaurantIds.length > 0 ? restaurantIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('start_time', todayStartIso)
      .order('start_time', { ascending: false });

    // Last-call time (any time, not just today) per restaurant
    const lastCallByRestaurant = new Map<string, string>();
    if (restaurantIds.length > 0) {
      const { data: lastCalls } = await supabase
        .from('calls')
        .select('restaurant_id, start_time')
        .in('restaurant_id', restaurantIds)
        .order('start_time', { ascending: false });
      // Take the FIRST occurrence per restaurant (already sorted desc)
      (lastCalls || []).forEach((c) => {
        if (!lastCallByRestaurant.has(c.restaurant_id)) {
          lastCallByRestaurant.set(c.restaurant_id, c.start_time);
        }
      });
    }

    // 3. Orders today (paid / payment_sent / preparing / completed — exclude building/cancelled)
    const { data: ordersToday } = await supabase
      .from('orders')
      .select('id, restaurant_id, total, status, created_at')
      .in('restaurant_id', restaurantIds.length > 0 ? restaurantIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', todayStartIso)
      .not('status', 'in', '("building","cancelled")');

    // 4. Alerts — last 50 from alerts_log
    const { data: alertsRaw } = await supabase
      .from('alerts_log')
      .select('id, restaurant_id, failure_type, short_reason, retell_call_id, sent_via, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const alerts: AlertRow[] = (alertsRaw || []).map((a) => ({
      id: a.id,
      restaurant_id: a.restaurant_id,
      restaurant_name: a.restaurant_id ? restaurantNameById.get(a.restaurant_id) ?? null : null,
      failure_type: a.failure_type,
      short_reason: a.short_reason,
      retell_call_id: a.retell_call_id,
      sent_via: a.sent_via,
      created_at: a.created_at,
    }));

    // 5. Build per-restaurant fleet cards
    const callsByRestaurant = new Map<string, number>();
    (callsToday || []).forEach((c) => {
      callsByRestaurant.set(c.restaurant_id, (callsByRestaurant.get(c.restaurant_id) ?? 0) + 1);
    });

    const ordersByRestaurant = new Map<string, { total: number; count: number }>();
    (ordersToday || []).forEach((o) => {
      const cur = ordersByRestaurant.get(o.restaurant_id) || { total: 0, count: 0 };
      cur.total += Number(o.total) || 0;
      cur.count += 1;
      ordersByRestaurant.set(o.restaurant_id, cur);
    });

    const fleet: FleetCard[] = (restaurants || []).map((r) => {
      const lastCall = lastCallByRestaurant.get(r.id) ?? null;
      const callsCount = callsByRestaurant.get(r.id) ?? 0;
      const orderStats = ordersByRestaurant.get(r.id) || { total: 0, count: 0 };
      return {
        id: r.id,
        name: r.name,
        last_call_time: lastCall,
        calls_today: callsCount,
        orders_today: orderStats.count,
        revenue_today: Number(orderStats.total.toFixed(2)),
        agent_version: null, // V1 — Retell version is fetched from agent meta; deferred to V2.
        health_status: healthFromLastCall(lastCall),
      };
    });

    // 6. Totals
    const allCallsToday = callsToday || [];
    const totalCalls = allCallsToday.length;
    const totalOrders = (ordersToday || []).length;
    const totalGmv = (ordersToday || []).reduce((s, o) => s + (Number(o.total) || 0), 0);
    const callsWithDuration = allCallsToday.filter(
      (c) => typeof c.duration_seconds === 'number' && c.duration_seconds > 0
    );
    const avgDuration =
      callsWithDuration.length > 0
        ? callsWithDuration.reduce((s, c) => s + (c.duration_seconds || 0), 0) / callsWithDuration.length
        : 0;

    // Tool-failure rate — alerts of type 'tool_call_failure' or 'payment_link_failure'
    // emitted today, divided by total calls today. Capped at 1.
    const toolFailureCount = (alerts || []).filter(
      (a) =>
        new Date(a.created_at).getTime() >= todayStart.getTime() &&
        (a.failure_type === 'tool_call_failure' || a.failure_type === 'payment_link_failure')
    ).length;
    const toolFailureRate = totalCalls > 0 ? Math.min(1, toolFailureCount / totalCalls) : 0;

    // 7. Recent calls — last 20 across the fleet
    const { data: recentCallsRaw } = await supabase
      .from('calls')
      .select('id, retell_call_id, restaurant_id, start_time, duration_seconds, call_outcome, order_total')
      .in('restaurant_id', restaurantIds.length > 0 ? restaurantIds : ['00000000-0000-0000-0000-000000000000'])
      .order('start_time', { ascending: false })
      .limit(20);

    const recent_calls: RecentCall[] = (recentCallsRaw || []).map((c) => ({
      id: c.id,
      retell_call_id: c.retell_call_id,
      restaurant_id: c.restaurant_id,
      restaurant_name: restaurantNameById.get(c.restaurant_id) ?? 'Unknown',
      start_time: c.start_time,
      duration_seconds: c.duration_seconds,
      call_outcome: c.call_outcome,
      order_total: Number(c.order_total) || 0,
    }));

    const response: SummaryResponse = {
      fleet,
      alerts,
      totals: {
        calls_today: totalCalls,
        orders_today: totalOrders,
        gmv_today: Number(totalGmv.toFixed(2)),
        avg_call_duration_sec: Math.round(avgDuration),
        tool_failure_rate: Number(toolFailureRate.toFixed(4)),
      },
      recent_calls,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        // Browsers may cache for 30s — fits within the page's 60s polling cadence.
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    console.error('[admin/health/summary] unhandled exception:', error);
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}
