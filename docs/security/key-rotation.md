# Ringo — API Key Rotation Runbook

**When to use:** scheduled rotation (every 90 days), suspected key compromise, employee/contractor offboarding, public exposure (key pasted to a screenshot, GitHub gist, Slack channel etc.).

Every key below lives in **one place only**: Vercel Environment Variables for that project. Local `.env.local` is dev-only and is in `.gitignore`. Anywhere a key appears in logs, screenshots, or chat → assume compromise.

For each provider: rotate, update Vercel, redeploy, audit traffic for the rotation window.

---

## 1. Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`)

Highest blast radius — bypasses RLS, can read/write any row in the public schema.

1. Supabase dashboard → Project Settings → API → "service_role" row → **Reset**.
2. Copy new key.
3. Vercel → ringo project → Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY` → **Edit** → paste new value → **Save**. Apply to Production + Preview environments.
4. Trigger a Vercel redeploy from the Deployments tab (Reset doesn't auto-redeploy).
5. Update `.env.local` on your dev box.
6. **Audit `alerts_log`** (last 7 days) for anything you didn't trigger. If you see writes to `restaurants`, `orders`, `calls`, or `handoff_orders` from unknown sources, the key was used — escalate.
7. If PII was potentially exposed (customer phone numbers, emails), within 72h notify any restaurant whose data may have been read (TCPA + state breach laws). Consult legal first.

---

## 2. Supabase anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

Public-by-design — RLS protects everything. Rotation only needed if you've broken RLS on a table and want to invalidate any tokens that were issued before the fix.

1. Supabase → Project Settings → API → "anon" row → **Reset**.
2. Vercel env var update (same flow as above).
3. Redeploy.
4. All authenticated users will need to sign in again (their JWTs were signed with the old key).

---

## 3. Retell API key (`RETELL_API_KEY`)

Used to provision agents, fetch transcripts, trigger outbound calls (post-Build-7 if/when warm-outbound ships).

1. Retell dashboard → Settings → API Keys → revoke old → create new.
2. Vercel env var update + redeploy.
3. Update `.env.local`.
4. Verify by hitting `/api/admin/health/summary` — Retell-fetched fields should still populate.

## 3a. Retell webhook secret (`RETELL_WEBHOOK_SECRET`)

Validates inbound webhooks at `/api/webhooks/retell`.

1. Retell dashboard → Webhooks → rotate secret.
2. Vercel env var update + redeploy.
3. Briefly during rotation window, some webhook deliveries may fail signature validation — Retell retries on non-2xx, so events catch up after the new key is live.

---

## 4. Stripe (`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`)

Billing tier subscriptions only — no customer card data passes through Ringo (Stripe Hosted Checkout owns it).

1. Stripe dashboard → Developers → API keys → roll secret key.
2. Stripe dashboard → Developers → Webhooks → for the Ringo endpoint → **Roll secret**.
3. Vercel env var updates: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
4. Redeploy.
5. Trigger a test webhook from the Stripe dashboard to confirm delivery.

---

## 5. Twilio (`TWILIO_AUTH_TOKEN`)

SMS delivery + voice fallback. Caller IDs (`FOUNDER_ALERT_PHONE` etc.) are not secrets.

1. Twilio Console → Account → Auth Tokens → **Promote secondary** to primary.
2. Vercel env var update + redeploy.
3. After 24h with no failures, Twilio Console → revoke the now-orphaned old token.

---

## 6. Square (`SQUARE_ACCESS_TOKEN` + `SQUARE_WEBHOOK_SIGNATURE_KEY`)

Per-restaurant tokens are stored in `restaurants.square_access_token` (database, not env). The env-level token is only the **Ringo platform's** sandbox / merchant token used during OAuth dance.

1. Square Developer Dashboard → applications → Ringo → **Production** → revoke + regenerate access token.
2. Vercel env var update + redeploy.
3. Per-restaurant tokens auto-rotate on next OAuth refresh; for any restaurant whose token can't refresh, send the SMS handover (template in `~/Desktop/Brain Agent/pilot_onboarding_playbook.md`) to re-authorize.

---

## 7. Clover (`CLOVER_APP_SECRET`)

Same pattern as Square. Per-merchant tokens in DB; env-level is the Ringo Clover OAuth app secret.

1. Clover Developer Dashboard → Ringo app → Settings → reset secret.
2. Vercel env var update + redeploy.

---

## 8. Toast / SpotOn

Same pattern as Square/Clover. Refer to each provider's developer dashboard for the rotation flow. All Ringo env vars: `TOAST_*`, `SPOTON_*`.

---

## 9. GoHighLevel (`GHL_API_KEY` if present)

Used for SMS and CRM contact sync.

1. GHL → Settings → API → revoke + regenerate.
2. Vercel env var update + redeploy.

---

## 10. Resend (`RESEND_API_KEY`)

Transactional email (welcome, daily summary, monthly ROI, alert pages).

1. Resend dashboard → API Keys → delete old + create new.
2. Vercel env var update + redeploy.

---

## 11. Cron secret (`CRON_SECRET`)

Guards `/api/cron/*` and `/api/emails/*` cron-triggered routes.

1. Generate a fresh long random string: `openssl rand -hex 32`.
2. Vercel env var update.
3. Vercel cron config picks up the new secret automatically on next invocation.
4. Optional: manually trigger one cron route after rotation to confirm working.

---

## 12. Google Places (`GOOGLE_PLACES_API_KEY`)

Used by the demo flow to enrich restaurant lookups.

1. Google Cloud Console → APIs & Services → Credentials → API key → **Regenerate key**.
2. Vercel env var update + redeploy.
3. Application Restriction must be **None** (Vercel-proxied keys fail on referrer restrictions — see memory note).

---

## 13. Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`)

Used by `src/lib/rate-limit-upstash.ts`.

1. Upstash dashboard → Ringo Redis instance → REST API tab → reset token.
2. Vercel env var update + redeploy.
3. During rotation window, rate limiting briefly no-ops (limiter logs `Upstash env vars missing` once and falls through). New token live after redeploy.

---

## After every rotation — the always-do checklist

- [ ] Vercel env var updated in **Production AND Preview** scopes
- [ ] Redeploy triggered (not auto on env var change!)
- [ ] `.env.local` updated on dev machine
- [ ] Smoke test the affected routes
- [ ] Update this doc's "Last rotation" table at the bottom (audit trail)
- [ ] If a key was definitively compromised: file an incident note in `docs/incident-response.md` under "Incident log"

---

## Last rotation log

| Provider | Date | Reason | By |
|---|---|---|---|
| (initial) | 2026-04-27 | Runbook committed | Builder Agent |
| | | | |

Append a row each time. This is the audit trail.
