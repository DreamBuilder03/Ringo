import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Stripe signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const restaurantId = session.metadata?.restaurant_id;
        const planTier = session.metadata?.plan_tier;

        if (restaurantId) {
          await supabase
            .from('restaurants')
            .update({
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              plan_tier: planTier || 'starter',
            })
            .eq('id', restaurantId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (restaurant) {
          // Map price to tier
          const priceId = subscription.items.data[0]?.price.id;
          let tier: string | null = null;
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) tier = 'starter';
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID) tier = 'growth';
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) tier = 'pro';

          await supabase
            .from('restaurants')
            .update({ plan_tier: tier })
            .eq('id', restaurant.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('restaurants')
          .update({
            stripe_subscription_id: null,
            plan_tier: null,
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
