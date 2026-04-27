import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  parseCallDuration,
  classifyCallOutcome,
  isErrorDisconnection,
  type RetellCallEvent,
} from '@/lib/retell';
import { sendEmail } from '@/lib/email';
import { failedCallAlertEmail } from '@/lib/email-templates';
import { alertDemoLead } from '@/lib/demo-alerts';
import { sendFounderAlert } from '@/lib/alerts';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

export async function POST(request: NextRequest) {
  // Rate limit at WEBHOOK tier (200/min). Retell retries on non-2xx so a 429
  // is recoverable for them; defends against a hostile actor spamming the
  // webhook URL. Body is signature-verified separately by Retell SDK semantics.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;

  try {
    const body = await request.text();

    // Parse the webhook payload
    let event: RetellCallEvent;
    try {
      event = JSON.parse(body);
    } catch {
      console.log(`[${new Date().toISOString()}] Retell webhook: invalid JSON, likely a test ping`);
      return NextResponse.json({ received: true });
    }

    // Handle test/ping webhooks from Retell that may not have full call data
    if (!event?.call?.agent_id) {
      console.log(`[${new Date().toISOString()}] Retell webhook test/ping received`);
      return NextResponse.json({ received: true, test: true });
    }

    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent ID (try English agent first, then Spanish).
    // `name` is pulled so downstream alert/email paths can reference it without a second query.
    let restaurant: { id: string; name: string; owner_user_id?: string } | null = null;
    const { data: enRestaurant } = await supabase
      .from('restaurants')
      .select('id, name, owner_user_id')
      .eq('retell_agent_id', event.call.agent_id)
      .single();

    if (enRestaurant) {
      restaurant = enRestaurant;
    } else {
      const { data: esRestaurant } = await supabase
        .from('restaurants')
        .select('id, name, owner_user_id')
        .eq('retell_agent_id_es', event.call.agent_id)
        .single();
      restaurant = esRestaurant;
    }

    if (!restaurant) {
      // Could still be a website demo call on an unbound demo agent — fire the
      // lead alert, then exit cleanly without touching the `calls` table.
      if (event.event === 'call_ended') {
        const duration = parseCallDuration(
          event.call.start_timestamp,
          event.call.end_timestamp
        );
        try {
          await alertDemoLead({
            supabase,
            retellCallId: event.call.call_id,
            durationSec: duration,
            transcript: event.call.transcript || null,
            transcriptUrl: event.call.recording_url || null,
          });
        } catch (demoErr) {
          console.error(`[${new Date().toISOString()}] demo-alerts (no-restaurant path) failed:`, demoErr);
        }
      }
      console.log(`No restaurant bound to agent ${event.call.agent_id} — treating as demo/unbound`);
      return NextResponse.json({ received: true, unbound: true });
    }

    switch (event.event) {
      case 'call_started': {
        await supabase.from('calls').insert({
          restaurant_id: restaurant.id,
          retell_call_id: event.call.call_id,
          start_time: new Date(event.call.start_timestamp).toISOString(),
          call_outcome: 'missed', // Default until call ends
          order_total: 0,
          upsell_total: 0,
        });
        break;
      }

      case 'call_ended': {
        const duration = parseCallDuration(
          event.call.start_timestamp,
          event.call.end_timestamp
        );
        const outcome = classifyCallOutcome(
          event.call.transcript,
          event.call.call_analysis?.custom_analysis_data as Record<string, unknown> | undefined
        );

        await supabase
          .from('calls')
          .update({
            end_time: event.call.end_timestamp
              ? new Date(event.call.end_timestamp).toISOString()
              : null,
            duration_seconds: duration,
            transcript: event.call.transcript || null,
            recording_url: event.call.recording_url || null,
            call_outcome: outcome,
          })
          .eq('retell_call_id', event.call.call_id);

        // If this call came from the website Live Demo, page the sales team.
        // alertDemoLead() is a no-op if no demo_leads row matches this call_id.
        try {
          await alertDemoLead({
            supabase,
            retellCallId: event.call.call_id,
            durationSec: duration,
            transcript: event.call.transcript || null,
            transcriptUrl: event.call.recording_url || null,
          });
        } catch (demoErr) {
          console.error(`[${new Date().toISOString()}] demo-alerts failed:`, demoErr);
        }

        // If call was missed, send alert email to restaurant owner
        if (outcome === 'missed') {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', restaurant.owner_user_id)
              .single();

            if (profile?.email) {
              const html = failedCallAlertEmail({
                restaurantName: restaurant.name,
                callTime: event.call.start_timestamp,
                duration: duration,
                transcript: event.call.transcript || undefined,
              });

              await sendEmail({
                to: profile.email,
                subject: `Missed call to ${restaurant.name}`,
                html,
              });
            }
          } catch (emailError) {
            console.error(`[${new Date().toISOString()}] Failed to send missed call alert:`, emailError);
            // Don't fail the webhook if email fails
          }
        }

        // Build 2: founder alerts on hard-failure signals.
        // Non-blocking — sendFounderAlert never throws (internal catch).
        try {
          const disconnectionReason = event.call.disconnection_reason ?? null;
          const callStatus = event.call.call_status ?? '';
          const isHardError = callStatus === 'error' || isErrorDisconnection(disconnectionReason);

          if (isHardError) {
            await sendFounderAlert({
              restaurantId: restaurant.id,
              failureType: 'retell_call_error',
              shortReason: disconnectionReason || `call_status=${callStatus}`,
              retellCallId: event.call.call_id,
              metadata: {
                call_status: callStatus,
                disconnection_reason: disconnectionReason,
                duration_seconds: duration,
              },
            });
          } else if (duration > 0 && duration < 5) {
            // Short call with no order created = likely pre-greeting crash or caller hit hangup
            // after IVR noise. Confirm there's no order before alerting.
            const { data: callRow } = await supabase
              .from('calls')
              .select('id')
              .eq('retell_call_id', event.call.call_id)
              .maybeSingle();

            let hasOrder = false;
            if (callRow?.id) {
              const { count } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('call_id', callRow.id)
                .neq('status', 'building');
              hasOrder = (count ?? 0) > 0;
            }

            if (!hasOrder) {
              await sendFounderAlert({
                restaurantId: restaurant.id,
                failureType: 'premature_hangup',
                shortReason: `call_duration=${duration}s, no order created`,
                retellCallId: event.call.call_id,
                metadata: { duration_seconds: duration },
              });
            }
          }
        } catch (alertErr) {
          // Double-safety — sendFounderAlert already has its own try/catch but we don't want
          // any alert path to fail a webhook response.
          console.error(`[${new Date().toISOString()}] founder-alert dispatch failed:`, alertErr);
        }
        break;
      }

      case 'call_analyzed': {
        // With Option B, orders are created during the call by the /api/tools/* routes.
        // This handler now only syncs call-level analytics (totals, outcome, transcript)
        // and backfills order_items for the analytics dashboard.

        const analysisData = event.call.call_analysis?.custom_analysis_data;

        // Get the call record
        const { data: call } = await supabase
          .from('calls')
          .select('id')
          .eq('retell_call_id', event.call.call_id)
          .single();

        // Check if a tool-created order already exists for this call
        let orderFromTools = null;
        if (call) {
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('subtotal, total, items')
            .eq('call_id', call.id)
            .neq('status', 'building') // only confirmed/paid orders
            .single();
          orderFromTools = existingOrder;
        }

        // Determine totals — prefer the tool-created order data over analysis
        const orderTotal = orderFromTools
          ? orderFromTools.subtotal
          : Number(analysisData?.order_total) || 0;
        // Calculate upsell_total from actual order items (preferred) or fall back to analysis data
        let upsellTotal = 0;
        if (orderFromTools?.items && Array.isArray(orderFromTools.items)) {
          upsellTotal = (orderFromTools.items as Array<Record<string, unknown>>)
            .filter((item) => item.is_upsell === true)
            .reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
          upsellTotal = parseFloat(upsellTotal.toFixed(2));
        }
        if (upsellTotal === 0) {
          upsellTotal = Number(analysisData?.upsell_total) || 0;
        }

        const outcome = orderFromTools
          ? 'order_placed' as const
          : classifyCallOutcome(
              event.call.transcript,
              analysisData as Record<string, unknown> | undefined
            );

        await supabase
          .from('calls')
          .update({
            order_total: orderTotal,
            upsell_total: upsellTotal,
            call_outcome: outcome,
            transcript: event.call.transcript || undefined,
            recording_url: event.call.recording_url || null,
          })
          .eq('retell_call_id', event.call.call_id);

        // Backfill order_items for analytics if they came from analysis data
        // (tool routes store items in the orders.items JSONB; this populates the
        //  separate order_items table used by the analytics dashboard)
        if (call && orderFromTools?.items && Array.isArray(orderFromTools.items)) {
          const existingItems = await supabase
            .from('order_items')
            .select('id')
            .eq('call_id', call.id)
            .limit(1);

          // Only insert if no order_items exist yet for this call
          if (!existingItems.data?.length) {
            const items = (orderFromTools.items as Array<Record<string, unknown>>).map((item) => ({
              call_id: call.id,
              restaurant_id: restaurant.id,
              item_name: String(item.name || ''),
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.price) || 0,
              is_upsell: Boolean(item.is_upsell),
            }));

            if (items.length > 0) {
              await supabase.from('order_items').insert(items);
            }
          }
        }

        console.log(`[${new Date().toISOString()}] call_analyzed processed: call=${event.call.call_id}, outcome=${outcome}, total=${orderTotal}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Retell webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
