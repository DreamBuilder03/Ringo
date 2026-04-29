// ──────────────────────────────────────────────────────────────────────────────
// /api/retell/inbound  —  Retell "inbound webhook" (dynamic variables on call create)
//
// Fires BEFORE every inbound call connects. Retell sends:
//   { event: "call_inbound",
//     call_inbound: { agent_id, from_number, to_number } }
//
// We respond with dynamic_variables that Retell injects into the prompt at
// call setup. This is what powers returning-customer recognition:
//
//   First-time caller → { is_returning: false, customer_name: "" }
//   Returning caller  → { is_returning: true, customer_name: "Maria",
//                         total_orders: 7, last_order_summary: "12-inch
//                         pepperoni and a Coke" }
//
// The agent prompt uses these variables to greet returning customers by name
// and offer "your usual" — see docs/handoff/returning-customer-recognition.md
// for the prompt template.
//
// Configuration:
//   In Retell agent settings → "Inbound Dynamic Variables Webhook URL"
//   point at https://www.useringo.ai/api/retell/inbound
//
// Performance:
//   This is on the live-call critical path. Retell waits for our response
//   before connecting the caller. We aim for <300ms wall time. The orders
//   query is indexed on (restaurant_id, customer_phone) and capped at 5
//   recent orders, so it's typically <50ms.
//
// Failure mode:
//   On any error (DB hiccup, timeout, malformed request), return an empty
//   dynamic_variables object so the call still connects. The agent falls
//   back to its default greeting; the caller is never stranded.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

interface InboundPayload {
  event?: string;
  call_inbound?: {
    agent_id?: string;
    from_number?: string;
    to_number?: string;
  };
}

interface OrderSnapshot {
  total: number | null;
  customer_name: string | null;
  items: Array<{ name?: string; quantity?: number }> | null;
  paid_at: string | null;
  created_at: string;
}

// Empty response — agent uses prompt defaults; call still connects.
function emptyResponse() {
  return NextResponse.json({
    call_inbound: { dynamic_variables: { is_returning: false } },
  });
}

// Convert phone string → E.164ish for matching the orders table.
// Orders table stores customer_phone in mixed formats over time, so we match
// on a normalized form.
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  if (raw.startsWith('+') && d.length >= 10) return `+${d}`;
  return raw;
}

// Build a short, agent-friendly summary of an order.
// Example: "12-inch pepperoni and a Coke" or "two slices and wings".
function summarizeOrder(items: OrderSnapshot['items']): string {
  if (!items || !Array.isArray(items) || items.length === 0) return '';
  const parts = items.slice(0, 3).map((i) => {
    const qty = i.quantity && i.quantity > 1 ? `${i.quantity} ` : '';
    return `${qty}${i.name || 'item'}`.trim();
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

export async function POST(request: NextRequest) {
  // Rate limit at WEBHOOK tier (200/min). Retell only calls this once per
  // inbound call, so legitimate traffic is well under cap.
  const blocked = await checkRateLimit(request, 'WEBHOOK');
  if (blocked) return blocked;

  try {
    let payload: InboundPayload;
    try {
      payload = await request.json();
    } catch {
      // Bad JSON — Retell test ping or malformed. Respond cleanly.
      return emptyResponse();
    }

    const agentId = payload.call_inbound?.agent_id;
    const fromNumber = payload.call_inbound?.from_number;

    // Need both to look anything up.
    if (!agentId || !fromNumber) return emptyResponse();

    const supabase = await createServiceRoleClient();

    // ─── Step 1: identify the restaurant ────────────────────────────────────
    // Try English agent_id first, then Spanish.
    let restaurantId: string | null = null;
    {
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('retell_agent_id', agentId)
        .single();
      if (data) restaurantId = data.id;
    }
    if (!restaurantId) {
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('retell_agent_id_es', agentId)
        .single();
      if (data) restaurantId = data.id;
    }
    if (!restaurantId) {
      // Demo agent or unknown agent — no recognition possible.
      return emptyResponse();
    }

    // ─── Step 2: aggregate order history for this caller ────────────────────
    // Match on normalized phone — orders table has been written with various
    // formats over time. Use both raw and normalized to be safe.
    const phone = normalizePhone(fromNumber) || fromNumber;

    const { data: orders } = await supabase
      .from('orders')
      .select('total, customer_name, items, paid_at, created_at')
      .eq('restaurant_id', restaurantId)
      .or(`customer_phone.eq.${phone},customer_phone.eq.${fromNumber}`)
      .in('status', ['paid', 'preparing', 'ready', 'completed', 'awaiting_handoff'])
      .order('created_at', { ascending: false })
      .limit(50);

    const completedOrders = (orders || []) as OrderSnapshot[];

    if (completedOrders.length === 0) {
      // First-time caller (or first paid order). Agent will use default greeting.
      return emptyResponse();
    }

    // ─── Step 3: build the dynamic variables for the agent ──────────────────
    // customer_name: the most recent non-empty customer_name from any past
    // order. Owners can correct typos in the dashboard later; this picks up
    // those corrections too because we read the most recent.
    const customerName =
      completedOrders.find((o) => o.customer_name && o.customer_name.trim().length > 0)
        ?.customer_name || '';

    const totalOrders = completedOrders.length;
    const totalSpentDollars = completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Last order summary — agent uses this for the "your usual?" line.
    const lastOrderItems = completedOrders[0]?.items || null;
    const lastOrderSummary = summarizeOrder(lastOrderItems);

    return NextResponse.json({
      call_inbound: {
        dynamic_variables: {
          is_returning: true,
          customer_name: customerName,
          total_orders: totalOrders,
          total_spent: totalSpentDollars.toFixed(2),
          last_order_summary: lastOrderSummary,
        },
      },
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] /api/retell/inbound error:`, err);
    // Failure-mode contract: return empty so the call still connects.
    return emptyResponse();
  }
}
