import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { monthlyRoiEmail } from '@/lib/email-templates';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// ──────────────────────────────────────────────────────────────────────────────
// /api/emails/monthly-roi  (GET, cron)
// ──────────────────────────────────────────────────────────────────────────────
// Sends every active restaurant a ROI recap for the PREVIOUS calendar month.
// Run via Vercel Cron at 09:00 UTC on the 1st of each month.
//
// Auth: requires Authorization: Bearer $CRON_SECRET. Vercel Cron injects this
// automatically when you set `schedule` in vercel.json.
//
// What we send:
//   - Calls handled last month
//   - Revenue captured (order_total + upsell_total)
//   - Wasted-food avoided (estimated — see AVOIDED_NOSHOW_RATE below)
//   - ROI multiple vs subscription cost
//
// The "wasted food avoided" estimate is OMRI's differentiator. Industry
// no-show rate on phone orders is ~8–12%; at an avg ticket around $30 with
// food cost ~30%, every 100 orders the kitchen would've fired and tossed
// ≈ 10 * $30 * 0.30 = $90 in ingredients. We use orderRevenue × 0.05 as
// a conservative floor so the number is defensible when an owner asks.

const AVOIDED_NOSHOW_RATE = 0.05; // 5% of order revenue, defensible floor

const PLAN_PRICE: Record<string, number> = {
  starter: 799,
  growth: 1499,
  pro: 2299,
};

function monthBoundsUTC(now = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  // First of last month, 00:00 UTC → first of this month, 00:00 UTC
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const label = start.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return { start, end, label };
}

export async function GET(request: NextRequest) {
  const t0 = new Date().toISOString();
  // Rate limit at CRON tier.
  const blocked = await checkRateLimit(request, 'CRON');
  if (blocked) return blocked;

  try {
    // Cron auth
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Only email restaurants that actually had a live subscription last month.
    // We treat active + trialing as eligible — trialing owners especially need
    // the "look how much we already made you" nudge before the card charges.
    const { data: restaurants, error: rErr } = await supabase
      .from('restaurants')
      .select('id, name, owner_user_id, plan_tier, subscription_status')
      .in('subscription_status', ['active', 'trialing', 'past_due']);

    if (rErr) {
      console.error(`[${t0}] [monthly-roi] fetch restaurants failed:`, rErr);
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    }

    const { start, end, label } = monthBoundsUTC();
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const results: Array<{
      restaurantId: string;
      restaurantName: string;
      ownerEmail?: string;
      sent: boolean;
      totalValue?: number;
      error?: string;
    }> = [];

    for (const r of restaurants || []) {
      try {
        // Owner email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', r.owner_user_id)
          .single();

        if (!profile?.email) {
          results.push({
            restaurantId: r.id,
            restaurantName: r.name,
            sent: false,
            error: 'no owner email',
          });
          continue;
        }

        // Last-month calls
        const { data: calls } = await supabase
          .from('calls')
          .select('id, call_outcome, order_total, upsell_total')
          .eq('restaurant_id', r.id)
          .gte('start_time', startStr)
          .lt('start_time', endStr);

        const totalCalls = calls?.length || 0;
        const ordersPlaced =
          calls?.filter((c) => c.call_outcome === 'order_placed').length || 0;
        const orderRevenue =
          calls?.reduce((s, c) => s + (Number(c.order_total) || 0), 0) || 0;
        const upsellRevenue =
          calls?.reduce((s, c) => s + (Number(c.upsell_total) || 0), 0) || 0;
        const avoidedNoShowRevenue = Math.round(orderRevenue * AVOIDED_NOSHOW_RATE);

        // Skip restaurants with zero activity — an ROI email with $0 numbers
        // is worse than no email at all.
        if (totalCalls === 0 && orderRevenue === 0) {
          results.push({
            restaurantId: r.id,
            restaurantName: r.name,
            ownerEmail: profile.email,
            sent: false,
            error: 'no activity last month',
          });
          continue;
        }

        const monthlyCost = PLAN_PRICE[r.plan_tier as string] || 799;
        const html = monthlyRoiEmail({
          restaurantName: r.name,
          monthLabel: label,
          totalCalls,
          ordersPlaced,
          orderRevenue,
          upsellRevenue,
          avoidedNoShowRevenue,
          monthlyCost,
        });

        const res = await sendEmail({
          to: profile.email,
          subject: `${r.name} — Your ${label} ROI with OMRI`,
          html,
        });

        results.push({
          restaurantId: r.id,
          restaurantName: r.name,
          ownerEmail: profile.email,
          sent: res.success,
          totalValue: orderRevenue + upsellRevenue + avoidedNoShowRevenue,
          error: res.success ? undefined : JSON.stringify(res.error),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[${t0}] [monthly-roi] restaurant ${r.id} failed:`, msg);
        results.push({
          restaurantId: r.id,
          restaurantName: r.name,
          sent: false,
          error: msg,
        });
      }
    }

    const sentCount = results.filter((x) => x.sent).length;
    console.log(
      `[${t0}] [monthly-roi] ${label}: sent ${sentCount}/${results.length}`
    );

    return NextResponse.json({
      month: label,
      sent: sentCount,
      total: results.length,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[${t0}] [monthly-roi] fatal:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
