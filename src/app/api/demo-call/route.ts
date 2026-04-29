import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

interface CreateWebCallRequest {
  restaurantName: string;
  cuisineType: string;
  customerName?: string;
}

interface RetellWebCallResponse {
  access_token: string;
  call_id?: string;
}

interface DemoCallResponse {
  access_token: string;
  call_id?: string;
  demo_mode?: boolean;
}

export async function POST(req: NextRequest) {
  // Upstash rate limit at DEMO_CALL_CREATE tier (5/min/IP) — Retell calls
  // cost money; tight cap on demo creation prevents budget burn.
  const blocked = await checkRateLimit(req, 'DEMO_CALL_CREATE');
  if (blocked) return blocked;

  try {
    const body: CreateWebCallRequest = await req.json();
    const { restaurantName, cuisineType, customerName } = body;

    // Validate required fields
    if (!restaurantName || !cuisineType) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantName and cuisineType' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RETELL_API_KEY;
    const agentId = process.env.RETELL_DEMO_AGENT_ID;

    // Handle demo mode if API key is placeholder or missing
    if (!apiKey || apiKey === 'placeholder' || !agentId || agentId === 'placeholder') {
      console.warn(
        `[${new Date().toISOString()}] Demo mode: RETELL_API_KEY or RETELL_DEMO_AGENT_ID not configured`
      );
      return NextResponse.json({
        access_token: 'demo_mode',
        demo_mode: true,
      });
    }

    // Prepare the request payload for Retell's create-web-call API
    const payload = {
      agent_id: agentId,
      metadata: {
        restaurant_name: restaurantName,
        cuisine_type: cuisineType,
        ...(customerName && { customer_name: customerName }),
      },
      retell_llm_dynamic_variables: {
        restaurant_name: restaurantName,
        cuisine_type: cuisineType,
        ...(customerName && { customer_name: customerName }),
      },
    };

    // Call Retell's create-web-call API
    const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!retellResponse.ok) {
      const errorData = await retellResponse.text();
      console.error(
        `[${new Date().toISOString()}] Retell API error (${retellResponse.status}):`,
        errorData
      );
      return NextResponse.json(
        { error: `Failed to create web call: ${retellResponse.statusText}` },
        { status: retellResponse.status }
      );
    }

    const data: RetellWebCallResponse = await retellResponse.json();

    console.log(
      `[${new Date().toISOString()}] Demo call created for ${restaurantName} (${cuisineType}) - Call ID: ${data.call_id}`
    );

    return NextResponse.json({
      access_token: data.access_token,
      call_id: data.call_id,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Demo call API error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
