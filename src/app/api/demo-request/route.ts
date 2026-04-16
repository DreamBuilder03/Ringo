import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ max: 5, windowMs: 60_000, message: 'Too many demo requests — please wait a moment.' });

export async function POST(req: NextRequest) {
  const blocked = limiter(req);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { restaurantName, email } = body;

    // Validate required fields
    if (!restaurantName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantName and email' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Insert demo request into the database
    const { data, error } = await supabase
      .from('demo_requests')
      .insert({
        restaurant_name: restaurantName,
        email,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Handle gracefully if table doesn't exist
    if (error) {
      console.error(`[${new Date().toISOString()}] Demo request error:`, error);

      // If the table doesn't exist, still return success to not break UX
      if (error.code === '42P01') {
        console.warn(`[${new Date().toISOString()}] demo_requests table does not exist, but request was valid`);
        return NextResponse.json({
          success: true,
          message: 'Demo request received',
          note: 'Table creation pending',
        });
      }

      return NextResponse.json({ error: 'Failed to store demo request' }, { status: 500 });
    }

    console.log(
      `[${new Date().toISOString()}] Demo request created for ${restaurantName} (${email})`
    );

    return NextResponse.json({
      success: true,
      message: 'Demo request submitted successfully',
      id: data?.id,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Demo request API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
