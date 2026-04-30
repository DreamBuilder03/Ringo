// ──────────────────────────────────────────────────────────────────────────────
// /api/tools/request-handoff — agent escalation tool (C-4).
//
// When the agent isn't sure it can handle a call, it calls this with a reason
// and a short summary. We:
//   1. Insert a row in handoff_requests (forensic trail).
//   2. Page the founder/owner via sendFounderAlert (SMS + email — uses the
//      existing alerts.ts dedupe + rate-cap so we don't carpet-bomb).
//   3. Return a speakable confirmation so the agent can tell the caller
//      "Got it, someone will call you right back."
//
// All error branches return 200 with a speakable fallback. Retell goes silent
// on non-2xx (see lookup-item route comment for the call_d920aad6087e... root
// cause). The agent NEVER gets a hard failure on this tool.
//
// See docs/handoff/agent-escalation.md for reason taxonomy + Retell tool schema.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFounderAlert } from '@/lib/alerts';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { requestHandoffSchema } from '@/lib/schemas/tools';

// Prettier label for SMS bodies.
function reasonLabel(reason: string): string {
  switch (reason) {
    case 'menu_confusion': return 'menu confusion';
    case 'allergy_request': return 'allergy / dietary request';
    case 'complaint': return 'complaint';
    case 'refund_request': return 'refund request';
    case 'caller_request': return 'caller asked for a person';
    case 'large_order': return 'large / catering order';
    case 'agent_uncertainty': return 'agent uncertainty';
    default: return reason.replace(/_/g, ' ');
  }
}

export async function POST(request: NextRequest) {
  // Rate limit + Zod validation. Returns 200 + speakable on any failure
  // (see with-retell-validation.ts).
  const check = await validateRetellBody(request, requestHandoffSchema, 'request-handoff');
  if (!check.ok) return check.response;

  const callId: string | undefined = check.callId;

  try {
    const { call, args } = check.body;
    const { reason, summary, uncertainty_score, callback_phone } = args;

    if (!call?.agent_id) {
      // Should be unreachable since the schema requires call.agent_id, but
      // belt-and-suspenders. Speakable so the call doesn't freeze.
      return NextResponse.json(
        { result: "Got it — let me make sure someone gets back to you." },
        { status: 200 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Look up restaurant by agent_id (English or Spanish).
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name')
      .or(`retell_agent_id.eq.${call.agent_id},retell_agent_id_es.eq.${call.agent_id}`)
      .single();

    if (!restaurant) {
      // Demo / unknown agent — still acknowledge to the caller. No alert
      // (we don't know who to escalate to) but log so we can spot mis-routes.
      console.warn(
        `[${new Date().toISOString()}] request-handoff: unknown agent_id ${call.agent_id}`
      );
      return NextResponse.json(
        { result: "Got it — someone will reach out to you in a few minutes." },
        { status: 200 }
      );
    }

    // Caller's number: prefer agent's explicit override (rare), fall back to
    // call object's from_number (Retell typically populates this).
    const fromNumber =
      callback_phone ||
      ((call as { from_number?: string }).from_number ?? null);

    // ─── 1. Insert forensic row ────────────────────────────────────────────
    const { error: insertError } = await supabase.from('handoff_requests').insert({
      restaurant_id: restaurant.id,
      retell_call_id: callId ?? null,
      from_number: fromNumber,
      reason,
      summary: summary.slice(0, 500),
      agent_uncertainty_score: typeof uncertainty_score === 'number' ? uncertainty_score : null,
    });

    if (insertError) {
      // Logged; we still page so the owner doesn't miss it.
      console.error(
        `[${new Date().toISOString()}] request-handoff insert failed:`,
        insertError.message
      );
    }

    // ─── 2. Page the founder/owner ─────────────────────────────────────────
    // Build a dense one-liner for the SMS body. sendFounderAlert handles dedupe
    // + rate-cap, so even a chatty agent that fires this 5x in a call only
    // produces a manageable number of pages.
    const callerHint = fromNumber ? ` from ${fromNumber}` : '';
    const shortReason = `[${reasonLabel(reason)}] ${summary.slice(0, 120)}${callerHint}`;

    // Fire-and-forget — never await on a webhook hot path even though this is
    // a tool route (the agent is waiting on us speak the result).
    void sendFounderAlert({
      failureType: 'handoff_requested',
      restaurantId: restaurant.id,
      retellCallId: callId ?? null,
      shortReason,
      metadata: {
        reason,
        summary: summary.slice(0, 500),
        from_number: fromNumber,
        agent_id: call.agent_id,
        uncertainty_score: typeof uncertainty_score === 'number' ? uncertainty_score : null,
      },
    });

    // ─── 3. Speakable confirmation ─────────────────────────────────────────
    // The phrasing matches what the prompt template expects so prompts can
    // count on a stable hand-off line.
    return NextResponse.json({
      result:
        "Got it — I'll have someone from the team call you back in just a few minutes. " +
        "Is there anything else I can help with right now?",
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] request-handoff error:`, error);
    // Even in the catch, page the owner — the agent obviously thinks this
    // call needs human attention.
    void sendFounderAlert({
      failureType: 'handoff_requested',
      restaurantId: null,
      retellCallId: callId ?? null,
      shortReason: `request-handoff threw: ${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}`,
    });
    return NextResponse.json(
      { result: "Got it — someone will reach out to you shortly." },
      { status: 200 }
    );
  }
}
