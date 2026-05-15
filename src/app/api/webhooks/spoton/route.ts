// ──────────────────────────────────────────────────────────────────────────────
// /api/webhooks/spoton — SpotOn webhook receiver.
//
// Pattern-matches /api/webhooks/clover (commit 4bad7f6) and
// /api/webhooks/toast (commit 1c525a3). Receives SpotOn payment-cleared
// events and triggers /api/pos/spoton order push so the kitchen ticket fires.
//
// Flow:
//   1. Verify HMAC-SHA256 signature against SPOTON_WEBHOOK_SECRET.
//      Soft-fails when secret unset (dev / pre-deploy); strict once set.
//   2. Parse the event payload, extract SpotOn's order identifier.
//   3. Match the OMRI order via orders.payment_intent_id = SpotOn order ID.
//   4. Idempotency guard: skip if order already in paid/preparing/ready state.
//   5. Flip order.status='paid' + paid_at, then internal POST to
//      /api/pos/spoton to push line items + fire kitchen.
//   6. P0 founder alert on any failure between status flip and push.
//
// Event types we care about:
//   SpotOn fires payment-cleared events under several event-type strings
//   depending on the integration flavor. We accept the common ones:
//     - PAYMENT.COMPLETED
//     - ORDER.PAID
//     - payment.captured (lowercase variant)
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { sendFounderAlert } from '@/lib/alerts';

interface SpotOnWebhookEnvelope {
  type?: string;
  eventType?: string;
  orderId?: string;
  externalId?: string;
  paymentId?: string;
  locationId?: string;
  data?: Record<string, unknown>;
}

function verifySpotOnSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SPOTON_WEBHOOK_SECRET;
  if (!secret) return true; // soft-fail in dev / pre-deploy
  if (!signature) return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (computed.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

function isPaymentClearedEvent(type: string | undefined | null): boolean {
  if (!type) return false;
  const t = type.toUpperCase();
  return (
    t === 'PAYMENT.COMPLETED' ||
    t === 'PAYMENT.CAPTURED' ||
    t === 'PAYMENT_COMPLETED' ||
    t === 'PAYMENT_CAPTURED' ||
    t === 'ORDER.PAID' ||
    t === 'ORDER_PAID'
  );
}

function extractSpotOnOrderId(event: SpotOnWebhookEnvelope): string | null {
  if (event.orderId) return event.orderId;
  if (event.externalId) return event.externalId;
  if (event.paymentId) return event.paymentId;
  const fromData =
    (event.data?.orderId as string | undefined) ||
    (event.data?.externalId as string | undefined) ||
    (event.data?.id as string | undefined);
  if (fromData) return fromData;
  return null;
}

export async function POST(request: NextRequest) {
  const t0 = new Date().toISOString();

  // WEBHOOK tier — SpotOn retries on non-2xx so 429 is recoverable.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error(`[${t0}] [webhooks/spoton] body read failed:`, err);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const signature =
    request.headers.get('x-spoton-signature') || request.headers.get('spoton-signature');
  if (!verifySpotOnSignature(rawBody, signature)) {
    console.warn(`[${t0}] [webhooks/spoton] Invalid signature, rejecting`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: SpotOnWebhookEnvelope;
  try {
    event = JSON.parse(rawBody) as SpotOnWebhookEnvelope;
  } catch {
    console.log(`[${t0}] [webhooks/spoton] Non-JSON body, treating as ping`);
    return NextResponse.json({ received: true, test: true });
  }

  const eventType = event.type || event.eventType;
  console.log(
    `[${t0}] [webhooks/spoton] event_type=${eventType || 'unknown'} location=${event.locationId || 'unknown'}`
  );

  if (!isPaymentClearedEvent(eventType)) {
    return NextResponse.json({ received: true, ignored: eventType || 'unknown' });
  }

  const spotonOrderId = extractSpotOnOrderId(event);
  if (!spotonOrderId) {
    console.warn(
      `[${t0}] [webhooks/spoton] payment event with no extractable order ID — cannot match`
    );
    return NextResponse.json({ received: true, unmatched: true });
  }

  try {
    const supabase = await createServiceRoleClient();

    // Find the order by SpotOn's order ID stored in payment_intent_id.
    const { data: order } = await supabase
      .from('orders')
      .select('id, restaurant_id, status, items, total')
      .eq('payment_intent_id', spotonOrderId)
      .maybeSingle();

    if (!order) {
      console.warn(
        `[${t0}] [webhooks/spoton] No OMRI order for spoton_order_id=${spotonOrderId}`
      );
      return NextResponse.json({ received: true, unmatched: true });
    }

    // Idempotency guard — skip if already processed.
    if (order.status === 'paid' || order.status === 'preparing' || order.status === 'ready') {
      console.log(
        `[${t0}] [webhooks/spoton] Order ${order.id} already in '${order.status}' state, skipping duplicate`
      );
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Flip status to 'paid'.
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Internal POST to /api/pos/spoton to push line items + fire kitchen.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com';
    try {
      const pushRes = await fetch(`${baseUrl}/api/pos/spoton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: order.restaurant_id,
          order_id: order.id,
          items: order.items,
          total: order.total,
        }),
      });
      const pushJson = await pushRes.json().catch(() => ({}));
      if (!pushRes.ok) {
        console.error(
          `[${t0}] [webhooks/spoton] /api/pos/spoton push returned ${pushRes.status} for order ${order.id}`
        );
        sendFounderAlert({
          restaurantId: order.restaurant_id,
          failureType: 'payment_link_failure',
          shortReason: `Customer paid via SpotOn but /api/pos/spoton push returned ${pushRes.status}`,
          actionHint: `Order ${order.id} is paid in SpotOn but NOT in the kitchen queue. Manually enter the order in SpotOn Dashboard NOW.`,
          metadata: {
            order_id: order.id,
            spoton_order_id: spotonOrderId,
            push_status: pushRes.status,
            push_body: JSON.stringify(pushJson).slice(0, 500),
          },
        }).catch(() => {});
      } else {
        console.log(
          `[${t0}] [webhooks/spoton] Pushed order ${order.id} to SpotOn → ${pushJson.spoton_order_id}`
        );
      }
    } catch (err) {
      console.error(`[${t0}] [webhooks/spoton] /api/pos/spoton unreachable:`, err);
      sendFounderAlert({
        restaurantId: order.restaurant_id,
        failureType: 'payment_link_failure',
        shortReason: `SpotOn payment cleared but /api/pos/spoton unreachable for order ${order.id}`,
        actionHint: `Customer paid for order ${order.id} but the order is NOT in SpotOn's kitchen queue. Manually enter it.`,
        metadata: { order_id: order.id, spoton_order_id: spotonOrderId },
      }).catch(() => {});
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (err) {
    console.error(`[${t0}] [webhooks/spoton] handler exception:`, err);
    sendFounderAlert({
      failureType: 'tool_call_failure',
      shortReason: `SpotOn webhook handler threw: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown'}`,
      metadata: { spoton_order_id: spotonOrderId, event_type: eventType },
    }).catch(() => {});
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
