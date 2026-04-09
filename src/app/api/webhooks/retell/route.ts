import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  verifyRetellWebhook,
  parseCallDuration,
  classifyCallOutcome,
  type RetellCallEvent,
} from '@/lib/retell';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-retell-signature') || '';
    const secret = process.env.RETELL_WEBHOOK_SECRET!;

    // Verify webhook signature
    if (secret && secret !== 'placeholder') {
      const isValid = verifyRetellWebhook(body, signature, secret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event: RetellCallEvent = JSON.parse(body);
    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent ID
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('retell_agent_id', event.call.agent_id)
      .single();

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
            call_outcome: outcome,
          })
          .eq('retell_call_id', event.call.call_id);
        break;
      }

      case 'call_analyzed': {
        const analysisData = event.call.call_analysis?.custom_analysis_data;
        if (analysisData) {
          const orderTotal = Number(analysisData.order_total) || 0;
          const upsellTotal = Number(analysisData.upsell_total) || 0;
          const outcome = classifyCallOutcome(
            event.call.transcript,
            analysisData as Record<string, unknown>
          );

          await supabase
            .from('calls')
            .update({
              order_total: orderTotal,
              upsell_total: upsellTotal,
              call_outcome: outcome,
              transcript: event.call.transcript || undefined,
            })
            .eq('retell_call_id', event.call.call_id);

          // Insert order items if provided
          const orderItems = analysisData.order_items;
          if (Array.isArray(orderItems) && orderItems.length > 0) {
            const { data: call } = await supabase
              .from('calls')
              .select('id')
              .eq('retell_call_id', event.call.call_id)
              .single();

            if (call) {
              const items = orderItems.map((item: Record<string, unknown>) => ({
                call_id: call.id,
                restaurant_id: restaurant.id,
                item_name: String(item.name || ''),
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.price) || 0,
                is_upsell: Boolean(item.is_upsell),
              }));

              await supabase.from('order_items').insert(items);
            }
          }
        }
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
