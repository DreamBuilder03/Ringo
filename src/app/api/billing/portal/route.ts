import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Stripe Customer Portal Route
 * Creates a customer portal session for managing billing and subscriptions
 *
 * Body:
 * - restaurant_id: ID of the restaurant
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'Missing restaurant_id' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error('Missing NEXT_PUBLIC_APP_URL configuration');
    }

    // Get restaurant from database
    const supabase = await createServerSupabaseClient();
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('id, stripe_customer_id, name')
      .eq('id', restaurant_id)
      .single();

    if (fetchError || !restaurant) {
      console.error('Failed to fetch restaurant:', fetchError);
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    if (!restaurant.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this restaurant. Please set up a subscription first.' },
        { status: 400 }
      );
    }

    // Create Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: restaurant.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    if (!session.url) {
      throw new Error('Failed to generate portal URL');
    }

    console.log(
      `[${new Date().toISOString()}] Billing portal session created for restaurant: ${restaurant.name} (${restaurant.id})`
    );

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Billing portal error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
