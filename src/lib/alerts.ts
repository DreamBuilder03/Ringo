/**
 * Founder call-failure alerts.
 *
 * Build 2 per ~/Desktop/Brain Agent/builder_handoff_pilot_readiness.md.
 *
 * When something breaks during a live restaurant call — Retell errors, tool-route
 * failures, Square payment link refusals, silent lines — we SMS+email Misael within
 * 60s so he can triage before the restaurant owner finds out. This is the managed-service
 * moat the pricing page sells.
 *
 * Rules:
 *   1. Dedupe: identical alert (same dedupe_key) within 5 minutes → skip.
 *   2. Per-restaurant cap: 5 alerts/hour/restaurant. On the 6th, fire ONE summary
 *      alert ("X failures at {restaurant} in the last hour — likely systemic.") and
 *      suppress further alerts for that restaurant for the rest of the hour.
 *   3. `restaurants.alerts_enabled=false` → silent (demo/staging).
 *   4. Every send path is defensive: if Twilio or Resend throws, we log to Sentry
 *      and keep going. The alert emitter MUST NEVER crash a webhook.
 *   5. Founder alerts use Twilio directly — NOT /api/sms (which goes GHL-first).
 *      We don't want a GHL contact created for Misael on every outage.
 */

import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertFailureType =
  | 'retell_call_error'
  | 'premature_hangup'
  | 'tool_call_failure'
  | 'payment_link_failure'
  | 'silent_line'
  | 'silent_line_summary'
  | 'tool_failure_summary';

