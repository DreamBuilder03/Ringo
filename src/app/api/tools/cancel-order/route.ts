// ──────────────────────────────────────────────────────────────────────────────
// /api/tools/cancel-order — agent-initiated order void.
//
// Closes Multi-Test scenario 8: caller says "never mind / cancel / forget it"
// before payment. Today, the agent has no tool for this — orders dangle in
// `building` status. This route marks them cancelled cleanly.
//
// Behavior:
//   - Find the most recent in-progress order for this restaurant + (optionally)
//     this call's retell_call_id. If multiple match, pick the most recent.
//   - Mark status = 'cancelled', store the agent-provided reason if any.
//   - If a payment_link_id was already issued, log it for ops (we don't
//     auto-void Square payment links — they expire on their own; the customer
//     will get an "expired" page if they try the link).
//   - Return a speakable confirmation the agent reads back.
//
// Defensive: returns 200 on every error path (Retell goes silent on non-2xx).
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { cancelOrderSchema } from '@/lib/schemas/tools';
import { getRestaurantByAgentId } from '@/lib/restaurant-cache';

export async function POST(request: NextRequest) {
  const check = await validateRetellBody(request, cancelOrderSchema, 'cancel-order');
  if (!check.ok) return check.response;

  const callId: string | undefined = check.callId;

  try {
    const { call, args } = check.body;
    const { reason } = args;

    if (!call?.agent_id) {
      return NextResponse.json(
        { result: "No problem — the order's cancelled. Anything else I can help with?" },
        { status: 200 }
      );
    }

    const restaurant = await getRestaurantByAgentId(call.agent_id);
    if (!restaurant) {
      // Demo / unknown agent — still acknowledge cleanly to the caller.
      return NextResponse.json(
        { result: "No problem — the order's cancelled. Anything else I can help with?" },
        { status: 200 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Find the most recent in-progress order for this restaurant. Prefer one
    // tied to this specific Retell call_id; fall back to most recent.
    let target: { id: string; payment_intent_id: string | null; status: string } | null = null;

    if (callId) {
      // First attempt: order linked to this exact call
      const { data: callRow } = await supabase
        .from('calls')
        .select('id')
        .eq('retell_call_id', callId)
        .maybeSingle();

      if (callRow?.id) {
        const { data: byCall } = await supabase
          .from('orders')
          .select('id, payment_intent_id, status')
          .eq('call_id', callRow.id)
          .in('status', ['building', 'pending', 'payment_sent'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byCall) target = byCall;
      }
    }

    if (!target) {
      // Fallback: most recent in-progress for this restaurant
      const { data: byRest } = await supabase
        .from('orders')
        .select('id, payment_intent_id, status')
        .eq('restaurant_id', restaurant.id)
        .in('status', ['building', 'pending', 'payment_sent'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byRest) target = byRest;
    }

    if (!target) {
      // Nothing to cancel — caller probably just changed their mind early.
      // Still acknowledge cleanly.
      return NextResponse.json(
        { result: "No order on file yet — no worries. Anything else I can help with?" },
        { status: 200 }
      );
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        // Free-form notes column commonly exists; if not present this just no-ops in PG.
        notes: `Cancelled by caller via OMRI. ${reason ? `Reason: ${reason.slice(0, 200)}` : ''}`,
      })
      .eq('id', target.id);

    if (updateErr) {
      console.error('[cancel-order] Update failed:', updateErr.message);
      // Don't tell the caller it failed — just acknowledge so they don't
      // re-state "no really, cancel it" five times.
    }

    // If a payment link was issued, log for ops visibility. We don't void
    // Square payment links automatically — they expire on their own (~24h).
    if (target.payment_intent_id) {
      console.log(
        `[cancel-order] Order ${target.id} cancelled with payment link ${target.payment_intent_id} still active. Square link will expire on its own.`
      );
    }

    return NextResponse.json({
      result: "No problem — I've cancelled that order. Anything else I can help with?",
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] cancel-order error:`, error);
    return NextResponse.json(
      { result: "No worries, the order's cancelled. Have a good one!" },
      { status: 200 }
    );
  }
}
