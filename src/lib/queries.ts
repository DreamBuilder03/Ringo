import type { SupabaseClient } from '@supabase/supabase-js';
import type { Call, Restaurant, RestaurantWithStats, OrderItem } from '@/types/database';

// ──────── Get authenticated user's restaurant ────────
export async function getUserRestaurant(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('restaurant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.restaurant_id) {
    // Try to find restaurant by owner_user_id
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single();

    return restaurant as Restaurant | null;
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', profile.restaurant_id)
    .single();

  return restaurant as Restaurant | null;
}

// ──────── Dashboard stats for today ────────
export async function getDashboardStats(supabase: SupabaseClient, restaurantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: calls, error } = await supabase
    .from('calls')
    .select('id, call_outcome, order_total, upsell_total, start_time, duration_seconds')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', todayISO)
    .order('start_time', { ascending: false });

  if (error || !calls) {
    return {
      totalCalls: 0,
      ordersTaken: 0,
      revenue: 0,
      upsellRevenue: 0,
      answerRate: 0,
      calls: [],
    };
  }

  const totalCalls = calls.length;
  const missed = calls.filter((c: any) => c.call_outcome === 'missed').length;
  const ordersTaken = calls.filter((c: any) => c.call_outcome === 'order_placed').length;
  const revenue = calls.reduce((sum: number, c: any) => sum + (c.order_total || 0), 0);
  const upsellRevenue = calls.reduce((sum: number, c: any) => sum + (c.upsell_total || 0), 0);
  const answerRate = totalCalls > 0 ? Math.round(((totalCalls - missed) / totalCalls) * 100) : 100;

  return { totalCalls, ordersTaken, revenue, upsellRevenue, answerRate, calls };
}

// ──────── Recent calls for a restaurant ────────
export async function getRecentCalls(
  supabase: SupabaseClient,
  restaurantId: string,
  limit = 50,
  offset = 0,
  outcomeFilter?: string,
  dateFrom?: string,
  dateTo?: string
) {
  let query = supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('start_time', { ascending: false })
    .range(offset, offset + limit - 1);

  if (outcomeFilter && outcomeFilter !== 'all') {
    query = query.eq('call_outcome', outcomeFilter);
  }
  if (dateFrom) {
    query = query.gte('start_time', dateFrom);
  }
  if (dateTo) {
    query = query.lte('start_time', dateTo);
  }

  const { data, count, error } = await query;

  return {
    calls: (data || []) as Call[],
    total: count || 0,
    error,
  };
}

// ──────── Monthly ROI stats ────────
export async function getMonthlyStats(supabase: SupabaseClient, restaurantId: string) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Current month
  const { data: currentCalls } = await supabase
    .from('calls')
    .select('order_total, upsell_total, call_outcome, duration_seconds')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', firstOfMonth.toISOString());

  // Last month
  const { data: lastCalls } = await supabase
    .from('calls')
    .select('order_total, upsell_total')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', firstOfLastMonth.toISOString())
    .lte('created_at', endOfLastMonth.toISOString());

  const current = currentCalls || [];
  const last = lastCalls || [];

  const currentRevenue = current.reduce((sum: number, c: any) => sum + (c.order_total || 0), 0);
  const currentUpsell = current.reduce((sum: number, c: any) => sum + (c.upsell_total || 0), 0);
  const lastRevenue = last.reduce((sum: number, c: any) => sum + (c.order_total || 0), 0);

  const revenueChange = lastRevenue > 0 ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100) : 0;

  const orders = current.filter((c: any) => c.call_outcome === 'order_placed');
  const avgOrderValue = orders.length > 0 ? (currentRevenue + currentUpsell) / orders.length : 0;
  const avgDuration = current.length > 0
    ? Math.round(current.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / current.length)
    : 0;
  const conversionRate = current.length > 0 ? Math.round((orders.length / current.length) * 100) : 0;

  return {
    monthlyOrderRevenue: currentRevenue,
    monthlyUpsellRevenue: currentUpsell,
    totalCalls: current.length,
    revenueChange,
    avgOrderValue,
    avgDuration,
    conversionRate,
  };
}

