// ──────────────────────────────────────────────────────────────────────────────
// /api/cron/retell-health-check — proactive Retell upstream health probe.
//
// Companion to /api/twilio/voice-fallback (Multi-Test scenario #21).
//
// Why we need a proactive cron in addition to the reactive TwiML fallback:
//   The fallback fires when a CUSTOMER calls. If Retell goes down at 11pm
//   and the next customer call isn't until 11am, the founder doesn't learn
//   about the outage for 12 hours. This cron runs every 2 minutes during
//   business hours so the founder learns within 2 min of any Retell outage,
//   not within "next customer call."
//
// What we check:
//   GET https://api.retellai.com/list-agents?limit=1
//   - Cheap (lists 1 agent — same auth path as our real production calls)
//   - Returns 200 if Retell API is healthy
//   - Returns 5xx / times out / connection refused if Retell is down
//
// Detection logic:
//   • 1 consecutive failure → log only (could be transient network blip)
//   • 2 consecutive failures (~4 min) → fire founder alert with dedupe
//   • Once we've alerted, suppress further alerts via the alerts_log
//     dedupe machinery for 30 minutes (don't spam Misael during an outage)
//
// Failure-state storage:
//   We don't need a dedicated table — alerts_log already tracks every
//   `retell_health_down` we've fired, with timestamps. To know "is this the
//   2nd consecutive failure?" we look at the alerts_log for the most recent
//   `retell_health_down` in the last 5 min.
//
// What this does NOT do:
//   • Doesn't gate any traffic. Even when Retell is "down" per this probe,
//     we still let real calls hit Retell — the Twilio fallback will catch
//     them. Risk of gating on a flaky probe (false positive → all calls
//     fail over → bad customer experience) outweighs the marginal benefit.
//
// Vercel cron schedule (add to vercel.json):
//   { "path": "/api/cron/retell-health-check", "schedule": "0/2 14-6 * * *" }
//   = every 2 min between 6am-10pm Pacific (14:00 UTC = 6am PT in winter,
//   14:00 UTC = 7am PT in DST — close enough for a coarse business window).
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFounderAlert } from '@/lib/alerts';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// 6 seconds — Retell's normal /list-agents responds in <500ms. A 6s timeout
// catches "slow but alive" without false-positiving on every minor latency
// blip. Anything past this we consider down for our purposes.
const RETELL_TIMEOUT_MS = 6000;

// Window for "consecutive failure" detection. Cron fires every 2 min, so a
// 5-min window catches "2 in a row" reliably without false-grouping the cron
// run that recovered.
const CONSECUTIVE_WINDOW_MS = 5 * 60 * 1000;

// Suppress repeat alerts for 30 min once we've paged. The founder doesn't
// need 15 SMSes during a single hour-long outage.
const ALERT_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

interface ProbeResult {
  ok: boolean;
  status?: number;
  errorMessage?: string;
  latencyMs?: number;
}

async function probeRetell(apiKey: string): Promise<ProbeResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RETELL_TIMEOUT_MS);

  try {
    // /list-agents is cheap and exercises the same auth path as our real
    // production calls. POST + body-with-limit avoids accidentally pulling
    // a giant agent list on an account with hundreds of agents.
    const res = await fetch('https://api.retellai.com/list-agents', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timer);

    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
      errorMessage: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      errorMessage:
        err instanceof Error
          ? err.name === 'AbortError'
            ? `timeout after ${RETELL_TIMEOUT_MS}ms`
            : err.message
          : String(err),
    };
  }
}

