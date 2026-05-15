// ──────────────────────────────────────────────────────────────────────────────
// /api/webhooks/clover — Clover webhook receiver.
//
// Closes the Clover Pay-Before-Prep loop. The voice flow generates a Clover
// Hosted Checkout session in finalize-payment, SMS the URL to the caller,
// and waits. When the caller pays via Clover's hosted page, Clover fires
// a payment-cleared event here. We then:
//
//   1. Verify HMAC signature against CLOVER_WEBHOOK_SECRET
//      (soft-fails when unset — dev / pre-deploy). Strict once configured.
//   2. Parse the event payload, extract Clover's payment / checkout
//      identifiers, and look up the matching OMRI order via
//      orders.payment_intent_id = Clover checkoutSessionId.
//   3. Flip order.status from 'payment_sent' → 'paid' and stamp paid_at.
//   4. Internal POST to /api/pos/clover to push the order line items to
//      Clover and fire the kitchen ticket. Same pattern as Square/Toast.
//   5. On any failure between (3) and (4), fire P0 founder alert — the
//      customer has paid but the kitchen won't know about it.
//
// Why a separate webhook route (not inline in /api/pos/clover):
//   - /api/pos/clover is the IDEMPOTENT push primitive — anyone can call
//     it (admin replay tools, manual retries). The webhook is the
//     EVENT-DRIVEN trigger that decides when to call it.
//   - Signature verification belongs at the webhook boundary, not in the
//     push primitive.
//   - Mirrors the Square + Toast webhook patterns so future contributors
//     see one consistent shape across all POS adapters.
//
// Event types we care about:
//   Clover Hosted Checkout fires several event flavors depending on the
//   product flow. We treat any of the following as "payment cleared":
//     - CHECKOUT.COMPLETED
//     - PAYMENT.SUCCEEDED
//     - payment.completed (lowercase variant)
//   Other event types (PAYMENT.FAILED, CHECKOUT.CANCELED) get logged but
//   don't trigger the push.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { sendFounderAlert } from '@/lib/alerts';
import {
  isPaymentClearedEvent,
  extractCheckoutSessionId,
  type CloverWebhookEnvelope,
} from '@/lib/clover/webhook-utils';

function verifyCloverSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.CLOVER_WEBHOOK_SECRET;
  // Soft-fail when secret unset — dev / pre-deploy environments still work.
  if (!secret) return true;
  if (!signature) return false;
  // Clover signs with HMAC-SHA256 of the raw body using the configured
  // webhook secret; signature header carries the hex-encoded digest.
  // (Per Clover Developer Docs; verify formatting once we have a real
  // webhook secret configured in production.)
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (computed.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const t0 = new Date().toISOString();

  // WEBHOOK tier — Clover retries on non-2xx so 429 is recoverable.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error(`[${t0}] [webhooks/clover] body read failed:`, err);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Verify signature before parsing — saves CPU on forged requests.
  const signature =
    request.headers.get('clover-auth') || request.headers.get('x-clover-signature');
  if (!verifyCloverSignature(rawBody, signature)) {
    console.warn(`[${t0}] [webhooks/clover] Invalid signature, rejecting`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: CloverWebhookEnvelope;
  try {
    event = JSON.parse(rawBody) as CloverWebhookEnvelope;
  } catch {
    // Clover test pings sometimes have non-JSON bodies. 200 so they don't retry.
    console.log(`[${t0}] [webhooks/clover] Non-JSON body, treating as ping`);
    return NextResponse.json({ received: true, test: true });
  }

  console.log(
    `[${t0}] [webhooks/clover] event_type=${event.type || 'unknown'} ` +
      `merchant=${event.merchantId || 'unknown'}`
  );

  // Bail early on non-payment events. Acknowledge so Clover stops retrying.
  if (!isPaymentClearedEvent(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type || 'unknown' });
  }

  const checkoutSessionId = extractCheckoutSessionId(event);
  if (!checkoutSessionId) {
    console.warn(
      `[${t0}] [webhooks/clover] payment event with no extractable checkoutSessionId — cannot match order`
    );
    return NextResponse.json({ received: true, unmatched: true });
  }

  try {
    const supabase = await createServiceRoleClient();

    // Find the order by Clover's checkoutSessionId (we stored it as
    // orders.payment_intent_id during finalize-payment).
    const { data: order } = await supabase
      .from('orders')
      .select('id, restaurant_id, status, items, total')
      .eq('payment_intent_id', checkoutSessionId)
      .maybeSingle();

    if (!order) {
      console.warn(
        `[${t0}] [webhooks/clover] No OMRI order for checkoutSessionId=${checkoutSessionId}`
      );
      return NextResponse.json({ received: true, unmatched: true });
    }

    // Idempotency guard — if we've already processed this payment, skip.
    if (order.status === 'paid' || order.status === 'preparing' || order.status === 'ready') {
      console.log(
        `[${t0}] [webhooks/clover] Order ${order.id} already in '${order.status}' state, skipping duplicate webhook`
      );
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Flip status to 'paid' first so the dashboard reflects payment received.
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Internal POST to /api/pos/clover to push line items + fire kitchen.
    // Same pattern as the Square + Toast webhook handlers.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com';
    try {
      const pushRes = await fetch(`${baseUrl}/api/pos/clover`, {
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
        // /api/pos/clover failed AFTER customer paid — P0.
        console.error(
          `[${t0}] [webhooks/clover] /api/pos/clover push returned ${pushRes.status} for order ${order.id}: ${JSON.stringify(pushJson).slice(0, 200)}`
        );
        sendFounderAlert({
          restaurantId: order.restaurant_id,
          failureType: 'payment_link_failure',
          shortReason: `Customer paid via Clover but /api/pos/clover push returned ${pushRes.status}`,
          actionHint: `Order ${order.id} is paid in Clover but NOT in the kitchen queue. Manually enter the order in Clover Dashboard NOW.`,
          metadata: {
            order_id: order.id,
            checkout_session_id: checkoutSessionId,
            push_status: pushRes.status,
            push_body: JSON.stringify(pushJson).slice(0, 500),
          },
        }).catch(() => {});
      } else {
        console.log(
          `[${t0}] [webhooks/clover] Pushed order ${order.id} to Clover → ${pushJson.clover_order_id}`
        );
      }
    } catch (err) {
      // /api/pos/clover unreachable (Vercel outage, etc.) — same P0 alert.
      console.error(`[${t0}] [webhooks/clover] /api/pos/clover unreachable:`, err);
      sendFounderAlert({
        restaurantId: order.restaurant_id,
        failureType: 'payment_link_failure',
        shortReason: `Clover payment cleared but /api/pos/clover unreachable for order ${order.id}`,
        actionHint: `Customer paid for order ${order.id} but the order is NOT in Clover's kitchen queue. Manually enter it.`,
        metadata: { order_id: order.id, checkout_session_id: checkoutSessionId },
      }).catch(() => {});
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (err) {
    console.error(`[${t0}] [webhooks/clover] handler exception:`, err);
    sendFounderAlert({
      failureType: 'tool_call_failure',
      shortReason: `Clover webhook handler threw: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown'}`,
      metadata: { checkout_session_id: checkoutSessionId, event_type: event.type },
    }).catch(() => {});
    // 500 → Clover retries. Defensive — we'd rather process twice
    // (idempotent by orders.status guard) than miss a payment event.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
