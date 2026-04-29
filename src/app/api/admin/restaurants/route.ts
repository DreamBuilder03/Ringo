import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { adminCreateRestaurantSchema } from '@/lib/schemas/admin';

// POST: Create a new restaurant (admin only)
export async function POST(req: NextRequest) {
  // Rate limit at PROVISIONING tier (5/min) — admin-only operation that
  // touches Twilio (paid number purchase) + Retell agent creation.
  const blocked = await checkRateLimit(req, 'PROVISIONING');
  if (blocked) return blocked;

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    const parsed = adminCreateRestaurantSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed.',
          details: parsed.error.issues.map((i: any) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }
    const { name, address, phone, pos_type, retell_agent_id, owner_email } = parsed.data;

    const supabase = await createServiceRoleClient();

    // If owner_email provided, look up or create the owner user profile
    let ownerUserId: string | null = null;

    if (owner_email) {
      // Check if user already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', owner_email)
        .single();

      if (existingProfile) {
        ownerUserId = existingProfile.id;
      }
      // If no existing profile, the restaurant will be created without an owner
      // The owner can be assigned later when they sign up
    }

    // Insert the restaurant
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name,
        address,
        phone,
        pos_type: pos_type || 'none',
        pos_connected: false,
        retell_agent_id: retell_agent_id || null,
        owner_user_id: ownerUserId,
        plan_tier: null,
      })
      .select()
      .single();

    if (error) {
      console.error(`[${new Date().toISOString()}] Restaurant creation error:`, error);
      return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
    }

    console.log(`[${new Date().toISOString()}] Restaurant created: ${restaurant.id} — ${name}`);

    return NextResponse.json({ restaurant });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: List all restaurants (admin only)
export async function GET() {
  try {
    const supabase = await createServiceRoleClient();

    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }

    return NextResponse.json({ restaurants });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
