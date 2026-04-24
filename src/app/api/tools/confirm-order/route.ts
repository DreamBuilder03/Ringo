import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { reportToolFailure } from '@/lib/alerts';

interface RetellRequest {
  call: {
    call_id: string;
    agent_id: string;
    from_number: string;
    [key: string]: any;
  };
  args: {
    // Accept every phone-arg alias we've ever shipped — see phone resolution
    // block below. Prompt/schema drift must not strand a live call.
    customer_phone?: string;
    phone?: string;
    phone_number?: string;
  };
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  is_upsell?: boolean;
}

export async function POST(request: NextRequest) {
  let callId: string | undefined;
  let restaurantId: string | undefined;
  try {
    const body = (await request.json()) as RetellRequest;
    const { call, args } = body;
    callId = call?.call_id;
    // Phone resolution — accept every arg alias we've ever shipped:
    //   customer_phone (canonical) → phone (legacy) → phone_number (Retell schema drift)
    //   → call.from_number (Twilio caller ID fallback)
    // Mirrors finalize-payment so the agent never dead-loops asking for a phone.
    const customer_phone =
      args.customer_phone || args.phone || args.phone_number || call?.from_number;

    // Every `result` string below is spoken verbatim by the Retell agent.
    // Use natural spoken English so the agent never freezes. Never "Error:".
    if (!call?.agent_id || !call?.call_id) {
      // STATUS 200 ON ALL FALLBACKS: Retell treats non-2xx as a hard tool failure
      // and refuses to speak the `result` field — agent goes silent until the
      // reminder_message fires. We learned this on call_d920aad6087e00095bd08f0eb95
      // (2026-04-21): empty-args fallback returned 400, agent froze 13s. Speakable
      // fallbacks must always return 200.
      return NextResponse.json(
        { result: "Give me just a moment — I'm looking that up." },
        { status: 200 }
      );
    }

    if (!customer_phone) {
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "I just need a phone number to text the payment link to. What's the best number?" },
        { status: 200 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent_id (check both English and Spanish agents)
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .or(`retell_agent_id.eq.${call.agent_id},retell_agent_id_es.eq.${call.agent_id}`)
      .single();

    if (restaurantError || !restaurant) {
      console.error(`[${new Date().toISOString()}] Restaurant lookup failed:`, restaurantError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Give me one second — I'm pulling up the restaurant's system." },
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

    // Fetch the building order
    let order = null;
    if (internalCallId) {
      const { data } = await supabase
        .from('orders')
        .select('id, items, subtotal, tax, total')
        .eq('call_id', internalCallId)
        .eq('status', 'building')
        .single();
      order = data;
    }

    const orderFetchError = order ? null : new Error('Order not found');

    if (orderFetchError || !order) {
      console.error(`[${new Date().toISOString()}] Order fetch failed:`, orderFetchError);
      return NextResponse.json(
        { result: "I don't have any items in the order yet — can you tell me what you'd like and I'll add it?" },
        { status: 200 }
      );
    }

    // Verify order has items
    const items = order.items as OrderItem[];
    if (!items || items.length === 0) {
      return NextResponse.json({
        result: "Looks like the order is empty so far. What can I get started for you?",
      });
    }

    // Update order status to pending and store customer phone
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pending',
        customer_phone,
      })
      .eq('id', order.id);

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Order update failed:`, updateError);
      // 200 — speakable fallback, see note at top of handler.
      return NextResponse.json(
        { result: "Hmm, I hit a snag locking that in. Let me try one more time." },
        { status: 200 }
      );
    }

    return NextResponse.json({
      result: `Order confirmed! Total: $${order.total.toFixed(2)}. We'll send a payment link to your phone shortly.`,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Confirm-order error:`, error);
    reportToolFailure({
      toolName: 'confirm-order',
      restaurantId: restaurantId ?? null,
      retellCallId: callId ?? null,
      shortReason: `unhandled exception: ${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}`,
    }).catch(() => {});
    // 200 — speakable fallback, see note at top of handler.
    return NextResponse.json(
      { result: "Sorry — give me just a second. Something hiccuped on our end." },
      { status: 200 }
    );
  }
}
