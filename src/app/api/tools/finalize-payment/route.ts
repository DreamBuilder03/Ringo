import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFounderAlert, reportToolFailure } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { finalizePaymentSchema } from '@/lib/schemas/tools';
import { createOrder as toastCreateOrder, getToastMode } from '@/lib/toast/toast-client';

interface OrderItemModifier {
  name: string;
  price: number;
}

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  modifiers?: OrderItemModifier[];
}

interface PaymentLinkResponse {
  payment_link?: {
    id: string;
    url: string;
  };
  errors?: Array<{ code: string; detail: string }>;
}

const DEFAULT_TAX_RATE = 0.0875; // 8.75% fallback

function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').slice(-8);
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(request, finalizePaymentSchema, 'finalize-payment');
  if (!check.ok) return check.response;

  const callId: string | undefined = check.callId;
  let agentId: string | undefined;
  let restaurantId: string | undefined;
  let orderId: string | undefined;
  let orderTotal: number | undefined;
  let smsProvider: 'ghl' | 'twilio' | 'none' | undefined;

  try {
    const { call, args } = check.body as any;
    agentId = call?.agent_id;
    // Phone resolution order — accept every arg alias we've ever shipped:
    //   1. customer_phone (canonical — what the prompt and interface type say)
    //   2. phone          (legacy alias from pre-V10 prompts)
    //   3. phone_number   (current Retell tool schema name — prompt/schema drift protection)
    //   4. call.from_number (fallback — the Twilio CallerID of the inbound call)
    // The Retell schema at runtime is authoritative, and historically the schema
    // and prompt have drifted (e.g., finalize_payment schema uses `phone_number`
    // while the prompt says `customer_phone`). Rather than let drift break a live
    // call, the backend accepts any alias and the Twilio caller ID is the final
    // safety net. Build 2 founder-alerts will flag if we ever hit the final
    // "no phone anywhere" fallback so we can fix the drift upstream.
    const customer_phone =
      args.customer_phone || args.phone || args.phone_number || call?.from_number;

    // IMPORTANT: every `result` string below is spoken verbatim by the Retell agent.
    // Use plain conversational English so the agent can recover smoothly instead of
    // freezing on a terse `Error:` prefix. Never start a result with "Error:".
    if (!call?.agent_id || !call?.call_id) {
      // STATUS 200 ON ALL FALLBACKS: Retell treats non-2xx as a hard tool failure
      // and refuses to speak the `result` field — agent goes silent until the
      // reminder_message fires. We learned this on call_d920aad6087e00095bd08f0eb95
      // (2026-04-21): empty-args fallback returned 400, agent froze 13s. Speakable
      // fallbacks must always return 200.
      return NextResponse.json(
        { result: "Sorry, I'm having trouble looking up your call right now. Could you give me just a second?" },
        { status: 200 }
      );
    }

    if (!customer_phone) {
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "I just need the phone number to text the payment link. What's the best number to send it to?" },
        { status: 200 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent_id (check both English and Spanish agents).
    // toast_restaurant_guid is pulled so the Toast branch below can use it
    // without a second round-trip when pos_type='toast'.
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, pos_type, pos_connected, square_access_token, square_location_id, tax_rate, preferred_language, toast_restaurant_guid')
      .or(`retell_agent_id.eq.${call.agent_id},retell_agent_id_es.eq.${call.agent_id}`)
      .single();

    if (restaurantError || !restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed:`, restaurantError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Give me just one second — I'm having trouble pulling up the restaurant's system. I'll try again." },
        { status: 200 }
      );
    }

    restaurantId = restaurant.id;

    // Look up internal call ID from Retell call ID
    const { data: callRecord } = await supabase
      .from('calls')
      .select('id')
      .eq('retell_call_id', call.call_id)
      .single();

    const internalCallId = callRecord?.id || null;

    // Try to fetch an existing pending/building order first
    let order: { id: string; items: any; subtotal: number; tax: number; total: number } | null = null;
    if (internalCallId) {
      const { data } = await supabase
        .from('orders')
        .select('id, items, subtotal, tax, total')
        .eq('call_id', internalCallId)
        .in('status', ['pending', 'building'])
        .single();
      order = data;
    }

    // If no existing order, create one from the args the agent sent
    if (!order && args.items && args.items.length > 0) {
      const items = args.items;
      const taxRate = restaurant.tax_rate ?? DEFAULT_TAX_RATE;
      const subtotal = args.total_amount
        ? parseFloat((args.total_amount / (1 + taxRate)).toFixed(2))
        : items.reduce((sum: number, item: any) => {
            const modifierTotal = (item.modifiers || []).reduce(
              (m: number, mod: any) => m + (mod.price || 0),
              0
            );
            return sum + (item.price + modifierTotal) * item.quantity;
          }, 0);
      const tax = parseFloat((subtotal * taxRate).toFixed(2));
      const total = args.total_amount
        ? args.total_amount
        : parseFloat((subtotal + tax).toFixed(2));

      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          call_id: internalCallId,
          restaurant_id: restaurant.id,
          customer_phone: customer_phone,
          items: items,
          subtotal,
          tax,
          total,
          status: 'pending',
        })
        .select('id, items, subtotal, tax, total')
        .single();

      if (insertError || !newOrder) {
        console.error(`[${new Date().toISOString()}] Order creation failed:`, insertError);
        // 200 — speakable fallback, see note at top of handler.
        return NextResponse.json(
          { result: "Hmm, I hit a snag saving the order on our end. Let me try that again in just a second." },
          { status: 200 }
        );
      }

      order = newOrder;
      console.log(`[${new Date().toISOString()}] Created order ${newOrder.id} from agent args`);
    }

    // If still no order, we can't proceed.
    // This is the most common failure mode when the prompt forgets to call
    // add_to_order during the conversation AND forgets to pass `items` into
    // finalize_payment. The agent should recover by asking the caller to
    // restate the order one more time, NOT freeze in silence.
    if (!order) {
      console.error(`[${new Date().toISOString()}] No order found and no items provided`);
      Sentry.captureMessage('finalize-payment: no order and no items — prompt likely missing add_to_order calls', {
        level: 'warning',
        tags: {
          route: 'finalize-payment',
          call_id: callId,
          agent_id: agentId,
          restaurant_id: restaurantId,
        },
      });
      return NextResponse.json(
        { result: "Let me make sure I have everything right before I send the payment link. Can you repeat the full order one more time — including any sizes, sauces, or sides?" },
        { status: 200 }
      );
    }

    orderId = order.id;
    orderTotal = order.total;

    // ─── Toast branch (B2/B4 sprint completion) ─────────────────────────────
    // For restaurants on Toast, route through the Toast adapter (mock-first;
    // swaps to live when TOAST_MODE='live' + credentials are set in Vercel).
    // This makes the B1-B4 work reachable end-to-end from the voice flow.
    //
    // If pos_type='toast' but toast_restaurant_guid is missing, we fall
    // through to the legacy Square path (which will then fail loudly on
    // missing Square creds and trigger the existing fallback) — that's the
    // safety net during partial-onboarding when an operator is mid-migration.
    if (restaurant.pos_type === 'toast' && restaurant.toast_restaurant_guid) {
      return finalizePaymentToast({
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          toastRestaurantGuid: restaurant.toast_restaurant_guid,
          preferredLanguage: (restaurant.preferred_language as string | undefined) || 'en',
        },
        order,
        customerPhone: customer_phone,
        callId,
      });
    }

    // Get Square credentials — prefer restaurant-level, fall back to env vars
    const squareAccessToken = restaurant.square_access_token || process.env.SQUARE_ACCESS_TOKEN;
    const squareLocationId = restaurant.square_location_id || process.env.SQUARE_LOCATION_ID;

    if (!squareAccessToken || !squareLocationId) {
      console.error(`[${new Date().toISOString()}] Missing Square credentials for restaurant ${restaurant.id}`);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Our payment system looks like it needs a quick tune-up on our end. Let me have someone from the restaurant call you right back to finish this." },
        { status: 200 }
      );
    }

    // Create Square payment link with itemized order payload (see spec #11).
    // Uses `order.line_items` + inline modifiers + tax so the Square-hosted
    // checkout page renders each item by name/qty, then subtotal + tax + total.
    const taxRate = restaurant.tax_rate ?? DEFAULT_TAX_RATE;
    const lineItems = (order.items as OrderItem[]).map((it) => ({
      name: it.name,
      quantity: String(it.quantity || 1),
      base_price_money: { amount: Math.round((it.price || 0) * 100), currency: 'USD' },
      ...(it.modifiers && it.modifiers.length > 0
        ? {
            modifiers: it.modifiers.map((m) => ({
              name: m.name,
              base_price_money: { amount: Math.round((m.price || 0) * 100), currency: 'USD' },
            })),
          }
        : {}),
    }));

    const paymentLinkPayload = {
      idempotency_key: order.id,
      order: {
        location_id: squareLocationId,
        line_items: lineItems,
        taxes: [
          {
            name: 'Sales Tax',
            percentage: String((taxRate * 100).toFixed(3)),
            scope: 'ORDER',
          },
        ],
      },
      checkout_options: {
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com'}/order-confirmed/${order.id}`,
      },
      payment_note: `ringo_order:${order.id}`,
    };

    const squareBaseUrl = process.env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    const squareResponse = await fetch(`${squareBaseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentLinkPayload),
    });

    const squareData: PaymentLinkResponse = await squareResponse.json();

    if (!squareResponse.ok || !squareData.payment_link) {
      console.error(
        `[${new Date().toISOString()}] Square API error:`,
        squareData.errors || squareResponse.statusText
      );
      Sentry.captureMessage('finalize-payment: Square API error', {
        level: 'error',
        tags: {
          route: 'finalize-payment',
          call_id: callId,
          agent_id: agentId,
          restaurant_id: restaurantId,
          order_id: orderId,
        },
        extra: {
          square_errors: squareData.errors,
          status: squareResponse.status,
        },
      });
      // Build 2: Square-side failure during a real order is a pay-before-prep hard stop.
      // The caller is on the line expecting an SMS — Misael needs to know within 60s.
      sendFounderAlert({
        restaurantId,
        failureType: 'payment_link_failure',
        shortReason: `Square Payment Link API returned ${squareResponse.status}`,
        retellCallId: callId ?? null,
        metadata: {
          square_errors: squareData.errors,
          square_status: squareResponse.status,
          order_id: orderId,
        },
      }).catch(() => {}); // fire-and-forget, never blocks the speakable fallback
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "The payment system just hiccuped on our end. Give me one more second and I'll get the link out to you." },
        { status: 200 }
      );
    }

    const paymentUrl = squareData.payment_link.url;
    const paymentIntentId = squareData.payment_link.id;

    // Send SMS notification (bilingual support)
    const smsMessageEn = `Your ${restaurant.name} order is ready for payment! Total: $${order.total.toFixed(2)}. Pay here: ${paymentUrl} - Once paid, your order goes straight to the kitchen!`;
    const smsMessageEs = `Tu pedido de ${restaurant.name} esta listo para pagar! Total: $${order.total.toFixed(2)}. Paga aqui: ${paymentUrl} - Una vez pagado, tu pedido va directamente a la cocina!`;
    const smsMessage = restaurant.preferred_language === 'es' ? smsMessageEs : smsMessageEn;

    // Track SMS outcome so the agent can recover if SMS fails but Square succeeded.
    let smsDelivered = false;
    try {
      const smsResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com'}/api/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customer_phone,
          message: smsMessage,
        }),
      });

      if (smsResp.ok) {
        smsDelivered = true;
        try {
          const smsJson = await smsResp.clone().json();
          if (smsJson && typeof smsJson.provider === 'string') {
            smsProvider = smsJson.provider === 'ghl' ? 'ghl' : 'twilio';
          } else {
            smsProvider = 'twilio';
          }
        } catch {
          smsProvider = 'twilio';
        }
      } else {
        smsProvider = 'none';
        console.error(
          `[${new Date().toISOString()}] SMS send failed: HTTP ${smsResp.status}`
        );
      }
    } catch (smsError) {
      smsProvider = 'none';
      console.error(`[${new Date().toISOString()}] SMS send failed:`, smsError);
    }

    // Update order with payment link info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'payment_sent',
        payment_link_sent_at: new Date().toISOString(),
        payment_intent_id: paymentIntentId,
      })
      .eq('id', order.id);

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Order update failed:`, updateError);
      Sentry.captureMessage('finalize-payment: Order update failed', {
        level: 'error',
        tags: {
          route: 'finalize-payment',
          call_id: callId,
          agent_id: agentId,
          restaurant_id: restaurantId,
          order_id: orderId,
        },
      });
      reportToolFailure({
        toolName: 'finalize-payment',
        restaurantId,
        retellCallId: callId ?? null,
        shortReason: `order status update failed: ${updateError.message ?? 'unknown'}`,
        metadata: { order_id: orderId, error: updateError.message },
      }).catch(() => {});
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "One second — I'm finishing up your order on our end. Thanks for hanging in there." },
        { status: 200 }
      );
    }

    // Log successful invocation to Sentry with PII redacted.
    Sentry.captureMessage('finalize-payment: success', {
      level: 'info',
      tags: {
        route: 'finalize-payment',
        call_id: callId,
        agent_id: agentId,
        restaurant_id: restaurantId,
        order_id: orderId,
        sms_provider: smsProvider,
      },
      extra: {
        total: orderTotal,
        duration_ms: Date.now() - startedAt,
        customer_phone_hash8: hashPhone(customer_phone),
      },
    });

    // If SMS failed but Square succeeded, hand the URL back to the agent so it
    // can read the link aloud instead of silently promising a text that never arrived.
    if (!smsDelivered) {
      // Critical: customer won't receive payment link via text. Alert even though Square succeeded.
      reportToolFailure({
        toolName: 'finalize-payment',
        restaurantId,
        retellCallId: callId ?? null,
        shortReason: 'SMS send failed after Square Payment Link created',
        metadata: { order_id: orderId, payment_url_captured: true },
      }).catch(() => {});
      return NextResponse.json({
        result: `Looks like our text system just hiccuped — the payment link is ${paymentUrl}. Say it back to me and I can also have Sal email it to you.`,
      });
    }

    return NextResponse.json({
      result:
        "Payment link sent! The customer will receive an SMS with a secure payment link. Once they pay, the order goes straight to the kitchen.",
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Finalize-payment error:`, error);
    Sentry.captureException(error, {
      tags: {
        route: 'finalize-payment',
        call_id: callId,
        agent_id: agentId,
        restaurant_id: restaurantId,
        order_id: orderId,
      },
      extra: {
        duration_ms: Date.now() - startedAt,
      },
    });
    reportToolFailure({
      toolName: 'finalize-payment',
      restaurantId: restaurantId ?? null,
      retellCallId: callId ?? null,
      shortReason: `unhandled exception: ${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}`,
      metadata: { order_id: orderId },
    }).catch(() => {});
    // 200 — speakable fallback, see note at top of handler.
    return NextResponse.json(
      { result: "Sorry — give me just a second. Something hiccuped on our end." },
      { status: 200 }
    );
  }
}

// ─── Toast finalize-payment branch (sprint completion) ─────────────────────────
//
// Closes the loop on the Ryno demo sprint by making the entire B1-B4 chain
// reachable from the voice flow. When a Toast-connected restaurant's caller
// reaches the finalize_payment step, this helper:
//
//   1. Pushes the order to Toast in pending/not-fired state. We use
//      toast-client.createOrder which is idempotent on externalOrderId, so
//      if Toast's webhook later triggers a duplicate push it coalesces to
//      the same Toast order GUID.
//   2. Generates a customer payment URL. In MOCK mode this is a stub URL
//      pointing at our own /pay/[orderId] page (which already exists for
//      the Square Payment Links demo) so the SMS link clicks through to
//      something visible. In LIVE mode (post-partner-approval) this will
//      call Toast's customer-payment-link mechanism — see the TODO in the
//      URL-generation block.
//   3. Sends the URL via SMS using the same /api/sms route the Square flow
//      uses. Bilingual message body.
//   4. Updates the orders row: status='payment_sent', payment_link_sent_at,
//      payment_intent_id = the Toast order GUID. The Toast webhook handler
//      (/api/webhooks/toast) later matches on externalOrderId to fire the
//      kitchen ticket.
//   5. Returns the speakable confirmation the Retell agent reads back.
//
// Why a separate helper (not inlined): the Square path in POST() is ~250
// lines of intertwined logic. Bolting Toast handling inline would make both
// paths harder to read. Each path stays self-contained.
//
// What this does NOT do:
//   - Real Toast customer payment-link generation. Toast's payment-link API
//     surface unlocks on partner-approval delivery (and likely requires a
//     separate Toast Online Ordering / TWO partner agreement on top of the
//     integration partner agreement we already submitted). The mock URL is
//     intentional placeholder until we see the real API responses.
//   - Tax computation. Toast computes tax server-side based on the order's
//     items + restaurant tax config; our local `order.total` is best-effort
//     but the Toast-reported total is authoritative. We carry our total
//     forward and trust Toast to correct it at fire-time if needed.

interface FinalizePaymentToastArgs {
  restaurant: {
    id: string;
    name: string;
    toastRestaurantGuid: string;
    preferredLanguage: string;
  };
  order: { id: string; items: any; subtotal: number; tax: number; total: number };
  customerPhone: string;
  callId: string | undefined;
}

async function finalizePaymentToast(args: FinalizePaymentToastArgs): Promise<Response> {
  const { restaurant, order, customerPhone, callId } = args;
  const t0 = new Date().toISOString();
  const supabase = await createServiceRoleClient();
  const mode = getToastMode();

  // Step 1: push order to Toast in pending/not-fired state.
  // toast-client maps our order.items shape to Toast's request schema.
  // In MOCK mode this returns a deterministic mock-order-{order.id} GUID.
  let toastResult;
  try {
    toastResult = await toastCreateOrder({
      restaurantGuid: restaurant.toastRestaurantGuid,
      externalOrderId: order.id,
      scheduledPickupAt: null,
      items: (order.items as Array<{ name: string; quantity: number; price: number }>).map(
        (it) => ({
          // Pass the item name as the menu item identifier. In MOCK mode the
          // client doesn't actually look up by name; in LIVE mode we'll need
          // to plumb the Toast menu_item_guid through earlier in the flow
          // (B1 caches the snapshot — we can map name → guid at add_to_order
          // time before this point).
          menuItemGuid: it.name,
          quantity: it.quantity,
        })
      ),
    });
  } catch (err) {
    console.error(`[${t0}] [finalize-payment][toast] createOrder threw:`, err);
    Sentry.captureException(err, {
      tags: {
        route: 'finalize-payment',
        branch: 'toast',
        restaurant_id: restaurant.id,
        order_id: order.id,
      },
    });
    sendFounderAlert({
      restaurantId: restaurant.id,
      failureType: 'payment_link_failure',
      shortReason: `Toast createOrder failed during finalize-payment: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown'}`,
      retellCallId: callId ?? null,
      actionHint: `Caller is on the line. Push order manually in Toast and call them back.`,
      metadata: { order_id: order.id, mode },
    }).catch(() => {});
    return NextResponse.json(
      { result: "Our system just hiccuped on the payment link. Give me one more second and I'll try again." },
      { status: 200 }
    );
  }

  // Step 2: generate a customer payment URL.
  // MOCK mode: stub URL that loops back through our existing /pay/[orderId]
  // page so the demo SMS link clicks through to something visible.
  // LIVE mode (TODO post-partner-approval): call Toast's customer-payment-
  // link API and pass the returned URL.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://joinomri.com';
  const paymentUrl =
    mode === 'live'
      ? // Placeholder until we wire the real Toast payment-link API. The
        // build-out happens once we have sandbox creds — see toast-client.
        `${appUrl}/pay/${order.id}?source=toast` /* TODO: real Toast URL */
      : `${appUrl}/pay/${order.id}?source=toast-mock`;
  const paymentIntentId = toastResult.toastOrderGuid;

  // Step 3: SMS the payment link.
  const smsMessageEn = `Your ${restaurant.name} order is ready for payment! Total: $${order.total.toFixed(2)}. Pay here: ${paymentUrl} — Once paid, your order goes straight to the kitchen!`;
  const smsMessageEs = `Tu pedido de ${restaurant.name} esta listo para pagar! Total: $${order.total.toFixed(2)}. Paga aqui: ${paymentUrl} — Una vez pagado, tu pedido va directamente a la cocina!`;
  const smsMessage = restaurant.preferredLanguage === 'es' ? smsMessageEs : smsMessageEn;

  let smsDelivered = false;
  try {
    const smsResp = await fetch(`${appUrl}/api/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: customerPhone, message: smsMessage }),
    });
    smsDelivered = smsResp.ok;
  } catch (err) {
    console.error(`[${t0}] [finalize-payment][toast] SMS send failed:`, err);
  }

  // Step 4: update the order row. Toast GUID lands in payment_intent_id so
  // the webhook can correlate. status='payment_sent' tells the dashboard
  // "awaiting customer payment" rather than "still building."
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'payment_sent',
      payment_link_sent_at: new Date().toISOString(),
      payment_intent_id: paymentIntentId,
    })
    .eq('id', order.id);

  if (updateError) {
    console.error(`[${t0}] [finalize-payment][toast] Order update failed:`, updateError);
    Sentry.captureMessage('finalize-payment[toast]: order update failed', {
      level: 'error',
      tags: { route: 'finalize-payment', branch: 'toast', order_id: order.id },
    });
  }

  console.log(
    `[${t0}] [finalize-payment][toast] mode=${mode} restaurant=${restaurant.id} ` +
      `order=${order.id} → toast_order=${paymentIntentId} sms=${smsDelivered ? 'sent' : 'failed'}`
  );

  // Step 5: speakable result for the Retell agent.
  if (!smsDelivered) {
    return NextResponse.json({
      result: `Looks like our text system just hiccuped — the payment link is ${paymentUrl}. Say it back to me and I can also have ${restaurant.name} email it to you.`,
    });
  }
  return NextResponse.json({
    result:
      'Payment link sent! Once you pay, the order goes straight to the kitchen.',
  });
}