// ──────── Peak hours heatmap from real data ────────
export async function getPeakHours(supabase: SupabaseClient, restaurantId: string) {
  // Get calls from the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: calls } = await supabase
    .from('calls')
    .select('start_time')
    .eq('restaurant_id', restaurantId)
    .gte('start_time', weekAgo.toISOString());

  const heatmap: Record<string, Record<number, number>> = {
    Mon: {}, Tue: {}, Wed: {}, Thu: {}, Fri: {}, Sat: {}, Sun: {},
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  (calls || []).forEach((call: any) => {
    const d = new Date(call.start_time);
    const day = dayNames[d.getDay()];
    const hour = d.getHours();
    heatmap[day][hour] = (heatmap[day][hour] || 0) + 1;
  });

  return heatmap;
}

// ──────── Analytics with time range ────────
export async function getAnalytics(supabase: SupabaseClient, restaurantId: string, range: '7d' | '30d' | '90d') {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const prevStartDate = new Date();
  prevStartDate.setDate(prevStartDate.getDate() - days * 2);

  // Current period calls
  const { data: currentCalls } = await supabase
    .from('calls')
    .select('id, call_outcome, order_total, upsell_total, duration_seconds, start_time')
    .eq('restaurant_id', restaurantId)
    .gte('start_time', startDate.toISOString())
    .order('start_time', { ascending: true });

  // Previous period for trend comparison
  const { data: prevCalls } = await supabase
    .from('calls')
    .select('order_total, upsell_total, call_outcome')
    .eq('restaurant_id', restaurantId)
    .gte('start_time', prevStartDate.toISOString())
    .lt('start_time', startDate.toISOString());

  // Top items from order_items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('item_name, quantity, unit_price, is_upsell')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', startDate.toISOString());

  const current = currentCalls || [];
  const prev = prevCalls || [];
  const items = orderItems || [];

  // Calculate stats
  const totalCalls = current.length;
  const ordersPlaced = current.filter((c: any) => c.call_outcome === 'order_placed').length;
  const revenue = current.reduce((sum: number, c: any) => sum + (c.order_total || 0), 0);
  const upsellRevenue = current.reduce((sum: number, c: any) => sum + (c.upsell_total || 0), 0);
  const missed = current.filter((c: any) => c.call_outcome === 'missed').length;
  const answerRate = totalCalls > 0 ? Math.round(((totalCalls - missed) / totalCalls) * 100) : 100;
  const avgDuration = totalCalls > 0
    ? Math.round(current.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / totalCalls)
    : 0;
  const avgOrderValue = ordersPlaced > 0 ? (revenue + upsellRevenue) / ordersPlaced : 0;
  const conversionRate = totalCalls > 0 ? Math.round((ordersPlaced / totalCalls) * 100) : 0;

  // Trends vs previous period
  const prevTotal = prev.length;
  const prevOrders = prev.filter((c: any) => c.call_outcome === 'order_placed').length;
  const prevRevenue = prev.reduce((sum: number, c: any) => sum + (c.order_total || 0), 0);
  const prevUpsell = prev.reduce((sum: number, c: any) => sum + (c.upsell_total || 0), 0);

  const calcTrend = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;

  // Daily breakdown
  const dailyCalls: number[] = [];
  const dailyRevenue: number[] = [];
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayCalls = current.filter((c: any) => {
      const t = new Date(c.start_time);
      return t >= dayStart && t < dayEnd;
    });

    dailyCalls.push(dayCalls.length);
    dailyRevenue.push(dayCalls.reduce((sum: number, c: any) => sum + (c.order_total || 0) + (c.upsell_total || 0), 0));
  }

  // Top items aggregation
  const itemMap: Record<string, { count: number; revenue: number }> = {};
  items.forEach((item: any) => {
    if (!itemMap[item.item_name]) {
      itemMap[item.item_name] = { count: 0, revenue: 0 };
    }
    itemMap[item.item_name].count += item.quantity;
    itemMap[item.item_name].revenue += item.unit_price * item.quantity;
  });

  const topItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCalls,
    callsTrend: calcTrend(totalCalls, prevTotal),
    ordersPlaced,
    ordersTrend: calcTrend(ordersPlaced, prevOrders),
    revenue,
    revenueTrend: calcTrend(revenue, prevRevenue),
    upsellRevenue,
    upsellTrend: calcTrend(upsellRevenue, prevUpsell),
    answerRate,
    avgCallDuration: avgDuration,
    avgOrderValue,
    conversionRate,
    topItems,
    dailyCalls,
    dailyRevenue,
  };
}

// ──────── Admin: all restaurants with stats ────────
export async function getAllRestaurantsWithStats(supabase: SupabaseClient) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !restaurants) return [];

  const results: RestaurantWithStats[] = [];

  for (const r of restaurants) {
    const { data: todayCalls } = await supabase
      .from('calls')
      .select('order_total, start_time')
      .eq('restaurant_id', r.id)
      .gte('created_at', today.toISOString());

    const calls = todayCalls || [];
    const callsToday = calls.length;
    const revenueToday = calls.reduce((sum: number, c: any) => sum + (c.order_total || 0), 0);
    const lastCallTime = calls.length > 0 ? calls[0].start_time : null;

    // Health status based on last call activity
    let healthStatus: 'green' | 'yellow' | 'red' = 'green';
    if (!r.retell_agent_id || !r.plan_tier) {
      healthStatus = 'red';
    } else if (callsToday === 0) {
      healthStatus = 'yellow';
    }

    results.push({
      ...r,
      calls_today: callsToday,
      revenue_today: revenueToday,
      last_call_time: lastCallTime,
      health_status: healthStatus,
    });
  }

  return results;
}
