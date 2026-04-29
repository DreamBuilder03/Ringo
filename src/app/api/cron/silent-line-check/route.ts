import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFounderAlert } from '@/lib/alerts';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

/**
 * Silent-line check — Build 2, Task #67.
 *
 * Runs every 30 minutes (see vercel.json). For each restaurant with
 * alerts_enabled=true, checks whether any inbound call has landed in the
 * last 24h. If zero calls AND we are currently inside the default business
 * window (10am-10pm America/Los_Angeles), fires a `silent_line` founder
 * alert via sendFounderAlert.
 *
 * Why a business-hour gate:
 *   Silent overnight is normal. We only alert when the absence of calls
 *   actually means something is broken (phone forwarding dropped, SIP
 *   trunk down, Retell agent detached).
 *
 * Why an explicit 24h dedupe here (in addition to alerts.ts' 5-min dedupe):
 *   We should only page Misael ONCE per outage per restaurant, not every
 *   30 minutes while the line stays silent. The alerts.ts dedupe window
 *   is 5 min; we extend to 24h by consulting alerts_log for a recent
 *   silent_line entry and short-circuiting if one exists.
 *
 * Future dependency: when `restaurants.business_hours` ships (Brain's spec),
 * replace the 10am-10pm constant with a per-restaurant lookup. Noted in
 * Task #67 follow-up.
 */

const BUSINESS_WINDOW_START_HOUR = 10; // 10am local (inclusive)
const BUSINESS_WINDOW_END_HOUR = 22; // 10pm local (exclusive)
const LOOKBACK_HOURS = 24;
const DEDUPE_WINDOW_HOURS = 24;

function getCurrentHourInTimezone(tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Some Intl impls emit "24" for midnight under hour12:false; normalize.
  return parseInt(hourPart, 10) % 24;
}

export async function GET(request: NextRequest) {
  // Rate limit at CRON tier (10/min). Vercel Cron only invokes once per
  // schedule so this defends against URL spam, not legitimate cron.
  const blocked = await checkRateLimit(request, 'CRON');
  if (blocked) return blocked;

  try {
    // Auth — Vercel Cron sends CRON_SECRET as Bearer. Matches /api/emails/daily-summary.
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Business-window gate.
    const hour = getCurrentHourInTimezone('America/Los_Angeles');
    if (hour < BUSINESS_WINDOW_START_HOUR || hour >= BUSINESS_WINDOW_END_HOUR) {
      return NextResponse.json({
        skipped: 'outside business hours',
        hour_local: hour,
        window: `${BUSINESS_WINDOW_START_HOUR}:00-${BUSINESS_WINDOW_END_HOUR}:00 PT`,
      });
    }

    const supabase = await createServiceRoleClient();

    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, alerts_enabled')
      .eq('alerts_enabled', true);

    if (restaurantError || !restaurants) {
      console.error(
        `[${new Date().toISOString()}] silent-line-check: restaurants fetch failed:`,
        restaurantError
      );
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      );
    }

    const lookbackCutoff = new Date(
      Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000
    ).toISOString();
    const dedupeCutoff = new Date(
      Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const results: Array<{
      restaurant: string;
      status: 'has_calls' | 'already_alerted' | 'alerted' | 'error';
      detail?: string;
    }> = [];

    for (const r of restaurants) {
      try {
        // Did any call come in during the lookback window?
        const { count: callCount, error: callError } = await supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', r.id)
          .gte('start_time', lookbackCutoff);

        if (callError) {
          throw new Error(`calls count failed: ${callError.message}`);
        }

        if ((callCount ?? 0) > 0) {
          results.push({
            restaurant: r.name,
            status: 'has_calls',
            detail: `${callCount} in last ${LOOKBACK_HOURS}h`,
          });
          continue;
        }

        // Extended 24h dedupe — don't re-page if we already flagged this
        // restaurant as silent in the last day.
        const { data: recentSilent, error: logError } = await supabase
          .from('alerts_log')
          .select('id')
          .eq('restaurant_id', r.id)
          .eq('failure_type', 'silent_line')
          .gte('created_at', dedupeCutoff)
          .limit(1);

        if (logError) {
          // On dedupe-query failure, err toward silence (avoids SMS storms).
          console.error(
            `[${new Date().toISOString()}] silent-line-check dedupe query failed for ${r.id}:`,
            logError
          );
          results.push({
            restaurant: r.name,
            status: 'error',
            detail: `dedupe query failed: ${logError.message}`,
          });
          continue;
        }

        if (recentSilent && recentSilent.length > 0) {
          results.push({
            restaurant: r.name,
            status: 'already_alerted',
            detail: 'within 24h dedupe window',
          });
          continue;
        }

        await sendFounderAlert({
          failureType: 'silent_line',
          restaurantId: r.id,
          shortReason: `no inbound calls in last ${LOOKBACK_HOURS}h during business hours`,
          metadata: {
            lookback_hours: LOOKBACK_HOURS,
            check_time: new Date().toISOString(),
            local_hour_pt: hour,
          },
        });

        results.push({ restaurant: r.name, status: 'alerted' });
      } catch (err) {
        console.error(
          `[${new Date().toISOString()}] silent-line-check error for ${r.id}:`,
          err
        );
        results.push({
          restaurant: r.name,
          status: 'error',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const alertedCount = results.filter((r) => r.status === 'alerted').length;
    console.log(
      `[${new Date().toISOString()}] silent-line-check: checked=${restaurants.length} alerted=${alertedCount}`
    );

    return NextResponse.json({
      checked: restaurants.length,
      alerted: alertedCount,
      hour_local: hour,
      results,
    });
  } catch (error) {
    console.error('silent-line-check cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
