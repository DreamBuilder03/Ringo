import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// Clover environment detection
// Default to sandbox in development; flip CLOVER_ENVIRONMENT=production to go live.
function cloverEnv(): 'sandbox' | 'production' {
  return (process.env.CLOVER_ENVIRONMENT === 'production' ? 'production' : 'sandbox');
}

function cloverOAuthBase(env: 'sandbox' | 'production'): string {
  return env === 'production'
    ? 'https://clover.com'
    : 'https://sandbox.dev.clover.com';
}

function cloverApiBase(env: 'sandbox' | 'production'): string {
  return env === 'production'
    ? 'https://api.clover.com'
    : 'https://apisandbox.dev.clover.com';
}

// ──────────────────────────────────────────────────────────────────
// GET — OAuth callback
// ──────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Rate limit at AUTH tier — defends against bogus-code spam.
  const blocked = await checkRateLimit(request, 'AUTH');
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // restaurant_id
  // Clover returns merchant_id in the callback query string
  const merchantIdFromCallback = searchParams.get('merchant_id');

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`
    );
  }

  try {
    const cloverAppId = process.env.CLOVER_APP_ID;
    const cloverAppSecret = process.env.CLOVER_APP_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!cloverAppId || !cloverAppSecret || !appUrl) {
      throw new Error('Missing Clover OAuth configuration');
    }

    const env = cloverEnv();

    // Exchange code for access token
    const tokenResponse = await fetch(`${cloverOAuthBase(env)}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cloverAppId,
        client_secret: cloverAppSecret,
        code,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Clover token exchange failed:', errorData);
      throw new Error('Failed to exchange Clover OAuth code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string | undefined = tokenData.access_token;
    // Clover may return merchant_id in the token response OR in the original callback URL
    const merchantId: string | undefined =
      tokenData.merchant_id || merchantIdFromCallback || undefined;

    if (!accessToken) {
      throw new Error('No access token in Clover response');
    }
    if (!merchantId) {
      console.warn(
        '[clover/oauth] Missing merchant_id — order push will fail until it is set'
      );
    }

    // Persist per-restaurant Clover credentials
    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        pos_type: 'clover',
        pos_connected: true,
        clover_access_token: accessToken,
        clover_merchant_id: merchantId ?? null,
        clover_environment: env,
      })
      .eq('id', state);

    if (updateError) {
      console.error('Failed to update restaurant:', updateError);
      throw updateError;
    }

    console.log(
      `[${new Date().toISOString()}] Clover connected for restaurant ${state} (merchant ${merchantId ?? 'unknown'}, env ${env})`
    );

    return NextResponse.redirect(
      `${appUrl}/settings?success=clover_connected`
    );
  } catch (error) {
    console.error('Clover OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=clover_failed`
    );
  }
}

