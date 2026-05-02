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
//   point at https://www.joinomri.com/api/retell/inbound
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
import {
  getActiveExperimentsForRestaurant,
  pickVariant,
  mergeVariantOverridesInto,
} from '@/lib/experiments';

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

    // ─── Step 1: identify the restaurant + read prompt_overrides ────────────
    // Try English agent_id first, then Spanish. Pull prompt_overrides in the
    // same query so we don't need a second round-trip — every byte of latency
    // here is a byte the caller waits on the line.
    let restaurantId: string | null = null;
    let promptOverrides: Record<string, unknown> = {};
    let staffPhoneNumber: string | null = null;
    {
      const { data } = await supabase
        .from('restaurants')
        .select('id, prompt_overrides, staff_phone_number')
        .eq('retell_agent_id', agentId)
        .single();
      if (data) {
        restaurantId = data.id;
        promptOverrides = (data.prompt_overrides as Record<string, unknown>) || {};
        staffPhoneNumber = (data as { staff_phone_number?: string | null }).staff_phone_number ?? null;
      }
    }
    if (!restaurantId) {
      const { data } = await supabase
        .from('restaurants')
        .select('id, prompt_overrides, staff_phone_number')
        .eq('retell_agent_id_es', agentId)
        .single();
      if (data) {
        restaurantId = data.id;
        promptOverrides = (data.prompt_overrides as Record<string, unknown>) || {};
        staffPhoneNumber = (data as { staff_phone_number?: string | null }).staff_phone_number ?? null;
      }
    }
    if (!restaurantId) {
      // Demo agent or unknown agent — no recognition possible.
      return emptyResponse();
    }

    // Normalize the staff phone to E.164 so the agent can pass it directly
    // to transfer_call. Empty string when not configured — the prompt branches
    // on this to decide whether transfer is even possible.
    const normalizedStaffPhone = staffPhoneNumber ? (normalizePhone(staffPhoneNumber) || '') : '';

    // Sanitize prompt_overrides before serving to Retell.
    // Defends against (a) a 1MB JSONB blob smuggled past the dashboard, (b)
    // non-string values that Retell wouldn't know how to substitute, (c) keys
    // that collide with our reserved returning-customer fields.
    const RESERVED_KEYS = new Set([
      'is_returning',
      'customer_name',
      'total_orders',
      'total_spent',
      'last_order_summary',
    ]);
    const sanitizedOverrides: Record<string, string> = {};
    let kept = 0;
    for (const [key, val] of Object.entries(promptOverrides)) {
      if (kept >= 20) break; // cap at 20 keys
      if (RESERVED_KEYS.has(key)) continue; // don't let overrides shadow reserved fields
      if (typeof val !== 'string') continue; // strings only
      if (val.length > 500) continue; // 500-char cap per value
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue; // safe key shape only
      sanitizedOverrides[key] = val;
      kept++;
    }

    // ─── Step 2: aggregate order history + active experiments (parallel) ────
    // Both queries depend only on restaurantId, so we run them in parallel to
    // keep the live-call critical path tight. Failure of either is non-fatal:
    // the orders fallback yields a first-time-caller branch; experiments
    // failure yields no variant assignments and the agent runs as if no
    // experiments were active.
    const phone = normalizePhone(fromNumber) || fromNumber;

    const [ordersResult, activeExperiments] = await Promise.all([
      supabase
        .from('orders')
        .select('total, customer_name, items, paid_at, created_at')
        .eq('restaurant_id', restaurantId)
        .or(`customer_phone.eq.${phone},customer_phone.eq.${fromNumber}`)
        .in('status', ['paid', 'preparing', 'ready', 'completed', 'awaiting_handoff'])
        .order('created_at', { ascending: false })
        .limit(50),
      getActiveExperimentsForRestaurant(supabase, restaurantId),
    ]);

    const completedOrders = (ordersResult.data || []) as OrderSnapshot[];

    // ─── Step 2b: pick variants for each active experiment ──────────────────
    // For each running experiment, deterministic-hash (fromNumber, exp.id) →
    // variant. Merge that variant's overrides_patch into the same sanitized
    // dictionary used by per-restaurant prompt_overrides (same defenses, same
    // 20-key budget). Then inject exp_<slug>=<variant_slug> as its own dynamic
    // variable so prompts can branch by name.
    //
    // Stats note (intentional Phase 2 gap): we don't write to
    // experiment_assignments here because the inbound webhook fires BEFORE
    // Retell has assigned a call_id. The dynamic_variables we return are
    // visible on the resulting call object, so for now stats are computed by
    // joining Retell's call records with our orders table. A follow-up will
    // wire experiment_assignments writes from the call_started handler.
    const expVars: Record<string, string> = {};
    for (const exp of activeExperiments) {
      const variant = pickVariant(fromNumber, exp.id, exp.variants);
      if (!variant) continue;
      expVars[`exp_${exp.slug}`] = variant.slug;
      const remaining = 20 - Object.keys(sanitizedOverrides).length;
      if (remaining > 0) {
        mergeVariantOverridesInto(sanitizedOverrides, variant.overrides_patch, remaining);
      }
    }

    if (completedOrders.length === 0) {
      // First-time caller (or first paid order). Agent will use default greeting,
      // but per-restaurant prompt_overrides + experiment variants still apply.
      return NextResponse.json({
        call_inbound: {
          dynamic_variables: {
            is_returning: false,
            ...sanitizedOverrides,
            ...expVars,
            staff_phone_number: normalizedStaffPhone,
          },
        },
      });
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
          // Sanitized per-restaurant overrides land first; reserved
          // returning-customer fields below override any same-named keys
          // (RESERVED_KEYS filter above prevents that, but we order this
          // way as a defense-in-depth belt-and-suspenders.)
          ...sanitizedOverrides,
          // Experiment variant assignments — exp_<slug>=<variant_slug>. The
          // overrides_patch from the chosen variant is already merged into
          // sanitizedOverrides above; these keys are the audit trail / branch
          // hooks for prompts that want to switch on variant by name.
          ...expVars,
          is_returning: true,
          customer_name: customerName,
          total_orders: totalOrders,
          total_spent: totalSpentDollars.toFixed(2),
          last_order_summary: lastOrderSummary,
          // Hard-handoff destination (E.164). Empty string when not configured;
          // the prompt branches on this to decide transfer_call vs request_handoff.
          staff_phone_number: normalizedStaffPhone,
        },
      },
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] /api/retell/inbound error:`, err);
    // Failure-mode contract: return empty so the call still connects.
    return emptyResponse();
  }
}
