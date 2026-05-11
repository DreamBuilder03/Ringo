# Twilio Retell-health failover — runbook

Closes Multi-Test scenario #21. Two layers of defense if Retell goes down:

1. **Reactive** — `/api/twilio/voice-fallback` returns TwiML so customers don't hear silence and get forwarded to staff (or voicemail).
2. **Proactive** — `/api/cron/retell-health-check` runs every 5 min, pages founder within ~10 min of any Retell outage.

## One-time setup at the SIP trunk

OMRI numbers are routed via the `RIngo` SIP Trunk (TK08534d9f50514dd1b932af8b2ac94b4e), not via per-number webhooks. When "Configure with: SIP Trunk" is selected on a number, Twilio does NOT expose a per-number "Primary handler fails" field — the fallback for SIP-routed inbound is configured at the **trunk level** under "Disaster Recovery." Setting it there covers every number attached to the trunk in one shot.

In Twilio Console → Elastic SIP Trunking → Manage → Trunks → `RIngo` → **Origination** tab → scroll to **Disaster Recovery**:

| Field                  | Value                                                  |
|------------------------|--------------------------------------------------------|
| Disaster Recovery URL  | `https://joinomri.com/api/twilio/voice-fallback`       |
| Fallback Method        | `POST`                                                 |

Click **Save**. Confirmation: green "Trunk updated." toast.

This covers both 209-739-3549 (Primary, Modesto) and 209-427-1157 (Turlock) and any future numbers added to the trunk. Twilio invokes the fallback whenever the Origination SIP URI (Retell's LiveKit endpoint) returns errors, is unreachable, or times out.

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

The proactive `/api/cron/retell-health-check` cron requires Vercel **Pro** tier. The project is currently on **Hobby** — adding a sub-daily schedule to `vercel.json` silently fails the entire deploy. The route file is committed and the manual-trigger curl works (with `CRON_SECRET`), but Vercel cron is not wired up.

When the project moves to Pro, add this to `vercel.json`:

```json
{ "path": "/api/cron/retell-health-check", "schedule": "*/5 * * * *" }
```

Until then, scenario #21 relies on the reactive Twilio Disaster Recovery URL alone. That's fine for customer experience (every call still gets handed to staff or voicemail), but founder paging is delayed from "~10 min after outage starts" to "until the next inbound call after the outage starts."

## Why we don't gate calls on the proactive probe

Even when the probe says Retell is down, real calls still attempt the SIP route. The probe and the production SIP path can disagree (different Retell endpoints, different network paths). Routing all customer calls to fallback based on a flaky probe would be worse than letting Twilio's per-call SIP failure detection handle it. The probe's only job is "tell Misael there's a problem" — not "redirect traffic."