export interface SendFounderAlertOpts {
  restaurantId?: string | null;
  failureType: AlertFailureType;
  /** Short human-readable reason, e.g. "send_payment_link returned 500". Max ~120 chars. */
  shortReason: string;
  /** Retell call ID if the alert is tied to a call. */
  retellCallId?: string | null;
  /** Optional suggested next step to include in the SMS body. */
  actionHint?: string;
  /** Arbitrary structured payload stored on alerts_log for forensics. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_CAP_PER_HOUR = 5;

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function sendFounderAlert(opts: SendFounderAlertOpts): Promise<void> {
  // Any internal failure here must NOT throw — the caller is typically a webhook or
  // tool route whose own response must still be returned. Catch absolutely everything.
  try {
    await sendFounderAlertInner(opts);
  } catch (err) {
    try {
      Sentry.captureException(err, {
        tags: { route: 'alerts', failure_type: opts.failureType },
        extra: { short_reason: opts.shortReason },
      });
    } catch {
      // Give up silently. Don't let the logger itself break the caller.
    }
    console.error(`[${new Date().toISOString()}] sendFounderAlert failed:`, err);
  }
}

async function sendFounderAlertInner(opts: SendFounderAlertOpts): Promise<void> {
  const supabase = await createServiceRoleClient();

  // 1. Resolve restaurant + alerts_enabled check
  const restaurant = await loadRestaurant(supabase, opts.restaurantId);
  if (restaurant && restaurant.alerts_enabled === false) {
    // Explicitly disabled — don't even log (alerts_log is for sends, not suppressions).
    return;
  }

  const dedupeKey = buildDedupeKey(opts, restaurant?.id ?? null);

  // 2. Dedupe check — identical alert in last 5 minutes?
  const dupe = await recentByDedupeKey(supabase, dedupeKey, DEDUPE_WINDOW_MS);
  if (dupe) return;

  // 3. Per-restaurant hourly cap
  const restId = restaurant?.id ?? opts.restaurantId ?? null;
  if (restId) {
    const recentCount = await countRecentForRestaurant(supabase, restId, RATE_WINDOW_MS);
    if (recentCount >= RATE_CAP_PER_HOUR) {
      await maybeFireSummary(supabase, {
        restaurantId: restId,
        restaurantName: restaurant?.name ?? null,
        recentCount,
      });
      return;
    }
  }

  // 4. Compose + deliver
  const restaurantName = restaurant?.name ?? 'Unknown restaurant';
  const messageBody = formatAlertBody({
    restaurantName,
    failureType: opts.failureType,
    shortReason: opts.shortReason,
    retellCallId: opts.retellCallId ?? null,
    actionHint: opts.actionHint ?? defaultActionHint(opts.failureType),
  });

  const [smsResult, emailResult] = await Promise.all([
    sendTwilioSms(messageBody).catch((err) => ({ success: false as const, error: err })),
    sendAlertEmail({ subject: `[OMRI ALERT] ${restaurantName}`, body: messageBody }).catch(
      (err) => ({ success: false as const, error: err })
    ),
  ]);

  const sentVia = ((): 'sms' | 'email' | 'both' | 'none' => {
    if (smsResult.success && emailResult.success) return 'both';
    if (smsResult.success) return 'sms';
    if (emailResult.success) return 'email';
    return 'none';
  })();

  // 5. Audit row — even if both sends failed we log it so /admin/health shows the attempt.
  await supabase.from('alerts_log').insert({
    restaurant_id: restId,
    failure_type: opts.failureType,
    short_reason: opts.shortReason.slice(0, 500),
    retell_call_id: opts.retellCallId ?? null,
    dedupe_key: dedupeKey,
    sent_via: sentVia,
    sms_provider: smsResult.success ? 'twilio' : null,
    metadata: {
      ...(opts.metadata ?? {}),
      sms_error: smsResult.success ? null : String((smsResult as { error: unknown }).error),
      email_error: emailResult.success ? null : String((emailResult as { error: unknown }).error),
    },
  });

  if (sentVia === 'none') {
    Sentry.captureMessage('founder-alert: all channels failed', {
      level: 'error',
      tags: { failure_type: opts.failureType, restaurant_id: restId ?? 'unknown' },
      extra: { short_reason: opts.shortReason },
    });
  }
}

// ---------------------------------------------------------------------------
// Dedupe + rate-limit helpers
// ---------------------------------------------------------------------------

function buildDedupeKey(opts: SendFounderAlertOpts, restaurantId: string | null): string {
  // Normalize the reason: strip numbers + whitespace variance so "returned 500"
  // and "returned 502" collapse into one alert, but distinct tools/types don't.
  const normalized = opts.shortReason
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return [opts.failureType, restaurantId ?? 'no-restaurant', normalized].join('|');
}

async function recentByDedupeKey(
  supabase: SupabaseClient,
  dedupeKey: string,
  windowMs: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from('alerts_log')
    .select('id')
    .eq('dedupe_key', dedupeKey)
    .gte('created_at', cutoff)
    .limit(1);
  if (error) {
    // If we can't check dedupe, err on the side of sending — better a duplicate alert than silence.
    Sentry.captureMessage('alerts: dedupe query failed', {
      level: 'warning',
      extra: { error: error.message },
    });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function countRecentForRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  windowMs: number
): Promise<number> {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from('alerts_log')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', cutoff)
    // Exclude the summary rows so they don't count against their own cap.
    .not('failure_type', 'in', '("silent_line_summary","tool_failure_summary")');
  if (error) return 0;
  return count ?? 0;
}

async function maybeFireSummary(
  supabase: SupabaseClient,
  opts: { restaurantId: string; restaurantName: string | null; recentCount: number }
): Promise<void> {
  // Only emit the summary once per hour per restaurant.
  const dedupeKey = `tool_failure_summary|${opts.restaurantId}|hourly`;
  const dupe = await recentByDedupeKey(supabase, dedupeKey, RATE_WINDOW_MS);
  if (dupe) return;

  const name = opts.restaurantName ?? 'Unknown restaurant';
  const summaryBody =
    `[OMRI ALERT] ${name}\n` +
    `${opts.recentCount}+ failures in the last hour — likely systemic.\n` +
    `Check /admin/health and recent alerts_log rows.`;

  const [smsResult, emailResult] = await Promise.all([
    sendTwilioSms(summaryBody).catch((err) => ({ success: false as const, error: err })),
    sendAlertEmail({ subject: `[OMRI ALERT] ${name} — systemic failures`, body: summaryBody }).catch(
      (err) => ({ success: false as const, error: err })
    ),
  ]);

  const sentVia = ((): 'sms' | 'email' | 'both' | 'none' => {
    if (smsResult.success && emailResult.success) return 'both';
    if (smsResult.success) return 'sms';
    if (emailResult.success) return 'email';
    return 'none';
  })();

  await supabase.from('alerts_log').insert({
    restaurant_id: opts.restaurantId,
    failure_type: 'tool_failure_summary',
    short_reason: `${opts.recentCount}+ failures in last hour`,
    dedupe_key: dedupeKey,
    sent_via: sentVia,
    sms_provider: smsResult.success ? 'twilio' : null,
    metadata: { recent_count: opts.recentCount },
  });
}

// ---------------------------------------------------------------------------
// Message formatting
// ---------------------------------------------------------------------------

function formatAlertBody(opts: {
  restaurantName: string;
  failureType: AlertFailureType;
  shortReason: string;
  retellCallId: string | null;
  actionHint: string;
}): string {
  const nowLocal = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
  });
  const lines = [
    `[OMRI ALERT] ${opts.restaurantName}`,
    `${prettyFailureType(opts.failureType)}: ${opts.shortReason}`,
  ];
  if (opts.retellCallId) lines.push(`Call ID: ${opts.retellCallId}`);
  lines.push(`Time: ${nowLocal} PT`);
  if (opts.actionHint) lines.push(opts.actionHint);
  return lines.join('\n');
}

function prettyFailureType(t: AlertFailureType): string {
  switch (t) {
    case 'retell_call_error':
      return 'Retell call error';
    case 'premature_hangup':
      return 'Premature hangup';
    case 'tool_call_failure':
      return 'Tool call failed';
    case 'payment_link_failure':
      return 'Payment link failed';
    case 'silent_line':
      return 'Silent line';
    case 'silent_line_summary':
      return 'Silent line (summary)';
    case 'tool_failure_summary':
      return 'Systemic failures';
  }
}

function defaultActionHint(t: AlertFailureType): string {
  switch (t) {
    case 'payment_link_failure':
      return 'Check Square API status + restaurant Square credentials.';
    case 'retell_call_error':
      return 'Check Retell dashboard for this call, confirm Twilio SIP trunk healthy.';
    case 'premature_hangup':
      return 'Pull the transcript — caller may have hit IVR loop or agent crash pre-greeting.';
    case 'tool_call_failure':
      return 'Check Sentry for the tool route stack trace.';
    case 'silent_line':
      return 'Confirm Twilio number still forwards to Retell SIP.';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Twilio SMS (direct REST — NOT through /api/sms which is GHL-first)
// ---------------------------------------------------------------------------

function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return phone;
}

async function sendTwilioSms(body: string): Promise<{ success: true } | { success: false; error: string }> {
  const to = process.env.FOUNDER_ALERT_PHONE;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!to || !accountSid || !authToken || !from) {
    return { success: false, error: 'twilio env vars missing' };
  }

  const params = new URLSearchParams();
  params.append('To', normalizePhoneE164(to));
  params.append('From', normalizePhoneE164(from));
  params.append('Body', body);

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return { success: false, error: `twilio ${res.status}: ${errBody.slice(0, 200)}` };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Email (Resend)
// ---------------------------------------------------------------------------

async function sendAlertEmail(opts: {
  subject: string;
  body: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FOUNDER_ALERT_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL || 'OMRI Alerts <alerts@omriapp.com>';
  if (!apiKey || !to) return { success: false, error: 'resend env vars missing' };

  const html = `<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;white-space:pre-wrap;line-height:1.5;">${escapeHtml(opts.body)}</div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject: opts.subject, html, text: opts.body }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return { success: false, error: `resend ${res.status}: ${errBody.slice(0, 200)}` };
  }
  return { success: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function loadRestaurant(
  supabase: SupabaseClient,
  restaurantId: string | null | undefined
): Promise<{ id: string; name: string; alerts_enabled: boolean } | null> {
  if (!restaurantId) return null;
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, alerts_enabled')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; name: string; alerts_enabled: boolean };
}

/**
 * Convenience helper for the common "tool route just hit an error branch" case.
 * Used by tool route handlers so they don't have to assemble the full opts bag.
 */
export async function reportToolFailure(opts: {
  toolName: string;
  restaurantId?: string | null;
  retellCallId?: string | null;
  shortReason: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await sendFounderAlert({
    failureType: 'tool_call_failure',
    restaurantId: opts.restaurantId,
    retellCallId: opts.retellCallId,
    shortReason: `${opts.toolName}: ${opts.shortReason}`,
    metadata: { tool: opts.toolName, ...(opts.metadata ?? {}) },
  });
}
