import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ──────────────────────────────────────────────────────────────────────────────
// /api/provisioning/create
// ──────────────────────────────────────────────────────────────────────────────
// Auto-provisions a restaurant after they subscribe. Three steps:
//
//   1) Buy a local Twilio phone number in the restaurant's area code
//   2) Clone the Ringo template Retell agent for this restaurant
//   3) Register the Twilio number with Retell, attaching it to the new agent
//
// Invoked either by the Stripe webhook after checkout.session.completed, or
// manually with { restaurant_id } by the admin tool.
//
// Requires these env vars:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
//   RETELL_API_KEY
//   RINGO_TEMPLATE_AGENT_ID  (the shared Ringo — Default Restaurant agent)
//   NEXT_PUBLIC_APP_URL
//
// Idempotent — rerunning against a restaurant that's already provisioned
// short-circuits with the existing numbers.

type Restaurant = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  ringo_phone_number: string | null;
  twilio_number_sid: string | null;
  retell_agent_id: string | null;
  retell_phone_number_id: string | null;
  provisioning_status: string | null;
};

// Extract a US area code from a number like "+12095551212" / "(209) 555-1212" / null.
// Falls back to "209" (Modesto) if we can't parse one — better than failing provisioning.
function areaCodeFrom(raw: string | null | undefined): string {
  if (!raw) return '209';
  const digits = String(raw).replace(/\D/g, '');
  // +1 AAA NNN NNNN → 11 digits starting with 1; pick digits 2-4
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1, 4);
  if (digits.length === 10) return digits.slice(0, 3);
  return '209';
}

async function twilioBuyLocalNumber(areaCode: string): Promise<{
  phoneNumber: string;
  sid: string;
}> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai';
  if (!accountSid || !authToken) {
    throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  }
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  // Step 1: search available numbers in the area code
  const searchUrl = new URL(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json`
  );
  searchUrl.searchParams.set('AreaCode', areaCode);
  searchUrl.searchParams.set('SmsEnabled', 'true');
  searchUrl.searchParams.set('VoiceEnabled', 'true');
  searchUrl.searchParams.set('PageSize', '1');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!searchRes.ok) {
    throw new Error(`Twilio search failed: ${searchRes.status} ${await searchRes.text()}`);
  }
  const searchData = (await searchRes.json()) as {
    available_phone_numbers?: Array<{ phone_number: string }>;
  };
  const phoneNumber = searchData.available_phone_numbers?.[0]?.phone_number;
  if (!phoneNumber) {
    throw new Error(`No Twilio numbers available in area code ${areaCode}`);
  }

  // Step 2: purchase it. We'll wire it to Retell in step 3 below, but we
  // can set a safe fallback VoiceUrl now so the number isn't silent during
  // the few seconds between purchase and Retell attachment.
  const buyBody = new URLSearchParams({
    PhoneNumber: phoneNumber,
    FriendlyName: `Ringo — provisioned ${new Date().toISOString()}`,
    VoiceUrl: `${appUrl}/api/twilio/voice-fallback`,
    VoiceMethod: 'POST',
  });
  const buyRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: buyBody.toString(),
    }
  );
  if (!buyRes.ok) {
    throw new Error(`Twilio buy failed: ${buyRes.status} ${await buyRes.text()}`);
  }
  const buyData = (await buyRes.json()) as { sid: string; phone_number: string };
  return { phoneNumber: buyData.phone_number, sid: buyData.sid };
}

async function retellCloneAgent(params: {
  restaurantName: string;
  restaurantId: string;
}): Promise<{ agentId: string }> {
  const apiKey = process.env.RETELL_API_KEY;
  const templateId = process.env.RINGO_TEMPLATE_AGENT_ID;
  if (!apiKey) throw new Error('Missing RETELL_API_KEY');
  if (!templateId) throw new Error('Missing RINGO_TEMPLATE_AGENT_ID');

  // Step 1: fetch the template so we inherit voice, LLM config, tools, etc.
  const getRes = await fetch(`https://api.retellai.com/get-agent/${templateId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!getRes.ok) {
    throw new Error(`Retell get-agent failed: ${getRes.status} ${await getRes.text()}`);
  }
  const template = (await getRes.json()) as Record<string, unknown>;

  // Step 2: build a POST body — strip read-only fields and rename.
  // Retell rejects create-agent payloads that include any version-tracking
  // field with value > 0, plus other server-managed fields that only exist
  // on persisted agents. Strip them all defensively.
  const body = { ...template } as Record<string, unknown>;
  delete body.agent_id;
  delete body.last_modification_timestamp;
  delete body.is_published;
  delete body.version;
  delete body.agent_version;
  delete body.version_title;
  delete body.published_version;
  delete body.last_published_version;
  delete body.created_at;
  delete body.updated_at;
  delete body.channel;
  delete body.response_engine_version;
  // Recursive scrub: Retell nests `version` inside response_engine
  // ({type, llm_id, version}) and other sub-objects. Strip any key matching
  // /version|timestamp/i at any depth.
  const scrub = (val: unknown): void => {
    if (Array.isArray(val)) {
      for (const item of val) scrub(item);
      return;
    }
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (/version|timestamp/i.test(key)) {
          delete obj[key];
        } else {
          scrub(obj[key]);
        }
      }
    }
  };
  scrub(body);
  body.agent_name = `${params.restaurantName} — Ringo`;
  // Stamp metadata so we can find the agent later
  body.metadata = {
    ringo_restaurant_id: params.restaurantId,
    cloned_from: templateId,
    cloned_at: new Date().toISOString(),
  };

  const createRes = await fetch('https://api.retellai.com/create-agent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!createRes.ok) {
    throw new Error(`Retell create-agent failed: ${createRes.status} ${await createRes.text()}`);
  }
  const created = (await createRes.json()) as { agent_id: string };
  return { agentId: created.agent_id };
}

