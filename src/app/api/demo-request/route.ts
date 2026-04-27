import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';
import { demoRequestSchema } from '@/lib/schemas/demo';

export async function POST(req: NextRequest) {
  // Upstash rate limit (DEMO_PUBLIC tier — 30/min/IP).
  const blocked = await checkRateLimit(req, 'DEMO_PUBLIC');
  if (blocked) return blocked;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const parsed = demoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed.',
          details: parsed.error.issues.map((i: any) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }
    const { restaurantName, email } = parsed.data;

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
