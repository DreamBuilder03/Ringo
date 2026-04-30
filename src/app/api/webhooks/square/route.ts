import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { orderPaidEmail } from '@/lib/email-templates';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

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
  // Rate limit at WEBHOOK tier (200/min). Square retries on non-2xx so 429
  // is recoverable for them; defends against URL spam.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;

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

      const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com'}/api/webhooks/square`;
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

    // Send order paid email to restaurant owner (non-blocking)
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, owner_user_id')
        .eq('id', order.restaurant_id)
        .single();

      if (restaurant) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', restaurant.owner_user_id)
          .single();

        if (profile?.email) {
          const html = orderPaidEmail({
            restaurantName: restaurant.name,
            orderId: order.id,
            items: order.items || [],
            total: order.total,
            customerPhone: order.customer_phone || 'Unknown',
          });

          await sendEmail({
            to: profile.email,
            subject: `New paid order from ${order.customer_phone || 'customer'}`,
            html,
          });
        }
      }
    } catch (emailError) {
      console.error(`[Square Webhook] Failed to send order paid email for order ${order.id}:`, emailError);
      // Don't fail the webhook if email fails
    }

    // Branch on pos_mode (Build 1 — Handoff Mode for proprietary-POS franchises).
    //   - direct_api      → push order ticket to the connected POS (existing behavior)
    //   - handoff_tablet  → write to handoff_orders for the /handoff tablet view to
    //                       pick up via Supabase Realtime; staff transcribes manually.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com';
    const { data: posLookup } = await supabase
      .from('restaurants')
      .select('pos_type, pos_mode')
      .eq('id', order.restaurant_id)
      .single();
    const posType = (posLookup as { pos_type?: string } | null)?.pos_type || 'square';
    const posMode = (posLookup as { pos_mode?: string } | null)?.pos_mode || 'direct_api';

    if (posMode === 'handoff_tablet') {
      // Insert into handoff_orders. Tablet UI receives via Supabase Realtime.
      // No POS push — the kitchen is on a proprietary POS we can't drive directly.
      const { error: handoffError } = await supabase.from('handoff_orders').insert({
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        customer_name: order.customer_name || null,
        customer_phone: order.customer_phone || null,
        items: order.items || [],
        total_cents: Math.round((order.total || 0) * 100),
        eta_minutes: order.eta_minutes ?? null,
        notes: order.notes || null,
      });

      if (handoffError) {
        // Log + leave order paid; staff will see the issue in /admin/health.
        // Don't fail the webhook — Square retries on non-2xx + we'd double-charge.
        console.error(`[Square Webhook] Handoff insert failed for order ${order.id}:`, handoffError);
      } else {
        // Mark order as queued-for-handoff so reports distinguish it from direct-api.
        await supabase
          .from('orders')
          .update({
            pos_pushed_at: new Date().toISOString(),
            status: 'awaiting_handoff',
          })
          .eq('id', order.id);
        console.log(`[Square Webhook] Order ${order.id} queued for handoff tablet (${posType} POS not driven directly)`);
      }
    } else {
      // direct_api: push order ticket to the merchant's connected POS.
      const posPath = ['square', 'clover', 'toast', 'spoton'].includes(posType)
        ? `/api/pos/${posType}`
        : '/api/pos/square';

      // Each POS route accepts slightly different payload shapes. We pass the
      // superset — unused fields are ignored.
      fetch(`${baseUrl}${posPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Square expects orderId/restaurantId (camelCase); Clover expects order_id/restaurant_id (snake_case).
          orderId: order.id,
          order_id: order.id,
          restaurantId: order.restaurant_id,
          restaurant_id: order.restaurant_id,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
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
          console.log(`[Square Webhook] Order ${order.id} pushed to ${posType} POS, status → preparing`);
        } else {
          console.error(`[Square Webhook] POS push failed for order ${order.id} (${posType}): ${res.status}`);
        }
      }).catch((err) => {
        console.error(`[Square Webhook] POS push error for order ${order.id} (${posType}):`, err);
      });
    }

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
