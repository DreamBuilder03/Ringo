import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { stubMenuFor } from '@/lib/demo-menu';

// Creates a Retell Web Call for the visitor's demo.
// Extends the legacy /api/demo-call route with: real Google Places data, bilingual support,
// a stub menu by cuisine, lead record linking, and a returning access_token for the Web SDK.

interface Body {
  leadId?: string;
  language?: 'en' | 'es' | 'multi';
  // Restaurant context (from places/details)
  restaurantName: string;
  cuisineType?: string;
  address?: string;
  phone?: string;
  hours?: string[] | null;
  // Lead context
  customerName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const {
      leadId,
      language = 'en',
      restaurantName,
      cuisineType = 'Restaurant',
      address,
      phone,
      hours,
      customerName,
    } = body;

    if (!restaurantName) {
      return NextResponse.json({ error: 'restaurantName is required' }, { status: 400 });
    }

    const apiKey = process.env.RETELL_API_KEY;
    const agentId = process.env.RETELL_DEMO_AGENT_ID;

    // Dev fallback: let the UI work without live Retell keys during local dev.
    if (!apiKey || apiKey === 'placeholder' || !agentId || agentId === 'placeholder') {
      console.warn('[demo/create-session] Retell not configured — returning demo_mode token');
      return NextResponse.json({
        access_token: 'demo_mode',
        demo_mode: true,
        call_id: null,
      });
    }

    const dynamicVars = {
      restaurant_name: restaurantName,
      cuisine_type: cuisineType,
      address: address || '',
      phone: phone || '',
      hours_today: (hours && hours[new Date().getDay()]) || '',
      customer_name: customerName || '',
      stub_menu: stubMenuFor(restaurantName, cuisineType),
      demo_mode: 'true',
    };

    const retellRes = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        metadata: { lead_id: leadId || null, source: 'website_demo', language },
        retell_llm_dynamic_variables: dynamicVars,
      }),
    });

    if (!retellRes.ok) {
      const text = await retellRes.text();
      console.error('[demo/create-session] Retell error', retellRes.status, text);
      return NextResponse.json(
        { error: `Retell error: ${retellRes.status}` },
        { status: 502 }
      );
    }

    const data = (await retellRes.json()) as { access_token: string; call_id?: string };

    // Best-effort: attach the web-call id to the lead row so we can correlate transcripts later.
    if (leadId && data.call_id) {
      try {
        const supabase = await createServiceRoleClient();
        await supabase
          .from('demo_leads')
          .update({
            retell_web_call_id: data.call_id,
            demo_language: language,
            demo_started_at: new Date().toISOString(),
            status: 'demo_ready',
          })
          .eq('id', leadId);
      } catch (err) {
        console.error('[demo/create-session] lead update failed (non-fatal)', err);
      }
    }

    return NextResponse.json({
      access_token: data.access_token,
      call_id: data.call_id || null,
      demo_mode: false,
    });
  } catch (err) {
    console.error('[demo/create-session] exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
