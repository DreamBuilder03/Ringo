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
    const secret = process.env.RETELL_WEBHOOK_SECRET || '';

    // Verify webhook signature (skip if no secret configured)
    if (secret && secret !== 'placeholder' && signature) {
      const isValid = verifyRetellWebhook(body, signature, secret);
      if (!isValid) {
        console.warn(`[${new Date().toISOString()}] Retell webhook signature mismatch`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event: RetellCallEvent = JSON.parse(body);

    // Handle test/ping webhooks from Retell that may not have full call data
    if (!event?.call?.agent_id) {
      console.log(`[${new Date().toISOString()}] Retell webhook test/ping received`);
      return NextResponse.json({ received: true, test: true });
    }

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

          // Get the call record for linking
          const { data: call } = await supabase
            .from('calls')
            .select('id')
            .eq('retell_call_id', event.call.call_id)
            .single();

          // Insert order items if provided
          const orderItems = analysisData.order_items;
          if (Array.isArray(orderItems) && orderItems.length > 0 && call) {
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

          // ── Pay-before-prep: Create order + send SMS payment link ──
          const customerPhone = String(analysisData.customer_phone || event.call.from_number || '');
          if (outcome === 'order_placed' && orderTotal > 0 && customerPhone) {
            // Build order items for the orders table
            const orderItemsData = Array.isArray(orderItems)
              ? orderItems.map((item: Record<string, unknown>) => ({
                  name: String(item.name || ''),
                  quantity: Number(item.quantity) || 1,
                  price: Number(item.price) || 0,
                  is_upsell: Boolean(item.is_upsell),
                }))
              : [];

            const tax = Number(analysisData.tax) || Math.round(orderTotal * 0.08 * 100) / 100;
            const total = orderTotal + tax;

            // Create pending order
            const { data: newOrder, error: orderError } = await supabase
              .from('orders')
              .insert({
                restaurant_id: restaurant.id,
                call_id: call?.id || null,
                customer_phone: customerPhone,
                items: orderItemsData,
                subtotal: orderTotal,
                tax,
                total,
                status: 'pending',
              })
              .select()
              .single();

            if (!orderError && newOrder) {
              console.log(`[${new Date().toISOString()}] Order created from call: ${newOrder.id}`);

              // Get restaurant name for the SMS
              const { data: restaurantData } = await supabase
                .from('restaurants')
                .select('name')
                .eq('id', restaurant.id)
                .single();

              const restaurantName = restaurantData?.name || 'the restaurant';
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai';
              const paymentLink = `${baseUrl}/pay/${newOrder.id}`;

              // Send SMS with payment link
              const smsMessage = `Hi! Your order from ${restaurantName} is ready to pay. Total: $${total.toFixed(2)}. Pay here to start preparation: ${paymentLink}`;

              try {
                const smsBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai';
                await fetch(`${smsBaseUrl}/api/sms`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: customerPhone,
                    message: smsMessage,
                    type: 'payment_link',
                  }),
                });

                // Mark that the payment link was sent
                await supabase
                  .from('orders')
                  .update({
                    status: 'payment_sent',
                    payment_link_sent_at: new Date().toISOString(),
                  })
                  .eq('id', newOrder.id);

                console.log(`[${new Date().toISOString()}] Payment SMS sent to ${customerPhone} for order ${newOrder.id}`);
              } catch (smsErr) {
                console.error(`[${new Date().toISOString()}] SMS send failed:`, smsErr);
                // Order is still created, SMS just didn't go through
              }
            } else {
              console.error(`[${new Date().toISOString()}] Order creation failed:`, orderError);
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
