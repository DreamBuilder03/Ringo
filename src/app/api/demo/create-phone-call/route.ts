import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Outbound phone-call variant: Ringo dials the visitor's cell (Loman + edge).
// Uses Retell's create-phone-call endpoint with dynamic variables so the agent adapts
// to the caller's restaurant in real time.

function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  if (raw.startsWith('+') && d.length >= 10) return `+${d}`;
  return null;
}

function stubMenuFor(cuisine: string): string {
  const c = (cuisine || '').toLowerCase();
  if (c.includes('pizza')) return 'Cheese Pizza $12, Pepperoni Pizza $14, Supreme Pizza $17, Garlic Knots $6, Caesar Salad $8';
  if (c.includes('mexican') || c.includes('taco')) return 'Carne Asada Taco $4.50, Chicken Burrito $11, Chips & Salsa $5, Quesadilla $9, Horchata $3';
  if (c.includes('chinese')) return 'General Tso Chicken $13, Beef & Broccoli $14, Vegetable Fried Rice $9, Egg Rolls $5, Wonton Soup $6';
  if (c.includes('sushi') || c.includes('japan')) return 'California Roll $8, Spicy Tuna Roll $10, Salmon Nigiri $6, Miso Soup $4, Edamame $5';
  if (c.includes('burger') || c.includes('american')) return 'Classic Cheeseburger $12, Bacon Burger $14, Chicken Sandwich $11, Fries $5, Milkshake $6';
  if (c.includes('indian')) return 'Chicken Tikka Masala $15, Lamb Vindaloo $16, Garlic Naan $3, Samosa $5, Mango Lassi $4';
  if (c.includes('thai')) return 'Pad Thai $13, Green Curry $14, Tom Yum Soup $7, Spring Rolls $6, Thai Iced Tea $4';
  if (c.includes('coffee') || c.includes('cafe') || c.includes('bakery')) return 'Latte $5, Cappuccino $4.50, Croissant $4, Avocado Toast $11, Chocolate Chip Cookie $3';
  return 'House Burger $12, Caesar Salad $9, Chicken Tenders $10, Fries $5, Chocolate Shake $6';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      language = 'en',
      restaurantName,
      cuisineType = 'Restaurant',
      address,
      phone,
      hours,
      toNumber,
    } = body;

    if (!restaurantName) return NextResponse.json({ error: 'restaurantName required' }, { status: 400 });
    const toE = toE164(toNumber || '');
    if (!toE) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });

    const apiKey = process.env.RETELL_API_KEY;
    const agentId = process.env.RETELL_DEMO_AGENT_ID;
    const fromNumber = process.env.RETELL_DEMO_FROM_NUMBER || '+12098212457';

    if (!apiKey || !agentId) {
      return NextResponse.json(
        { error: 'Demo voice not configured yet (RETELL_API_KEY / RETELL_DEMO_AGENT_ID).' },
        { status: 500 }
      );
    }

    const dynamicVars = {
      restaurant_name: restaurantName,
      cuisine_type: cuisineType,
      address: address || '',
      phone: phone || '',
      hours_today: (Array.isArray(hours) && hours[new Date().getDay()]) || '',
      stub_menu: stubMenuFor(cuisineType),
      demo_mode: 'true',
    };

    const retellRes = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: fromNumber,
        to_number: toE,
        override_agent_id: agentId,
        metadata: { lead_id: leadId || null, source: 'website_demo_outbound', language },
        retell_llm_dynamic_variables: dynamicVars,
      }),
    });

    if (!retellRes.ok) {
      const text = await retellRes.text();
      console.error('[demo/create-phone-call] Retell error', retellRes.status, text);
      return NextResponse.json({ error: 'Call could not be placed. Try again.' }, { status: 502 });
    }

    const data = (await retellRes.json()) as { call_id?: string; call_status?: string };

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
            phone: toE,
          })
          .eq('id', leadId);
      } catch (e) {
        console.error('[demo/create-phone-call] lead update failed', e);
      }
    }

    return NextResponse.json({ call_id: data.call_id || null, status: data.call_status || 'registered' });
  } catch (err) {
    console.error('[demo/create-phone-call] exception', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
