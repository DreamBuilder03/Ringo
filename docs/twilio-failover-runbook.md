# Twilio Retell-health failover — runbook

Closes Multi-Test scenario #21. Two layers of defense if Retell goes down:

1. **Reactive** — `/api/twilio/voice-fallback` returns TwiML so customers don't hear silence and get forwarded to staff (or voicemail).
2. **Proactive** — `/api/cron/retell-health-check` runs every 5 min, pages founder within ~10 min of any Retell outage.

## One-time setup per Twilio number

For every OMRI-provisioned Twilio number, in Twilio Console → Phone Numbers → click the number → Voice & Fax tab:

| Field                           | Value                                                                |
|---------------------------------|----------------------------------------------------------------------|
| **A CALL COMES IN** (primary)   | SIP Trunk → `OMRI` (TK08534…) — the existing config, do not change   |
| **PRIMARY HANDLER FAILS**       | Webhook → `https://joinomri.com/api/twilio/voice-fallback` (HTTP POST)|

Click **Save**. That's it. Twilio invokes the fallback URL whenever the primary SIP route returns 5xx, times out, or otherwise fails.

## Verify the fallback handler is reachable

```bash
curl https://joinomri.com/api/twilio/voice-fallback
```

Expected: `200` with `<?xml version="1.0" …><Response><Say…>OMRI fallback handler is online.</Say></Response>`

## What the customer hears when failover fires

If the restaurant has `staff_phone_number` set:
1. "Thanks for calling [restaurant name]. One moment, connecting you to the team."
2. Twilio rings the staff number for 20 seconds.
3. If staff answers: bridged call (caller ID preserved).
4. If staff doesn't answer in 20s: "Sorry, no one's available right now. Please leave a brief message…" → 60-second voicemail recording.

If the restaurant does NOT have `staff_phone_number` set:
1. "Thanks for calling [restaurant name]. We can't take your call right now. Please leave a brief message…"
2. 60-second voicemail recording.

The customer never hears "our AI is down" — to them it's just "the restaurant's voicemail."

## What the founder gets

On every failover invocation:
- SMS + email within 60 seconds via `sendFounderAlert`
- Subject/body: `[OMRI ALERT] [restaurant] — Voice fallback fired — Twilio fallback fired for [restaurant] — Retell SIP unreachable`
- Action hint: tells the founder whether the caller was forwarded or went to voicemail

On the proactive cron detecting a 2nd consecutive failure (~10 min lag worst case):
- One SMS + email tagged `Retell upstream down`
- Suppressed for 30 min after the first alert (no spam during a long outage)

## Required environment variables

| Var                       | Required for                              | If missing                                 |
|---------------------------|-------------------------------------------|--------------------------------------------|
| `TWILIO_AUTH_TOKEN`       | Twilio webhook signature verification     | Soft-fails — accepts unsigned (dev mode)   |
| `RETELL_API_KEY`          | Health-check cron's probe                 | Cron skips, no alert                       |
| `CRON_SECRET`             | Vercel Cron auth                          | All crons return 401                       |
| `FOUNDER_ALERT_PHONE`     | Founder SMS pager                         | No SMS sent (email still fires)            |
| `FOUNDER_ALERT_EMAIL`     | Founder email pager                       | No email sent                              |

## Testing the failover end-to-end without breaking Retell

The cleanest test: in Twilio Console, temporarily set the number's primary "A CALL COMES IN" to a deliberately broken URL (`https://joinomri.com/this-route-does-not-exist`), keep the fallback URL pointed at our handler, then call the number from a phone. Twilio will fail the primary, hit the fallback, and you'll hear the friendly message + get the founder SMS.

Restore the SIP trunk config when done.

## Tier requirements

The `*/5 * * * *` (every-5-min) cron schedule requires Vercel **Pro** tier. On Hobby tier the deploy will fail with `cron-too-frequent` — see also the silent-deploy-failure recipe in MEMORY.md. We're already on Pro since `silent-line-check` exists.

## Why we don't gate calls on the proactive probe

Even when the probe says Retell is down, real calls still attempt the SIP route. The probe and the production SIP path can disagree (different Retell endpoints, different network paths). Routing all customer calls to fallback based on a flaky probe would be worse than letting Twilio's per-call SIP failure detection handle it. The probe's only job is "tell Misael there's a problem" — not "redirect traffic."
