import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Square webhook handler for payment completion events.
 *
 * When a customer pays via a Square Online Checkout payment link (created by
 * the finalize-payment tool), Square fires payment.completed. We match this
 * back to our order using:
 *   1. payment_intent_id = payment_link.id (stored by finalize-payment)
 *   2. payment note containing "ringo_order:{orderId}"
 *
 * Once matched, we mark the order as 'paid' and push it to Square POS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-square-hmacsha256-signature');

    // Verify webhook signature (skip in dev if key not set)
    const webhookKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (webhookKey) {
      if (!signature) {
        console.warn('[Square Webhook] Missing signature header');
        return NextResponse.json({ ok: true });
      }

      const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai'}/api/webhooks/square`;
      const computedSignature = crypto
        .createHmac('sha256', webhookKey)
        .update(notificationUrl + body)
        .digest('base64');

      if (computedSignature !== signature) {
        console.warn('[Square Webhook] Invalid signature');
        return NextResponse.json({ ok: true });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.type;

    // Only process payment completion events
    if (eventType !== 'payment.completed' && eventType !== 'payment.updated') {
      console.log(`[Square Webhook] Ignoring event: ${eventType}`);
      return NextResponse.json({ ok: true });
    }

    const payment = event.data?.object?.payment;
    if (!payment?.id) {
      console.warn('[Square Webhook] Missing payment data');
      return NextResponse.json({ ok: true });
    }

    // Only process completed payments
    if (payment.status !== 'COMPLETED') {
      console.log(`[Square Webhook] Skipping payment with status: ${payment.status}`);
      return NextResponse.json({ ok: true });
    }

    console.log(`[Square Webhook] Processing ${eventType} for payment ${payment.id}`);

    const supabase = await createServiceRoleClient();

    // Strategy 1: Match by payment_intent_id (payment link ID)
    // The finalize-payment tool stores the Square payment link ID here.
    // When quick_pay creates a checkout, the resulting payment may reference
    // the same order. Try direct lookup first.
    let order = null;

    // Strategy 2: Match by payment note (contains ringo_order:{orderId})
    const note = payment.note || '';
    const noteMatch = note.match(/ringo_order:([a-f0-9-]+)/i);
    if (noteMatch) {
      const ringoOrderId = noteMatch[1];
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', ringoOrderId)
        .in('status', ['payment_sent', 'pending'])
        .single();
      order = data;
    }

    // Strategy 3: If note didn't work, try matching by payment_intent_id
    if (!order) {
      // Square payment link checkout creates a payment — try to match
      // by looking up orders in payment_sent status from the same timeframe
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'payment_sent')
        .order('payment_link_sent_at', { ascending: false })
        .limit(1);

      // Only match if the amounts line up
      if (data?.[0] && payment.amount_money?.amount) {
        const paymentCents = payment.amount_money.amount;
        const orderCents = Math.round(data[0].total * 100);
        if (paymentCents === orderCents) {
          order = data[0];
        }
      }
    }

    if (!order) {
      console.warn(`[Square Webhook] No matching order for payment ${payment.id}`);
      return NextResponse.json({ ok: true });
    }

    // Update order to paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error(`[Square Webhook] Failed to update order ${order.id}:`, updateError);
      return NextResponse.json({ ok: true });
    }

    console.log(`[Square Webhook] Order ${order.id} marked as paid`);

    // Push to Square POS (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai';
    fetch(`${baseUrl}/api/pos/square`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        restaurantId: order.restaurant_id,
      }),
    }).then(async (res) => {
      if (res.ok) {
        await supabase
          .from('orders')
          .update({
            pos_pushed_at: new Date().toISOString(),
            status: 'preparing',
          })
          .eq('id', order.id);
        console.log(`[Square Webhook] Order ${order.id} pushed to POS, status → preparing`);
      } else {
        console.error(`[Square Webhook] POS push failed for order ${order.id}: ${res.status}`);
      }
    }).catch((err) => {
      console.error(`[Square Webhook] POS push error for order ${order.id}:`, err);
    });

    // Update call record
    if (order.call_id) {
      await supabase
        .from('calls')
        .update({
          order_total: order.subtotal,
          call_outcome: 'order_placed',
        })
        .eq('id', order.call_id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Square Webhook] Error:', error);
    return NextResponse.json({ ok: true });
  }
}
