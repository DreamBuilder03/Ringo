import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

type SupabaseClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

function priceIdToTier(priceId: string | undefined): string | null {
  if (!priceId) return null;
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 'starter';
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID) return 'growth';
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) return 'pro';
  return null;
}

// Sync all fields we care about from a Stripe Subscription onto the restaurants row.
async function syncSubscriptionToRestaurant(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceIdToTier(priceId);

  // Cast through unknown so we can read timestamp properties without fighting
  // the Stripe type changes between API versions (they moved from top-level
  // current_period_end to items.data[0].current_period_end at some point).
  const subAny = subscription as unknown as {
    current_period_end?: number;
    trial_end?: number | null;
    items?: { data?: Array<{ current_period_end?: number }> };
  };

  const periodEndSec =
    subAny.current_period_end ??
    subAny.items?.data?.[0]?.current_period_end ??
    null;
  const trialEndSec = subAny.trial_end ?? null;

  const update: Record<string, unknown> = {
    subscription_status: subscription.status,
  };
  if (tier) update.plan_tier = tier;
  if (periodEndSec) update.current_period_end = new Date(periodEndSec * 1000).toISOString();
  if (trialEndSec) update.trial_ends_at = new Date(trialEndSec * 1000).toISOString();

  await supabase
    .from('restaurants')
    .update(update)
    .eq('stripe_subscription_id', subscription.id);
}

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
    const t0 = new Date().toISOString();

    switch (event.type) {
      // ───────── Initial subscription creation ─────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const restaurantId = session.metadata?.restaurant_id;
        const planTier = session.metadata?.plan_tier;

        if (restaurantId && session.subscription) {
          // Pull the full subscription so we can stamp status + period_end immediately.
          const subscription = await getStripe().subscriptions.retrieve(
            session.subscription as string
          );

          const subAny = subscription as unknown as {
            current_period_end?: number;
            trial_end?: number | null;
            items?: { data?: Array<{ current_period_end?: number }> };
          };
          const periodEndSec =
            subAny.current_period_end ??
            subAny.items?.data?.[0]?.current_period_end ??
            null;
          const trialEndSec = subAny.trial_end ?? null;

          await supabase
            .from('restaurants')
            .update({
              stripe_subscription_id: subscription.id,
              stripe_customer_id: session.customer as string,
              plan_tier: planTier || priceIdToTier(subscription.items.data[0]?.price.id) || 'starter',
              subscription_status: subscription.status,
              current_period_end: periodEndSec
                ? new Date(periodEndSec * 1000).toISOString()
                : null,
              trial_ends_at: trialEndSec
                ? new Date(trialEndSec * 1000).toISOString()
                : null,
            })
            .eq('id', restaurantId);

          console.log(
            `[${t0}] [stripe] checkout completed for restaurant ${restaurantId} (sub ${subscription.id}, status ${subscription.status})`
          );

          // Kick off auto-provisioning (Twilio number + Retell agent) fire-and-forget.
          // We don't block the webhook on it — if it fails, the row is marked
          // provisioning_status='failed' and the admin can retry.
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai';
          fetch(`${baseUrl}/api/provisioning/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurant_id: restaurantId }),
          })
            .then((res) => {
              if (!res.ok) {
                console.error(
                  `[stripe] provisioning kickoff non-OK for ${restaurantId}: ${res.status}`
                );
              } else {
                console.log(`[stripe] provisioning kicked off for ${restaurantId}`);
              }
            })
            .catch((e) => {
              console.error(`[stripe] provisioning kickoff failed for ${restaurantId}:`, e);
            });
        }
        break;
      }

      // ───────── Plan change / status change (tier upgrades, pauses) ─────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToRestaurant(supabase, subscription);
        console.log(
          `[${t0}] [stripe] subscription ${subscription.id} synced (status ${subscription.status})`
        );
        break;
      }

      // ───────── Full cancellation ─────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('restaurants')
          .update({
            stripe_subscription_id: null,
            plan_tier: null,
            subscription_status: 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id);
        console.log(
          `[${t0}] [stripe] subscription ${subscription.id} canceled — plan cleared`
        );
        break;
      }

      // ───────── Monthly renewal succeeded ─────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          // Re-pull the sub to pick up the new current_period_end.
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToRestaurant(supabase, subscription);
          console.log(
            `[${t0}] [stripe] invoice paid — sub ${subscriptionId} renewed, status ${subscription.status}`
          );
        }
        break;
      }

      // ───────── Renewal payment failed — enter dunning ─────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          await supabase
            .from('restaurants')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);
          console.error(
            `[${t0}] [stripe] invoice payment failed — sub ${subscriptionId} marked past_due (attempt ${invoice.attempt_count})`
          );
          // TODO(ops): queue a dunning email here once Resend templates are in place.
        }
        break;
      }

      // ───────── Trial ending soon (3-day heads-up from Stripe) ─────────
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(
          `[${t0}] [stripe] trial ending soon for sub ${subscription.id} — send reminder`
        );
        // TODO(ops): queue trial-ending email here.
        break;
      }

      default:
        // Unhandled event — log at debug, not error.
        console.log(`[${t0}] [stripe] unhandled event type ${event.type}`);
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
