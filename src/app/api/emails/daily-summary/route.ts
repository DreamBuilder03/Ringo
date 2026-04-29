import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { dailySummaryEmail } from '@/lib/email-templates';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

export async function GET(request: NextRequest) {
  // Rate limit at CRON tier. Vercel Cron is once-per-schedule; this defends
  // against URL spam.
  const blocked = await checkRateLimit(request, 'CRON');
  if (blocked) return blocked;

  try {
    // Verify cron job auth (simple key-based, should be Vercel Cron authenticated)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Get all restaurants
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, owner_user_id');

    if (restaurantError || !restaurants) {
      console.error('Failed to fetch restaurants:', restaurantError);
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      );
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStr = yesterday.toISOString();

    const tomorrow = new Date(yesterday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString();

    const results: Array<{
      restaurantName: string;
      ownerEmail: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const restaurant of restaurants) {
      try {
        // Get owner email from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', restaurant.owner_user_id)
          .single();

        if (!profile?.email) {
          console.warn(`No email found for restaurant ${restaurant.id}`);
          continue;
        }

        // Get yesterday's calls
        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select('id, duration_seconds, call_outcome, order_total, upsell_total')
          .eq('restaurant_id', restaurant.id)
          .gte('start_time', yesterdayStr)
          .lt('start_time', tomorrowStr);

        if (callsError) {
          throw new Error(`Failed to fetch calls: ${callsError.message}`);
        }

        // Calculate stats
        const totalCalls = calls?.length || 0;
        const ordersPlaced = calls?.filter((c) => c.call_outcome === 'order_placed').length || 0;
        const revenue = calls?.reduce((sum, c) => sum + (c.order_total || 0), 0) || 0;
        const upsellRevenue = calls?.reduce((sum, c) => sum + (c.upsell_total || 0), 0) || 0;
        const answerRate = totalCalls > 0 ? Math.round((ordersPlaced / totalCalls) * 100) : 0;

        // Get top items from orders
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('items')
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', yesterdayStr)
          .lt('created_at', tomorrowStr)
          .neq('status', 'building');

        const itemCounts: Record<string, number> = {};
        if (orders) {
          for (const order of orders) {
            if (order.items && Array.isArray(order.items)) {
              for (const item of order.items as Array<Record<string, unknown>>) {
                const itemName = String(item.name || 'Unknown');
                const quantity = Number(item.quantity) || 1;
                itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
              }
            }
          }
        }

        const topItems = Object.entries(itemCounts)
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        // Send email
        const html = dailySummaryEmail({
          restaurantName: restaurant.name,
          date: yesterdayStr,
          totalCalls,
          ordersPlaced,
          revenue,
          upsellRevenue,
          answerRate,
          topItems,
        });

        const emailResult = await sendEmail({
          to: profile.email,
          subject: `${restaurant.name} - Daily Summary for ${new Date(yesterdayStr).toLocaleDateString()}`,
          html,
        });

        results.push({
          restaurantName: restaurant.name,
          ownerEmail: profile.email,
          success: emailResult.success,
          error: emailResult.error ? JSON.stringify(emailResult.error) : undefined,
        });
      } catch (error) {
        console.error(`Error processing restaurant ${restaurant.id}:`, error);
        results.push({
          restaurantName: restaurant.name,
          ownerEmail: 'unknown',
          success: false,
          error: String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[${new Date().toISOString()}] Daily summary emails sent: ${successCount}/${results.length}`
    );

    return NextResponse.json({
      sent: successCount,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('Daily summary cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
