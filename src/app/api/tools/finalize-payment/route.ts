import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
    items?: Array<{ name: string; price: number; quantity: number }>;
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RetellRequest;
    const { call, args } = body;
    const customer_phone = args.customer_phone || args.phone;

    if (!call?.agent_id || !call?.call_id) {
      return NextResponse.json(
        { result: 'Error: Unable to identify the call. Please try again.' },
        { status: 400 }
      );
    }

    if (!customer_phone) {
      return NextResponse.json(
        { result: 'Error: Customer phone number is required.' },
        { status: 400 }
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
      return NextResponse.json(
        { result: 'Error: Restaurant not found. Please contact support.' },
        { status: 404 }
      );
    }

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
        : items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
        return NextResponse.json(
          { result: 'Error: Unable to create order. Please try again.' },
          { status: 500 }
        );
      }

      order = newOrder;
      console.log(`[${new Date().toISOString()}] Created order ${newOrder.id} from agent args`);
    }

    // If still no order, we can't proceed
    if (!order) {
      console.error(`[${new Date().toISOString()}] No order found and no items provided`);
      return NextResponse.json(
        { result: 'Error: No order found. Please confirm your order first.' },
        { status: 404 }
      );
    }

    // Get Square credentials — prefer restaurant-level, fall back to env vars
    const squareAccessToken = restaurant.square_access_token || process.env.SQUARE_ACCESS_TOKEN;
    const squareLocationId = restaurant.square_location_id || process.env.SQUARE_LOCATION_ID;

    if (!squareAccessToken || !squareLocationId) {
      console.error(`[${new Date().toISOString()}] Missing Square credentials for restaurant ${restaurant.id}`);
      return NextResponse.json(
        { result: 'Error: Payment processing not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Square payment link
    const paymentLinkPayload = {
      idempotency_key: order.id,
      quick_pay: {
        name: `${restaurant.name} Order`,
        price_money: {
          amount: Math.round(order.total * 100),
          currency: 'USD',
        },
        location_id: squareLocationId,
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
      return NextResponse.json(
        { result: 'Error: Unable to create payment link. Please try again.' },
        { status: 500 }
      );
    }

    const paymentUrl = squareData.payment_link.url;
    const paymentIntentId = squareData.payment_link.id;

    // Send SMS notification (bilingual support)
    const smsMessageEn = `Your ${restaurant.name} order is ready for payment! Total: $${order.total.toFixed(2)}. Pay here: ${paymentUrl} - Once paid, your order goes straight to the kitchen!`;
    const smsMessageEs = `Tu pedido de ${restaurant.name} esta listo para pagar! Total: $${order.total.toFixed(2)}. Paga aqui: ${paymentUrl} - Una vez pagado, tu pedido va directamente a la cocina!`;
    const smsMessage = restaurant.preferred_language === 'es' ? smsMessageEs : smsMessageEn;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai'}/api/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customer_phone,
          message: smsMessage,
        }),
      });
    } catch (smsError) {
      console.error(`[${new Date().toISOString()}] SMS send failed:`, smsError);
      // Don't fail the entire request if SMS fails, just log it
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
      return NextResponse.json(
        { result: 'Error: Unable to update order. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result:
        "Payment link sent! The customer will receive an SMS with a secure payment link. Once they pay, the order goes straight to the kitchen.",
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Finalize-payment error:`, error);
    return NextResponse.json(
      { result: 'Error: Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
