import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// POST: Create payment intent and process payment
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  // Rate limit at PAY tier — customer-facing pay link page.
  const blocked = await checkRateLimit(req, 'PAY');
  if (blocked) return blocked;

  try {
    const { orderId } = params;
    const supabase = await createServiceRoleClient();

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, restaurants(name, stripe_customer_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'paid' || order.status === 'preparing') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
    }

    const stripe = getStripe();

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // cents
      currency: 'usd',
      metadata: {
        order_id: orderId,
        restaurant_id: order.restaurant_id,
        restaurant_name: order.restaurants?.name || '',
      },
    });

    // Update order with payment intent ID
    await supabase
      .from('orders')
      .update({
        payment_intent_id: paymentIntent.id,
        status: 'payment_sent',
      })
      .eq('id', orderId);

    console.log(`[${new Date().toISOString()}] PaymentIntent created: ${paymentIntent.id} for order ${orderId}`);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Payment error:`, err);
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}

// PUT: Confirm payment success
export async function PUT(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  // Rate limit at PAY tier.
  const blocked = await checkRateLimit(req, 'PAY');
  if (blocked) return blocked;

  try {
    const { orderId } = params;
    const { paymentIntentId } = await req.json();

    const supabase = await createServiceRoleClient();

    // Verify payment with Stripe
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 400 });
    }

    // Update order status to paid
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error(`[${new Date().toISOString()}] Order update error:`, error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    console.log(`[${new Date().toISOString()}] Order ${orderId} marked as paid`);

    // Fetch full order details for POS push and SMS
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('*, restaurants(name, pos_type, pos_connected)')
      .eq('id', orderId)
      .single();

    // Push to POS if connected
    if (fullOrder?.restaurants?.pos_connected && fullOrder?.restaurants?.pos_type === 'square') {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://omriapp.com';
        await fetch(`${baseUrl}/api/pos/square`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: fullOrder.restaurant_id,
            order_id: orderId,
            items: fullOrder.items,
            total: fullOrder.total,
          }),
        });
        console.log(`[${new Date().toISOString()}] Order ${orderId} pushed to Square POS`);
      } catch (posErr) {
        console.error(`[${new Date().toISOString()}] POS push failed for ${orderId}:`, posErr);
      }
    }

    // Update order to preparing
    await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderId);

    // Send confirmation SMS
    if (fullOrder?.customer_phone) {
      try {
        const restaurantName = fullOrder.restaurants?.name || 'the restaurant';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://omriapp.com';
        await fetch(`${baseUrl}/api/sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: fullOrder.customer_phone,
            message: `Payment confirmed! ${restaurantName} is now preparing your order. We'll let you know when it's ready!`,
            type: 'order_confirmation',
          }),
        });
      } catch (smsErr) {
        console.error(`[${new Date().toISOString()}] Confirmation SMS failed:`, smsErr);
      }
    }

    return NextResponse.json({ success: true, status: 'preparing' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Payment confirmation error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
