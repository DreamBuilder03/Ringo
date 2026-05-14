// ──────────────────────────────────────────────────────────────────────────────
// /api/webhooks/toast — Toast webhook receiver (B2 of Ryno demo sprint).
//
// What Toast sends here (once partner credentials are live):
//   - Payment events (payment.completed / order.paid) — triggers kitchen
//     ticket fire by calling /api/pos/toast to push the order.
//   - Menu update events — invalidates our Upstash menu cache so the voice
//     agent sees the new menu within seconds.
//   - 86'd item events — invalidates cache so availability flips real-time.
//
// Signature verification:
//   Toast signs every webhook with a Marketplace-Webhook-Secret (HMAC).
//   We verify against TOAST_WEBHOOK_SECRET env var. Soft-fails when the
//   secret isn't configured (MOCK mode / pre-partner-approval). Becomes
//   strict the moment the env var is set in Vercel after partner approval.
//
// MOCK mode behavior:
//   This route is reachable today. In MOCK mode (no TOAST_WEBHOOK_SECRET),
//   POST returns 200 + a "mock-mode" marker so developers can simulate the
//   webhook locally to verify the order-push wiring works end-to-end.
//
// What this does NOT do:
//   - Refunds / voids — Toast sends refund events too, but post-payment
//     refund handling is post-v1 scope per the sprint brief.
//   - Tip changes after payment — same, post-v1.
//   - Order modifications (Toast lets staff edit orders pre-fire) — we
//     accept the original payload only.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { sendFounderAlert } from '@/lib/alerts';
import { invalidateToastMenu } from '@/lib/restaurant-cache';
import { getToastMode } from '@/lib/toast/toast-client';

// Toast wraps each webhook payload as: { eventType: string, data: {...}, ... }
// Different event types carry different `data` shapes. Type these loosely
// since the schema changes between Toast API versions.
interface ToastWebhookEnvelope {
  eventType?: string;
  eventCategory?: string;
  data?: Record<string, unknown>;
  // Toast restaurant GUID — present on every event so we can route to the
  // correct OMRI restaurant.
  restaurantGuid?: string;
  // Idempotency: Toast retries on non-2xx, and the same eventId may arrive
  // multiple times. We don't currently store eventIds — Toast Orders API is
  // idempotent on externalOrderId on our side, so duplicate pushes coalesce.
  eventId?: string;
}

function verifyToastSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TOAST_WEBHOOK_SECRET;
  // Soft-fail when secret unset — MOCK / pre-partner mode.
  if (!secret) return true;
  if (!signature) return false;
  // Toast uses HMAC-SHA256 with the secret as key, base64-encoded result.
  // (Per Toast docs; verify once we have a real sandbox secret in hand.)
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  if (computed.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const t0 = new Date().toISOString();
  const mode = getToastMode();

  // WEBHOOK tier — Toast retries on non-2xx, so 429 is recoverable for them.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error(`[${t0}] [webhooks/toast] body read failed:`, err);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Verify signature before parsing — saves CPU on forged requests.
  const signature = request.headers.get('toast-webhook-signature');
  if (!verifyToastSignature(rawBody, signature)) {
    console.warn(`[${t0}] [webhooks/toast] Invalid signature, rejecting`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: ToastWebhookEnvelope;
  try {
    event = JSON.parse(rawBody) as ToastWebhookEnvelope;
  } catch {
    // Toast test pings sometimes have non-JSON bodies. 200 to avoid retries.
    console.log(`[${t0}] [webhooks/toast] Non-JSON body, treating as ping`);
    return NextResponse.json({ received: true, test: true });
  }

  const eventType = event.eventType || 'unknown';
  const restaurantGuid = event.restaurantGuid;

  console.log(`[${t0}] [webhooks/toast] mode=${mode} event=${eventType} guid=${restaurantGuid || 'unknown'}`);

  // Test-ping path: Toast pings the webhook URL during partner setup with a
  // minimal envelope to verify reachability. Acknowledge and exit.
  if (!restaurantGuid) {
    return NextResponse.json({ received: true, ping: true });
  }

  try {
    const supabase = await createServiceRoleClient();

    // Look up our restaurant by Toast GUID. If we don't recognize the GUID,
    // Toast probably enabled a restaurant we haven't onboarded yet — log
    // and exit cleanly (Toast will stop sending eventually).
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('toast_restaurant_guid', restaurantGuid)
      .maybeSingle();

    if (!restaurant) {
      console.warn(`[${t0}] [webhooks/toast] No OMRI restaurant for toast_restaurant_guid=${restaurantGuid}`);
      return NextResponse.json({ received: true, unmapped: true });
    }

    // Dispatch by event type. Toast's exact event-type strings vary by API
    // version — these are the canonical ones we care about.
    switch (eventType) {
      case 'payment.completed':
      case 'order.paid':
      case 'check.paid':
        await handlePaymentCleared(restaurant.id, restaurant.name, event);
        break;

      case 'menu.updated':
      case 'menus.updated':
        await invalidateToastMenu(restaurantGuid);
        console.log(`[${t0}] [webhooks/toast] Invalidated menu cache for ${restaurantGuid}`);
        break;

      case 'item.unavailable':
      case 'item.eightysix':
      case 'item.available':
        // Same cache invalidation — the menu read includes availability flags.
        await invalidateToastMenu(restaurantGuid);
        console.log(`[${t0}] [webhooks/toast] Invalidated menu cache for ${restaurantGuid} (item availability change)`);
        break;

      default:
        // Unknown event type — log but accept (Toast retries on non-2xx).
        console.log(`[${t0}] [webhooks/toast] Ignoring event type: ${eventType}`);
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (err) {
    console.error(`[${t0}] [webhooks/toast] handler exception:`, err);
    sendFounderAlert({
      failureType: 'tool_call_failure',
      shortReason: `Toast webhook handler threw: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown'}`,
      metadata: { event_type: eventType, restaurant_guid: restaurantGuid, mode },
    }).catch(() => {});
    // 500 → Toast will retry. Defensive choice — we'd rather process twice
    // (idempotent) than miss a payment event.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── Event handler: payment cleared → fire kitchen ticket ─────────────────────

async function handlePaymentCleared(
  restaurantId: string,
  restaurantName: string,
  event: ToastWebhookEnvelope
): Promise<void> {
  const supabase = await createServiceRoleClient();

  // Toast payment event carries the externalOrderId we passed in when
  // pushing the order in pending state. Recover our internal order_id from it.
  const data = event.data || {};
  const externalOrderId =
    (data.externalOrderId as string | undefined) ||
    (data.externalId as string | undefined) ||
    null;

  if (!externalOrderId) {
    console.warn(`[webhooks/toast] payment.completed missing externalOrderId, cannot match order`);
    return;
  }

  // Find the order by its ID (we use the internal UUID as externalOrderId).
  // Pull customer_name + customer_phone so the guest-sync downstream (B4) has
  // them — the /api/pos/toast route writes guests to Toast Guest Manager
  // after the order push.
  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id, status, items, total, customer_name, customer_phone')
    .eq('id', externalOrderId)
    .single();

  if (!order) {
    console.warn(`[webhooks/toast] No OMRI order for externalOrderId=${externalOrderId}`);
    return;
  }

  // Guard: if already pushed, this is a duplicate webhook — toast-client
  // idempotency would also catch it, but bail early to skip the DB roundtrip.
  if (order.status === 'paid' || order.status === 'pos_pushed' || order.status === 'fired') {
    console.log(`[webhooks/toast] Order ${externalOrderId} already pushed, skipping duplicate`);
    return;
  }

  // Flip order status to paid first so dashboard reflects payment received,
  // then call /api/pos/toast to push to the kitchen.
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  // Internal POST to /api/pos/toast. Same pattern as Square webhook calling
  // /api/pos/square. The route handles the toast-client call + alerts.
  // Pass guest_name + guest_phone so the guest-sync (B4) inside /api/pos/toast
  // doesn't have to round-trip back to Supabase for the same fields.
  const orderRow = order as typeof order & {
    customer_name?: string | null;
    customer_phone?: string | null;
  };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com';
  try {
    const pushRes = await fetch(`${baseUrl}/api/pos/toast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        items: order.items,
        guest_name: orderRow.customer_name || undefined,
        guest_phone: orderRow.customer_phone || undefined,
      }),
    });
    const pushJson = await pushRes.json().catch(() => ({}));
    if (!pushRes.ok) {
      // /api/pos/toast already alerted internally — log here for the webhook trail.
      console.error(
        `[webhooks/toast] /api/pos/toast push returned ${pushRes.status} for order ${order.id}: ${JSON.stringify(pushJson).slice(0, 200)}`
      );
    } else {
      console.log(`[webhooks/toast] Pushed order ${order.id} to Toast → ${pushJson.toast_order_guid}`);
    }
  } catch (err) {
    // /api/pos/toast unreachable (deploy outage) — escalate to founder since
    // the customer has paid but the kitchen will never see the order.
    console.error(`[webhooks/toast] /api/pos/toast unreachable:`, err);
    sendFounderAlert({
      restaurantId,
      failureType: 'payment_link_failure',
      shortReason: `Toast webhook received payment.cleared but could not reach /api/pos/toast for ${restaurantName}`,
      actionHint: `Customer paid for order ${order.id} but the order is NOT in Toast. Manually enter it in Toast.`,
      metadata: { order_id: order.id, external_order_id: externalOrderId },
    }).catch(() => {});
  }
}