export async function GET(request: NextRequest) {
  // Rate limit at CRON tier (10/min). Vercel Cron only invokes once per
  // schedule so this defends against URL spam, not legitimate cron.
  const blocked = await checkRateLimit(request, 'CRON');
  if (blocked) return blocked;

  // Auth — Vercel Cron sends CRON_SECRET as Bearer.
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    // No API key configured — can't probe. Don't alert (would loop forever).
    return NextResponse.json({
      skipped: 'RETELL_API_KEY not configured',
    });
  }

  const probe = await probeRetell(apiKey);
  const t0 = new Date().toISOString();

  if (probe.ok) {
    // Healthy — log briefly and exit. We don't write a "healthy" row to
    // alerts_log; that table is for failures only.
    console.log(`[${t0}] [retell-health-check] OK (${probe.latencyMs}ms)`);
    return NextResponse.json({
      healthy: true,
      latency_ms: probe.latencyMs,
      retell_status: probe.status,
    });
  }

  console.warn(
    `[${t0}] [retell-health-check] FAILED (${probe.latencyMs}ms): ${probe.errorMessage}`
  );

  // Decide whether to alert. Two checks:
  //   1. Was there ANOTHER `retell_health_down` in the last 5 min?
  //      If yes → this is at least the 2nd failure → confidence is high → alert.
  //      If no  → could be a single blip → log this attempt and exit, next
  //               run in 2 min will decide.
  //   2. Have we already alerted in the last 30 min? If yes → suppress.
  const supabase = await createServiceRoleClient();

  const consecutiveCutoff = new Date(Date.now() - CONSECUTIVE_WINDOW_MS).toISOString();
  const dedupeCutoff = new Date(Date.now() - ALERT_DEDUPE_WINDOW_MS).toISOString();

  // Have we alerted recently? Don't spam.
  const { data: recentAlerts } = await supabase
    .from('alerts_log')
    .select('id, created_at')
    .eq('failure_type', 'retell_health_down')
    .gte('created_at', dedupeCutoff)
    .limit(1);

  if (recentAlerts && recentAlerts.length > 0) {
    console.log(
      `[${t0}] [retell-health-check] still down — alert suppressed (last ${ALERT_DEDUPE_WINDOW_MS / 60000}min)`
    );
    return NextResponse.json({
      healthy: false,
      alerted: false,
      reason: 'within dedupe window',
      latency_ms: probe.latencyMs,
      error: probe.errorMessage,
    });
  }

  // Look for a previous failure in the consecutive window. We use a tiny
  // helper row written below — alerts_log only stores ALERTS, not raw probe
  // failures, so we'd lose the "first failure" signal otherwise.
  // Workaround: write a low-noise probe-failure marker via metadata key on
  // alerts_log itself, then check for it. failure_type='retell_health_down'
  // PLUS metadata.alerted=false marks "we saw a failure but didn't page yet."
  const { data: recentProbeFailures } = await supabase
    .from('alerts_log')
    .select('id, metadata, created_at')
    .eq('failure_type', 'retell_health_down')
    .gte('created_at', consecutiveCutoff)
    .order('created_at', { ascending: false })
    .limit(5);

  const priorUnalerted = (recentProbeFailures || []).find(
    (row) => (row.metadata as Record<string, unknown> | null)?.alerted === false
  );

  if (!priorUnalerted) {
    // First failure in window — log a non-alerting marker and exit. If next
    // run in 2 min ALSO fails, we'll see this row and escalate to alert.
    // dedupe_key is required by the schema; we use a stable per-probe key so
    // the marker is greppable but doesn't conflict with real alert dedupe.
    try {
      await supabase.from('alerts_log').insert({
        failure_type: 'retell_health_down',
        short_reason: `Retell probe failed (1st): ${probe.errorMessage}`,
        dedupe_key: `retell-health-probe-marker:${Date.now()}`,
        sent_via: 'none',
        metadata: {
          alerted: false,
          probe_latency_ms: probe.latencyMs,
          probe_error: probe.errorMessage,
          probe_status: probe.status,
        },
      });
    } catch (err) {
      console.error(`[${t0}] [retell-health-check] probe-marker insert failed:`, err);
    }
    return NextResponse.json({
      healthy: false,
      alerted: false,
      reason: '1st consecutive failure — waiting for 2nd to confirm',
      latency_ms: probe.latencyMs,
      error: probe.errorMessage,
    });
  }

  // 2nd consecutive failure — fire the alert. sendFounderAlert handles its
  // own internal dedupe (5 min) and writes to alerts_log with
  // metadata.alerted=true (set by alerts.ts), which we use as the suppression
  // signal in the dedupeCutoff check above.
  await sendFounderAlert({
    failureType: 'retell_health_down',
    shortReason: `Retell upstream unreachable — ${probe.errorMessage}`,
    actionHint:
      'Voice fallback will fire on every customer call until resolved. Check status.retellai.com + restart any stuck phone agent.',
    metadata: {
      alerted: true,
      probe_latency_ms: probe.latencyMs,
      probe_error: probe.errorMessage,
      probe_status: probe.status,
      first_failure_at: priorUnalerted.created_at,
      detection_lag_ms:
        Date.now() - new Date(priorUnalerted.created_at).getTime(),
    },
  });

  return NextResponse.json({
    healthy: false,
    alerted: true,
    latency_ms: probe.latencyMs,
    error: probe.errorMessage,
    first_failure_at: priorUnalerted.created_at,
  });
}
