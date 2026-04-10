import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST: Create a new restaurant (admin only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, address, phone, pos_type, retell_agent_id, owner_email } = body;

    if (!name || !address || !phone) {
      return NextResponse.json({ error: 'Missing required fields (name, address, phone)' }, { status: 400 });
    }

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