// ──────────────────────────────────────────────────────────────────
// POST — push a OMRI order into Clover
// ──────────────────────────────────────────────────────────────────
// Body: { restaurant_id: string; order_id?: string; items: Array<{ name, quantity, price }>; total?: number }
// Price is in dollars (e.g. 9.99). Clover wants cents.
export async function POST(request: NextRequest) {
  const t0 = new Date().toISOString();
  // Rate limit at POS tier — internal call from our own webhook.
  const blocked = await checkRateLimit(request, 'POS');
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const {
      restaurant_id,
      order_id,
      items,
      total: _total,
    }: {
      restaurant_id?: string;
      order_id?: string;
      items?: Array<{ name: string; quantity?: number; price?: number }>;
      total?: number;
    } = body || {};

    if (!restaurant_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurant_id, items[]' },
        { status: 400 }
      );
    }

    // Look up Clover creds for this restaurant. Use service role so tool-route
    // callers (which run with no auth cookie) can push orders.
    const supabase = await createServiceRoleClient();
    const { data: restaurant, error: lookupErr } = await supabase
      .from('restaurants')
      .select('id, name, clover_access_token, clover_merchant_id, clover_environment, pos_type, pos_connected')
      .eq('id', restaurant_id)
      .single();

    if (lookupErr || !restaurant) {
      console.error(`[${t0}] [clover] restaurant lookup failed`, lookupErr);
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const accessToken = (restaurant as { clover_access_token?: string }).clover_access_token;
    const merchantId = (restaurant as { clover_merchant_id?: string }).clover_merchant_id;
    const env = ((restaurant as { clover_environment?: string }).clover_environment as
      | 'sandbox'
      | 'production'
      | undefined) || cloverEnv();

    if (!accessToken || !merchantId) {
      console.warn(
        `[${t0}] [clover] skipping order push — restaurant ${restaurant_id} missing Clover creds`
      );
      return NextResponse.json({
        success: true,
        warning:
          'Clover not connected for this restaurant. Order not pushed to POS.',
      });
    }

    const apiBase = cloverApiBase(env);
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Step 1 — create an empty order in state "open" with a OMRI note so it's
    // obvious on the KDS where it came from.
    const ringoNote = order_id
      ? `OMRI order ${order_id.slice(0, 8)} — voice order`
      : 'OMRI voice order';

    const createRes = await fetch(
      `${apiBase}/v3/merchants/${merchantId}/orders`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          state: 'open',
          note: ringoNote,
          // Clover doesn't have a dedicated metadata object on orders;
          // external_reference_id is the closest thing, it's searchable.
          externalReferenceId: order_id ? `omri-${order_id}` : undefined,
        }),
      }
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error(`[${t0}] [clover] create order failed`, createRes.status, text);
      return NextResponse.json(
        { error: 'Failed to create Clover order', details: text },
        { status: 502 }
      );
    }

    const createdOrder = (await createRes.json()) as { id?: string };
    const cloverOrderId = createdOrder.id;
    if (!cloverOrderId) {
      return NextResponse.json(
        { error: 'Clover did not return an order id' },
        { status: 502 }
      );
    }

    // Step 2 — add one line item per item. Quantity is expressed by
    // posting the line item N times (Clover's public v3 endpoint requires
    // separate line items for quantities unless you attach an item id
    // from the merchant's inventory, which we don't have for AI orders).
    const lineItemsCreated: Array<{ name: string; clover_id?: string }> = [];
    const lineItemErrors: Array<{ name: string; error: string }> = [];

    for (const item of items) {
      const name = String(item.name || '').slice(0, 127) || 'Item';
      const qty = Math.max(1, Math.floor(item.quantity ?? 1));
      const priceCents = Math.round(Number(item.price ?? 0) * 100);

      for (let i = 0; i < qty; i++) {
        try {
          const liRes = await fetch(
            `${apiBase}/v3/merchants/${merchantId}/orders/${cloverOrderId}/line_items`,
            {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                name,
                price: priceCents,
                note: 'via OMRI',
              }),
            }
          );
          if (!liRes.ok) {
            const text = await liRes.text();
            lineItemErrors.push({ name, error: text });
            console.error(`[${t0}] [clover] line item ${name} failed`, liRes.status, text);
          } else {
            const li = (await liRes.json()) as { id?: string };
            lineItemsCreated.push({ name, clover_id: li.id });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          lineItemErrors.push({ name, error: msg });
          console.error(`[${t0}] [clover] line item ${name} exception`, msg);
        }
      }
    }

    // Step 3 — stamp the OMRI orders row so we can correlate later
    if (order_id) {
      try {
        await supabase
          .from('orders')
          .update({
            pos_order_id: cloverOrderId,
            pos_pushed_at: new Date().toISOString(),
          })
          .eq('id', order_id);
      } catch (e) {
        console.error(`[${t0}] [clover] orders row update failed`, e);
      }
    }

    console.log(
      `[${t0}] [clover] order ${cloverOrderId} created for restaurant ${restaurant_id} — ${lineItemsCreated.length} line items, ${lineItemErrors.length} errors`
    );

    return NextResponse.json({
      success: lineItemErrors.length === 0,
      clover_order_id: cloverOrderId,
      line_items_created: lineItemsCreated.length,
      line_item_errors: lineItemErrors,
      environment: env,
    });
  } catch (error) {
    console.error('Clover order push error:', error);
    return NextResponse.json(
      { error: 'Failed to push order to Clover' },
      { status: 500 }
    );
  }
}
