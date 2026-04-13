import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  parseCallDuration,
  classifyCallOutcome,
  type RetellCallEvent,
} from '@/lib/retell';
import { sendEmail } from '@/lib/email';
import { failedCallAlertEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
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

    // Look up restaurant by agent ID (try English agent first, then Spanish)
    let restaurant = null;
    const { data: enRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('retell_agent_id', event.call.agent_id)
      .single();

    if (enRestaurant) {
      restaurant = enRestaurant;
    } else {
      const { data: esRestaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('retell_agent_id_es', event.call.agent_id)
        .single();
      restaurant = esRestaurant;
    }

    if (!restaurant) {
      console.error(`No restaurant found for agent: ${event.call.agent_id}`);
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
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