async function retellRegisterPhoneNumber(params: {
  twilioPhoneNumber: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  agentId: string;
}): Promise<{ retellPhoneNumberId: string }> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error('Missing RETELL_API_KEY');

  const res = await fetch('https://api.retellai.com/create-phone-number', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: params.twilioPhoneNumber,
      termination_uri: undefined, // Retell imports the Twilio number via these creds:
      inbound_agent_id: params.agentId,
      nickname: `Ringo ${params.twilioPhoneNumber}`,
      // Retell's import-Twilio-number endpoint accepts these auth params:
      twilio_account_sid: params.twilioAccountSid,
      twilio_auth_token: params.twilioAuthToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Retell create-phone-number failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { phone_number: string; phone_number_id?: string };
  return { retellPhoneNumberId: data.phone_number_id || data.phone_number };
}

export async function POST(req: NextRequest) {
  const t0 = new Date().toISOString();
  try {
    const body = (await req.json().catch(() => ({}))) as { restaurant_id?: string };
    const restaurantId = body.restaurant_id;
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Mark in_progress
    await supabase
      .from('restaurants')
      .update({ provisioning_status: 'in_progress', provisioning_error: null })
      .eq('id', restaurantId);

    const { data: restaurant, error: lookupErr } = await supabase
      .from('restaurants')
      .select(
        'id, name, phone, address, ringo_phone_number, twilio_number_sid, retell_agent_id, retell_phone_number_id, provisioning_status'
      )
      .eq('id', restaurantId)
      .single();

    if (lookupErr || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    const r = restaurant as Restaurant;

    // Idempotency — if already provisioned, return what we have
    if (r.ringo_phone_number && r.retell_agent_id && r.retell_phone_number_id) {
      await supabase
        .from('restaurants')
        .update({ provisioning_status: 'succeeded' })
        .eq('id', restaurantId);
      return NextResponse.json({
        success: true,
        already_provisioned: true,
        ringo_phone_number: r.ringo_phone_number,
        retell_agent_id: r.retell_agent_id,
      });
    }

    // Step 1 — Twilio number (skip if we already have one)
    let twilioPhoneNumber = r.ringo_phone_number;
    let twilioNumberSid = r.twilio_number_sid;
    if (!twilioPhoneNumber || !twilioNumberSid) {
      const areaCode = areaCodeFrom(r.phone);
      const bought = await twilioBuyLocalNumber(areaCode);
      twilioPhoneNumber = bought.phoneNumber;
      twilioNumberSid = bought.sid;
      await supabase
        .from('restaurants')
        .update({
          ringo_phone_number: twilioPhoneNumber,
          twilio_number_sid: twilioNumberSid,
        })
        .eq('id', restaurantId);
      console.log(`[${t0}] [provisioning] Twilio ${twilioPhoneNumber} (${twilioNumberSid}) bought for ${restaurantId}`);
    }

    // Step 2 — Retell agent
    let retellAgentId = r.retell_agent_id;
    if (!retellAgentId) {
      const { agentId } = await retellCloneAgent({
        restaurantName: r.name,
        restaurantId: r.id,
      });
      retellAgentId = agentId;
      await supabase
        .from('restaurants')
        .update({ retell_agent_id: retellAgentId })
        .eq('id', restaurantId);
      console.log(`[${t0}] [provisioning] Retell agent ${retellAgentId} created for ${restaurantId}`);
    }

    // Step 3 — Register Twilio number with Retell, pointing at the new agent
    let retellPhoneNumberId = r.retell_phone_number_id;
    if (!retellPhoneNumberId) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const registered = await retellRegisterPhoneNumber({
        twilioPhoneNumber: twilioPhoneNumber!,
        twilioAccountSid: accountSid,
        twilioAuthToken: authToken,
        agentId: retellAgentId,
      });
      retellPhoneNumberId = registered.retellPhoneNumberId;
      await supabase
        .from('restaurants')
        .update({ retell_phone_number_id: retellPhoneNumberId })
        .eq('id', restaurantId);
      console.log(`[${t0}] [provisioning] Retell phone ${retellPhoneNumberId} linked for ${restaurantId}`);
    }

    await supabase
      .from('restaurants')
      .update({
        provisioned_at: new Date().toISOString(),
        provisioning_status: 'succeeded',
        pos_connected: true,
      })
      .eq('id', restaurantId);

    return NextResponse.json({
      success: true,
      ringo_phone_number: twilioPhoneNumber,
      retell_agent_id: retellAgentId,
      retell_phone_number_id: retellPhoneNumberId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${t0}] [provisioning] failed`, msg);
    // Best-effort: mark failure on the row if we have the id
    try {
      const body = await req.clone().json().catch(() => ({}));
      const id = (body as { restaurant_id?: string }).restaurant_id;
      if (id) {
        const supabase = await createServiceRoleClient();
        await supabase
          .from('restaurants')
          .update({ provisioning_status: 'failed', provisioning_error: msg })
          .eq('id', id);
      }
    } catch {
      /* ignore */
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
