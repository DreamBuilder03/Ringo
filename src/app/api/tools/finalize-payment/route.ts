import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

interface RetellRequest {
  call: {
    call_id: string;
    agent_id: string;
    from_number: string;
    [key: string]: any;
  };
  args: {
    customer_phone?: string;
    phone?: string;
    items?: OrderItem[];
    total_amount?: number;
  };
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
  let callId: string | undefined;
  let agentId: string | undefined;
  let restaurantId: string | undefined;
  let orderId: string | undefined;
  let orderTotal: number | undefined;
  let smsProvider: 'ghl' | 'twilio' | 'none' | undefined;

  try {
    const body = (await request.json()) as RetellRequest;
    const { call, args } = body;
    callId = call?.call_id;
    agentId = call?.agent_id;
    // Phone resolution order:
    //   1. customer_phone (preferred — agent passes it explicitly)
    //   2. phone          (legacy alias some prompt versions use)
    //   3. call.from_number (fallback — the Twilio CallerID of the inbound call)
    // The fallback is critical: if the prompt forgets to pass the phone, the
    // demo would otherwise dead-loop with "we need your phone number" messages.
    // 99% of inbound callers want the SMS sent to the number they called from.
    const customer_phone = args.customer_phone || args.phone || call?.from_number;

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

    // Look up restaurant by agent_id (check both English and Spanish agents)
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, pos_type, pos_connected, square_access_token, square_location_id, tax_rate, preferred_language')
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
        : items.reduce((sum, item) => {
            const modifierTotal = (item.modifiers || []).reduce((m, mod) => m + (mod.price || 0), 0);
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
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai'}/order-confirmed/${order.id}`,
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
      const smsResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai'}/api/sms`, {
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
    // 200 — speakable fallback, see note at top of handler.
    return NextResponse.json(
      { result: "Sorry — give me just a second. Something hiccuped on our end." },
      { status: 200 }
    );
  }
}
