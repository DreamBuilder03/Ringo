import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// POST /api/demo/leads — upsert a demo lead row.
// Accepts a partial payload + optional leadId. If leadId is present we UPDATE, otherwise we INSERT.
// The flow progresses through: started → confirmed → qualified → demo_ready → demo_completed.

const ALLOWED = [
  'place_id', 'restaurant_name', 'restaurant_address', 'restaurant_phone',
  'restaurant_website', 'cuisine_type', 'hours', 'rating', 'photo_url',
  'locations_count', 'pos_system', 'features_interested',
  'full_name', 'phone', 'email',
  'retell_web_call_id', 'demo_language',
  'status', 'utm',
] as const;

type Allowed = (typeof ALLOWED)[number];

export async function POST(req: NextRequest) {
  // Rate limit at DEMO_PUBLIC tier — public lead capture.
  const blocked = await checkRateLimit(req, 'DEMO_PUBLIC');
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { leadId, ...fields } = body || {};

    const clean: Record<string, unknown> = {};
    for (const k of ALLOWED) {
      if (k in fields && fields[k] !== undefined) clean[k] = fields[k as Allowed];
    }

    const supabase = await createServiceRoleClient();

    if (leadId) {
      const { data, error } = await supabase
        .from('demo_leads')
        .update(clean)
        .eq('id', leadId)
        .select('id, status')
        .single();
      if (error) {
        console.error('[demo/leads] update error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ leadId: data.id, status: data.status });
    }

    const { data, error } = await supabase
      .from('demo_leads')
      .insert({ ...clean, status: clean.status || 'started' })
      .select('id, status')
      .single();
    if (error) {
      console.error('[demo/leads] insert error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ leadId: data.id, status: data.status });
  } catch (err) {
    console.error('[demo/leads] exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
