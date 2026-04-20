#!/usr/bin/env node
/**
 * Synthetic test harness for Ringo voice-tool routes.
 *
 * Why this exists: we were using real phone calls as integration tests.
 * That's slow, flaky, and expensive. This script hits the HTTP endpoints
 * directly with the exact payload shape Retell sends, verifies the
 * agent-speakable result contract, and cleans up its own rows.
 *
 * Usage:
 *   # Against live Vercel deploy (default):
 *   node scripts/smoke-voice-tools.mjs
 *
 *   # Against local dev server:
 *   BASE_URL=http://localhost:3000 node scripts/smoke-voice-tools.mjs
 *
 *   # Include the end-to-end finalize-payment test (burns a real
 *   # Square sandbox payment link + sends a real SMS). Opt-in only.
 *   SMOKE_ALLOW_EXTERNAL=1 node scripts/smoke-voice-tools.mjs
 *
 * Required env (loaded from .env.local if present):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env:
 *   BASE_URL              — defaults to https://www.useringo.ai
 *   SMOKE_RESTAURANT_ID   — defaults to Sal's restaurant UUID
 *   SMOKE_AGENT_ID        — defaults to Sal's Retell agent ID
 *   SMOKE_FROM_NUMBER     — defaults to +15559990000 (fake caller ID)
 *   SMOKE_ALLOW_EXTERNAL  — "1" to run the finalize-payment end-to-end test
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Config & env
// ---------------------------------------------------------------------------

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (!(k in process.env)) {
      process.env[k] = v.replace(/^["']|["']$/g, '');
    }
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(__dirname, '..', '.env.local'));
loadEnvFile(resolve(__dirname, '..', '.env'));

const BASE_URL = (process.env.BASE_URL || 'https://www.useringo.ai').replace(/\/$/, '');
const RESTAURANT_ID = process.env.SMOKE_RESTAURANT_ID || 'a0000000-0000-0000-0000-000000005a15';
const AGENT_ID = process.env.SMOKE_AGENT_ID || 'agent_2a06fef4b4adf81ffd9b8a72e2';
const FROM_NUMBER = process.env.SMOKE_FROM_NUMBER || '+15559990000';
const ALLOW_EXTERNAL = process.env.SMOKE_ALLOW_EXTERNAL === '1';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from env/.env.local');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// PostgREST helpers — Supabase direct access for setup / cleanup / assertions
// ---------------------------------------------------------------------------

async function rest(path, init = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`PostgREST ${r.status} ${path}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function seedCallRow(retellCallId) {
  await rest('calls', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      restaurant_id: RESTAURANT_ID,
      retell_call_id: retellCallId,
      start_time: new Date().toISOString(),
      call_outcome: 'missed',
      order_total: 0,
      upsell_total: 0,
    }),
  });
}

async function cleanupSmokeRows() {
  // Delete orders first (they FK into calls) — then the calls rows themselves.
  try {
    // Find every smoke call, delete their orders, then the calls.
    const smokeCalls = await rest(
      `calls?select=id&retell_call_id=like.smoke_*`,
      { method: 'GET' }
    );
    if (Array.isArray(smokeCalls) && smokeCalls.length > 0) {
      const ids = smokeCalls.map((c) => c.id);
      const idList = ids.map((i) => `"${i}"`).join(',');
      await rest(`orders?call_id=in.(${idList})`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
  } catch (e) {
    console.warn(`cleanup(orders): ${e.message}`);
  }
  try {
    await rest(`calls?retell_call_id=like.smoke_*`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  } catch (e) {
    console.warn(`cleanup(calls): ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Tool invocation
// ---------------------------------------------------------------------------

function makeReq({ callId, args, agentId = AGENT_ID, fromNumber = FROM_NUMBER }) {
  return {
    call: { call_id: callId, agent_id: agentId, from_number: fromNumber },
    args,
  };
}

async function callTool(tool, payload) {
  const url = `${BASE_URL}/api/tools/${tool}`;
  let status, body;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    status = r.status;
    try {
      body = await r.json();
    } catch {
      body = { result: '<non-JSON response>' };
    }
  } catch (e) {
    status = 0;
    body = { result: `<fetch error: ${e.message}>` };
  }
  return { status, body };
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/**
 * The agent reads `result` verbatim. It must NEVER:
 *  - be empty/non-string
 *  - start with "Error:" or similar stacktrace-looking prefix
 *  - contain literal "undefined" / "[object Object]"
 */
