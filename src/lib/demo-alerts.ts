/**
 * Lead alerts for the website Live Demo flow.
 *
 * When a visitor finishes a demo call we want to page a human right away so we can
 * follow up while the lead is warm. This module sends a Slack DM + a templated email.
 * Both sinks are optional — if env vars are missing we silently no-op.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type DemoLead = {
  id: string;
  restaurant_name: string | null;
  restaurant_address: string | null;
  restaurant_phone: string | null;
  cuisine_type: string | null;
  locations_count: string | null;
  pos_system: string | null;
  features_interested: string[] | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  demo_language: string | null;
  retell_web_call_id: string | null;
  alerted_at: string | null;
};

function fmtDuration(sec: number | null | undefined): string {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export async function alertDemoLead(opts: {
  supabase: SupabaseClient;
  retellCallId: string;
  durationSec: number | null;
  transcript: string | null;
  transcriptUrl?: string | null;
}) {
  const { supabase, retellCallId, durationSec, transcript, transcriptUrl } = opts;

  // Only proceed if a demo_leads row exists for this call (i.e. it came from the website flow).
  const { data: lead } = await supabase
    .from('demo_leads')
    .select(
      'id, restaurant_name, restaurant_address, restaurant_phone, cuisine_type, locations_count, pos_system, features_interested, full_name, phone, email, demo_language, retell_web_call_id, alerted_at'
    )
    .eq('retell_web_call_id', retellCallId)
    .maybeSingle();

  if (!lead) return; // not a demo call
  if (lead.alerted_at) return; // already alerted

  // Close out the lead row regardless of whether alerts fire.
  await supabase
    .from('demo_leads')
    .update({
      status: 'demo_completed',
      demo_ended_at: new Date().toISOString(),
      demo_duration_seconds: durationSec,
      demo_transcript: transcript,
      alerted_at: new Date().toISOString(),
    })
    .eq('id', lead.id);

  await Promise.allSettled([sendSlack(lead, durationSec, transcriptUrl), sendEmail(lead, durationSec, transcript)]);
}

async function sendSlack(lead: DemoLead, durationSec: number | null, transcriptUrl?: string | null) {
  const url = process.env.DEMO_ALERT_SLACK_WEBHOOK;
  if (!url) return;

  const featureList = (lead.features_interested || []).join(', ') || '—';
  const lines = [
    `:telephone_receiver: *New demo lead* — ${lead.restaurant_name || 'Unknown restaurant'}`,
    `*Contact:* ${lead.full_name || '—'} · ${lead.phone || '—'} · ${lead.email || '—'}`,
    `*Restaurant:* ${lead.restaurant_address || '—'} · ${lead.cuisine_type || '—'}`,
    `*Scale:* ${lead.locations_count || '—'} location(s), POS: ${lead.pos_system || '—'}`,
    `*Wants:* ${featureList}`,
    `*Demo:* ${fmtDuration(durationSec)} · ${lead.demo_language || 'en'}${transcriptUrl ? ` · <${transcriptUrl}|recording>` : ''}`,
  ];

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
    });
  } catch (err) {
    console.error('[demo-alerts] slack failed', err);
  }
}

async function sendEmail(lead: DemoLead, durationSec: number | null, transcript: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_ALERT_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL || 'notifications@useringo.ai';
  if (!apiKey || !to) return;

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;color:#F3EEE3;">
      <h2 style="margin:0 0 8px">New demo lead — ${escape(lead.restaurant_name || 'Unknown')}</h2>
      <p style="margin:0 0 16px;color:#2E2E2E">Reach out while they're warm.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row('Name', lead.full_name)}
        ${row('Phone', lead.phone)}
        ${row('Email', lead.email)}
        ${row('Restaurant', lead.restaurant_name)}
        ${row('Address', lead.restaurant_address)}
        ${row('Cuisine', lead.cuisine_type)}
        ${row('Locations', lead.locations_count)}
        ${row('POS', lead.pos_system)}
        ${row('Wants', (lead.features_interested || []).join(', '))}
        ${row('Demo length', fmtDuration(durationSec))}
        ${row('Language', lead.demo_language)}
      </table>
      ${transcript ? `<h3 style="margin:24px 0 8px">Transcript</h3><pre style="white-space:pre-wrap;background:#141414;padding:12px;border-radius:8px;font-size:13px;">${escape(transcript.slice(0, 5000))}</pre>` : ''}
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New demo lead: ${lead.restaurant_name || 'Unknown restaurant'}`,
        html,
      }),
    });
  } catch (err) {
    console.error('[demo-alerts] email failed', err);
  }
}

function row(label: string, value: string | null | undefined): string {
  return `<tr><td style="padding:6px 10px;background:#141414;color:#2E2E2E;width:140px">${label}</td><td style="padding:6px 10px">${escape(value || '—')}</td></tr>`;
}
function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
