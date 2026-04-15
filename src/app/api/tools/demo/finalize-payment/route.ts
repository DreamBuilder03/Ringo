import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Demo-only finalize-payment tool for the Ringo Website Demo agent.
// The production /api/tools/finalize-payment route looks up restaurants by retell_agent_id;
// the demo agent isn't in the restaurants table, so that route 404s before it can SMS.
// This route bypasses Square (no real charge), looks up the demo_leads row by call metadata,
// and sends a polished demo SMS via /api/sms (GHL → Twilio fallback).

interface RetellRequest {
  call: {
    call_id: string;
    agent_id: string;
    metadata?: { lead_id?: string; source?: string; language?: string };
    [key: string]: unknown;
  };
  args: {
    customer_phone?: string;
    phone?: string;
    customer_name?: string;
    name?: string;
    items?: Array<{ name: string; price?: number; quantity?: number }>;
    total_amount?: number;
    total?: number;
  };
}

function toE164(raw: string): string {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  if (raw?.startsWith('+') && d.length >= 10) return `+${d}`;
  return raw;
}

function summarizeItems(items?: Array<{ name: string; price?: number; quantity?: number }>): string {
  if (!items || items.length === 0) return 'your order';
  return items
    .map((i) => {
      const qty = i.quantity && i.quantity > 1 ? `${i.quantity}x ` : '';
      return `${qty}${i.name}`;
    })
    .join(', ');
}

function computeTotal(args: RetellRequest['args']): number {
  if (typeof args.total_amount === 'number') return args.total_amount;
  if (typeof args.total === 'number') return args.total;
  if (Array.isArray(args.items)) {
    return args.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
  }
  return 0;
}

export async function POST(req: NextRequest) {
  const t0 = new Date().toISOString();
  try {
    const body = (await req.json()) as RetellRequest;
    const { call, args } = body;

    const leadId = call?.metadata?.lead_id || null;
    const callId = call?.call_id || null;
    const customerPhone = args?.customer_phone || args?.phone || '';

    if (!customerPhone) {
      return NextResponse.json({
        result: "I didn't catch your phone number — could you say it again, digit by digit?",
      });
    }

    const phoneE = toE164(customerPhone);

    // Look up the lead — gives us restaurant name + visitor name.
    const supabase = await createServiceRoleClient();

    type LeadRow = {
      id: string;
      restaurant_name: string | null;
      full_name: string | null;
      phone: string | null;
      email: string | null;
    };
    let lead: LeadRow | null = null;
    if (leadId) {
      const { data } = await supabase
        .from('demo_leads')
        .select('id, restaurant_name, full_name, phone, email')
        .eq('id', leadId)
        .single();
      lead = (data as LeadRow | null) || null;
    }
    // Fallback: look up by retell_web_call_id
    if (!lead && callId) {
      const { data } = await supabase
        .from('demo_leads')
        .select('id, restaurant_name, full_name, phone, email')
        .eq('retell_web_call_id', callId)
        .single();
      lead = (data as LeadRow | null) || null;
    }

    const restaurantName = lead?.restaurant_name || 'your restaurant';
    const callerName = (args.customer_name || args.name || lead?.full_name || '').split(' ')[0];
    const itemsSummary = summarizeItems(args.items);
    const total = computeTotal(args);
    const totalStr = total > 0 ? `$${total.toFixed(2)}` : '';

    // Polished demo SMS — clearly labeled as a demo so we don't deceive recipients.
    const greeting = callerName ? `Hey ${callerName}!` : 'Hey there!';
    const totalLine = totalStr ? ` Total: ${totalStr}.` : '';
    const message = `${greeting} This is Ringo's demo SMS — here's exactly what your customers would get after ordering at ${restaurantName}: "Your order is ready for payment! ${itemsSummary}.${totalLine} Pay here: https://demo.ringo.ai/pay/${(lead?.id || callId || 'demo').slice(0, 8)} — once paid, the kitchen starts your order." Like it? Set it up for real at https://useringo.ai/setup`;

    // Send via the shared /api/sms endpoint (GHL → Twilio fallback).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useringo.ai';
    let smsOk = false;
    let smsErr: string | null = null;
    try {
      const smsRes = await fetch(`${baseUrl}/api/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phoneE, message, type: 'demo_payment_link' }),
      });
      const smsData = await smsRes.json().catch(() => ({}));
      smsOk = smsRes.ok && smsData?.success !== false;
      if (!smsOk) smsErr = smsData?.error || `sms ${smsRes.status}`;
    } catch (e) {
      smsErr = e instanceof Error ? e.message : String(e);
    }

    // Mark the lead so we know the demo completed (best-effort).
    if (lead?.id) {
      try {
        await supabase
          .from('demo_leads')
          .update({
            status: 'demo_completed',
            phone: phoneE,
            demo_completed_at: new Date().toISOString(),
          })
          .eq('id', lead.id);
      } catch (e) {
        console.error('[demo/finalize-payment] lead update failed', e);
      }
    }

    if (!smsOk) {
      console.error(`[${t0}] [demo/finalize-payment] SMS send failed:`, smsErr);
      // Tell the agent something graceful to say — don't promise a text we didn't send.
      return NextResponse.json({
        result:
          "Looks like our demo texting line had a hiccup. In a real Ringo install, the payment link would already be on its way. Want me to email the demo summary instead?",
      });
    }

    console.log(`[${t0}] [demo/finalize-payment] SMS sent to ${phoneE} for lead ${lead?.id || 'unknown'}`);

    // Friendly success message — the agent will read this back to the caller.
    return NextResponse.json({
      result:
        "Sent! You should see the text in a few seconds. Once you'd pay it, the kitchen would start your order right away. Anything else I can help with?",
    });
  } catch (err) {
    console.error(`[${t0}] [demo/finalize-payment] exception`, err);
    return NextResponse.json({
      result:
        "Sorry — I hit a snag sending that. In a real Ringo install we'd retry automatically. Want to try one more time?",
    });
  }
}