function isSpeakable(s) {
  if (typeof s !== 'string' || s.length === 0) return false;
  if (/^error\s*[:\-]/i.test(s)) return false;
  if (/^\w+error:/i.test(s.trim())) return false;
  if (s.includes('undefined') || s.includes('[object Object]')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const results = [];
const seededCallIds = new Set();

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n▸ ${title}`);
}

async function newSmokeCall() {
  const id = `smoke_${randomUUID()}`;
  await seedCallRow(id);
  seededCallIds.add(id);
  return id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function t0_preflight() {
  section('T0 — Preflight: restaurant + agent are wired');
  const rows = await rest(
    `restaurants?select=id,name,retell_agent_id,retell_agent_id_es&id=eq.${RESTAURANT_ID}`
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    record('restaurant row exists', false, `no row with id=${RESTAURANT_ID}`);
    return false;
  }
  const r = rows[0];
  record('restaurant row exists', true, `${r.name}`);
  const agentMatch = r.retell_agent_id === AGENT_ID || r.retell_agent_id_es === AGENT_ID;
  record('agent_id matches restaurant', agentMatch,
    agentMatch ? AGENT_ID : `expected ${AGENT_ID}, got en=${r.retell_agent_id} es=${r.retell_agent_id_es}`);
  return agentMatch;
}

async function t1_lookup_item_happy() {
  section('T1 — lookup-item returns a real menu item for "pepperoni"');
  const callId = await newSmokeCall();
  const { status, body } = await callTool('lookup-item', makeReq({
    callId,
    args: { item_name: 'pepperoni' },
  }));
  record('HTTP 200', status === 200, `status=${status}`);
  record('result is speakable', isSpeakable(body?.result), JSON.stringify(body?.result));
  const found = typeof body?.result === 'string' && !/don'?t have/i.test(body.result);
  record('menu item found', found, found ? '' : body?.result);
  return found;
}

async function t2_word_order_variants() {
  section('T2 — Word-order variants all resolve to the same item');
  const variants = [
    '18-inch Nonna\'s Pepperoni',
    'Nonna\'s Pepperoni 18-inch',
    '18 inch pepperoni pizza',
    'pepperoni 18 inch',
  ];
  for (const name of variants) {
    const callId = await newSmokeCall();
    const { body } = await callTool('lookup-item', makeReq({
      callId,
      args: { item_name: name },
    }));
    const found = typeof body?.result === 'string' && !/don'?t have/i.test(body.result);
    record(`"${name}" found`, found, found ? extractItemName(body.result) : body?.result);
  }
}

function extractItemName(resultStr) {
  // "<item name>: $<price>..." — pull everything before the first colon+dollar
  const m = resultStr.match(/^([^:]+):\s*\$/);
  return m ? m[1].trim() : '';
}

async function t3_add_to_order_flow() {
  section('T3 — add-to-order creates an order, second add appends');
  const callId = await newSmokeCall();
  const { status: s1, body: b1 } = await callTool('add-to-order', makeReq({
    callId,
    args: { item_name: 'pepperoni', quantity: 1 },
  }));
  record('first add HTTP 200', s1 === 200, `status=${s1}`);
  record('first add speakable', isSpeakable(b1?.result), b1?.result);

  const { status: s2, body: b2 } = await callTool('add-to-order', makeReq({
    callId,
    args: { item_name: 'pepperoni', quantity: 2 },
  }));
  record('second add HTTP 200', s2 === 200, `status=${s2}`);
  record('second add speakable', isSpeakable(b2?.result), b2?.result);

  // Verify order in DB
  const callRows = await rest(`calls?select=id&retell_call_id=eq.${callId}`);
  const internalCallId = callRows?.[0]?.id;
  const orders = internalCallId
    ? await rest(`orders?select=id,items,total,status&call_id=eq.${internalCallId}`)
    : [];
  const order = orders?.[0];
  record('order row created', !!order, order?.id || 'none');
  record('order has two items', Array.isArray(order?.items) && order.items.length === 2,
    `items.length=${order?.items?.length}`);
  return callId;
}

async function t4_confirm_order_phone_fallback(existingCallId) {
  section('T4 — confirm-order falls back to call.from_number if args.customer_phone missing');
  if (!existingCallId) {
    record('prerequisite: order exists', false, 'skipped — T3 did not produce a call');
    return;
  }
  // Deliberately omit customer_phone; confirm-order should use call.from_number.
  const { status, body } = await callTool('confirm-order', makeReq({
    callId: existingCallId,
    args: {},
  }));
  record('HTTP 200', status === 200, `status=${status}`);
  record('no "need a phone number" dead-loop', !/phone\s*number/i.test(body?.result || ''),
    body?.result);
  record('result speakable', isSpeakable(body?.result), body?.result);

  // Verify DB: order should be 'pending' with customer_phone set
  const callRows = await rest(`calls?select=id&retell_call_id=eq.${existingCallId}`);
  const internalCallId = callRows?.[0]?.id;
  const orders = internalCallId
    ? await rest(`orders?select=status,customer_phone&call_id=eq.${internalCallId}`)
    : [];
  const o = orders?.[0];
  record('order status=pending', o?.status === 'pending', `status=${o?.status}`);
  record('customer_phone filled from from_number', o?.customer_phone === FROM_NUMBER,
    `phone=${o?.customer_phone}`);
}

async function t5_item_not_found_is_speakable() {
  section('T5 — lookup-item for bogus item returns a speakable suggestion');
  const callId = await newSmokeCall();
  const { body } = await callTool('lookup-item', makeReq({
    callId,
    args: { item_name: 'xyzzy-bogus-plutonium-sandwich' },
  }));
  record('result speakable (no "Error:")', isSpeakable(body?.result), body?.result);
  record('result suggests alternatives', /(?:we do have|menu|check)/i.test(body?.result || ''),
    body?.result);
}

async function t6_finalize_no_order_recovers() {
  section('T6 — finalize-payment with no order + no items returns speakable recovery (not 404 error)');
  const callId = await newSmokeCall();
  const { status, body } = await callTool('finalize-payment', makeReq({
    callId,
    args: {}, // no items, no customer_phone — but from_number provides phone
  }));
  // Must be 200, not 404/500 — Retell handles non-200 poorly.
  record('status is 200 (not 4xx/5xx)', status === 200, `status=${status}`);
  record('result speakable', isSpeakable(body?.result), body?.result);
  // The recovery message should ask the caller to restate the order.
  record('prompts caller to restate order', /repeat|restate|full order|what you'?d like/i.test(body?.result || ''),
    body?.result);
}

async function t7_finalize_end_to_end() {
  section('T7 — finalize-payment with items array (EXTERNAL: hits Square + SMS)');
  if (!ALLOW_EXTERNAL) {
    record('skipped (opt-in)', true, 'set SMOKE_ALLOW_EXTERNAL=1 to run');
    return;
  }
  const callId = await newSmokeCall();
  const { status, body } = await callTool('finalize-payment', makeReq({
    callId,
    args: {
      items: [
        { name: 'Pepperoni 18-inch', price: 24.99, quantity: 1 },
      ],
      customer_phone: FROM_NUMBER,
    },
  }));
  record('HTTP 200', status === 200, `status=${status}`);
  record('result speakable', isSpeakable(body?.result), body?.result);
  record('payment link sent OR read aloud', /payment link/i.test(body?.result || ''), body?.result);
}

async function t8_remove_from_order_token_match() {
  section('T8 — remove-from-order uses token matching (partial names work)');

  // Single-match case: "remove the pepperoni" should find "Nonna's Pepperoni 18-inch"
  const callId1 = await newSmokeCall();
  await callTool('add-to-order', makeReq({
    callId: callId1,
    args: { item_name: 'Nonna\'s Pepperoni 18-inch', quantity: 1 },
  }));
  const { status: s1, body: b1 } = await callTool('remove-from-order', makeReq({
    callId: callId1,
    args: { item_name: 'pepperoni' },
  }));
  record('single-match remove HTTP 200', s1 === 200, `status=${s1}`);
  record('single-match result speakable', isSpeakable(b1?.result), b1?.result);
  record('single-match item actually removed', /removed/i.test(b1?.result || ''), b1?.result);

  // Disambiguation case: add two pepperonis of different sizes, ask to remove "pepperoni"
  // → should ask "did you mean the X or the Y?" rather than silently pick one
  const callId2 = await newSmokeCall();
  await callTool('add-to-order', makeReq({
    callId: callId2,
    args: { item_name: 'Nonna\'s Pepperoni 10-inch', quantity: 1 },
  }));
  await callTool('add-to-order', makeReq({
    callId: callId2,
    args: { item_name: 'Nonna\'s Pepperoni 18-inch', quantity: 1 },
  }));
  const { status: s2, body: b2 } = await callTool('remove-from-order', makeReq({
    callId: callId2,
    args: { item_name: 'pepperoni' },
  }));
  record('ambiguous remove HTTP 200', s2 === 200, `status=${s2}`);
  record('ambiguous remove asks to clarify', /which|did you mean|few matches/i.test(b2?.result || ''),
    b2?.result);
}

async function t9_get_modifiers_speakable() {
  section('T9 — get-modifiers returns speakable result');
  const callId = await newSmokeCall();
  const { status, body } = await callTool('get-modifiers', makeReq({
    callId,
    args: { item_name: 'pepperoni' },
  }));
  record('HTTP 200', status === 200, `status=${status}`);
  record('result speakable', isSpeakable(body?.result), body?.result);
}

async function t11_v9_drinks_and_wings() {
  section('T11 — V9 seed: drinks + wings resolve by natural phrasing');
  if (process.env.SMOKE_V9_SEED !== '1') {
    record('skipped (waiting on Brain\'s V9 seed)', true, 'set SMOKE_V9_SEED=1 once new seed is live');
    return;
  }

  // Drinks — every phrasing a real caller might use should resolve.
  const drinkCases = [
    { query: '2L Coke',           desc: '2L Coke (exact)' },
    { query: '2 liter Coke',      desc: '2-liter Coke (spelled out)' },
    { query: 'Coke 2 liter',      desc: 'Coke 2-liter (word order swap)' },
    { query: 'large Coke',        desc: '"large Coke" (vague)' },
    { query: '2L Diet Coke',      desc: '2L Diet Coke' },
    { query: 'fountain Coke',     desc: 'fountain Coke' },
    { query: 'fountain drink',    desc: 'fountain drink (generic)' },
  ];
  for (const { query, desc } of drinkCases) {
    const callId = await newSmokeCall();
    const { body } = await callTool('lookup-item', makeReq({
      callId,
      args: { item_name: query },
    }));
    const found = typeof body?.result === 'string' && !/don'?t have/i.test(body.result);
    record(`drink: ${desc}`, found, found ? extractItemName(body.result) : body?.result);
  }

  // Wings — agent needs to resolve count phrasings.
  const wingCases = [
    { query: '10 wings',          desc: '10 wings (count only)' },
    { query: 'ten wings',         desc: 'ten wings (spelled out)' },
    { query: '10 piece wings',    desc: '10 piece wings' },
    { query: '6 wings buffalo',   desc: '6 wings buffalo (count + flavor)' },
    { query: '20 piece party',    desc: '20 piece party' },
  ];
  for (const { query, desc } of wingCases) {
    const callId = await newSmokeCall();
    const { body } = await callTool('lookup-item', makeReq({
      callId,
      args: { item_name: query },
    }));
    const found = typeof body?.result === 'string' && !/don'?t have/i.test(body.result);
    record(`wing: ${desc}`, found, found ? extractItemName(body.result) : body?.result);
  }
}

async function t10_missing_args_never_freezes_agent() {
  section('T10 — every tool with empty args returns a speakable prompt (not a stacktrace)');
  const tools = ['lookup-item', 'add-to-order', 'get-modifiers', 'confirm-order',
    'remove-from-order', 'finalize-payment'];
  for (const tool of tools) {
    const callId = await newSmokeCall();
    const { body } = await callTool(tool, makeReq({ callId, args: {} }));
    record(`${tool}: speakable`, isSpeakable(body?.result), body?.result);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Ringo synthetic voice-tool harness');
  console.log('==================================');
  console.log(`BASE_URL:       ${BASE_URL}`);
  console.log(`RESTAURANT_ID:  ${RESTAURANT_ID}`);
  console.log(`AGENT_ID:       ${AGENT_ID}`);
  console.log(`FROM_NUMBER:    ${FROM_NUMBER}`);
  console.log(`EXTERNAL TESTS: ${ALLOW_EXTERNAL ? 'ENABLED' : 'skipped (set SMOKE_ALLOW_EXTERNAL=1)'}`);

  // Always clean up before we start in case a previous run crashed mid-flight.
  await cleanupSmokeRows();

  const preflightOk = await t0_preflight();
  if (!preflightOk) {
    console.error('\nPreflight failed — aborting. Fix the restaurant/agent wiring and retry.');
    await cleanupSmokeRows();
    process.exit(1);
  }

  await t1_lookup_item_happy();
  await t2_word_order_variants();
  const orderCallId = await t3_add_to_order_flow();
  await t4_confirm_order_phone_fallback(orderCallId);
  await t5_item_not_found_is_speakable();
  await t6_finalize_no_order_recovers();
  await t7_finalize_end_to_end();
  await t8_remove_from_order_token_match();
  await t9_get_modifiers_speakable();
  await t10_missing_args_never_freezes_agent();
  await t11_v9_drinks_and_wings();

  // Always cleanup before exit.
  await cleanupSmokeRows();

  const failed = results.filter((r) => !r.ok);
  console.log('\n==================================');
  console.log(`Total:   ${results.length}`);
  console.log(`Passed:  ${results.length - failed.length}`);
  console.log(`Failed:  ${failed.length}`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    process.exit(1);
  }
  console.log('\n✓ All tests passed');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\nHarness crashed:', err);
  try { await cleanupSmokeRows(); } catch {}
  process.exit(2);
});
