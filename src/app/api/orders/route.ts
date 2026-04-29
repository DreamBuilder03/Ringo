import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// POST: Create a new pending order (called from Retell webhook)
export async function POST(req: NextRequest) {
  // Rate limit at TOOL tier — called by our own Retell webhook flow.
  const blocked = await checkRateLimit(req, 'TOOL');
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { restaurant_id, call_id, customer_phone, items, subtotal, tax, total } = body;

    if (!restaurant_id || !customer_phone || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id,
        call_id,
        customer_phone,
        items,
        subtotal: subtotal || total,
        tax: tax || 0,
        total,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error(`[${new Date().toISOString()}] Order creation error:`, error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    console.log(`[${new Date().toISOString()}] Order created: ${order.id} for restaurant ${restaurant_id}`);

    return NextResponse.json({ order });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Order API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Fetch order by ID (for payment page)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, restaurants(name, phone, address)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Order fetch error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
