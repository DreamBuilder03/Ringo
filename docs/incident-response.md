# Incident Response — Ringo Production

**Owner:** Misael Rodriguez Rivera (incident commander)
**Pager:** Build 2 founder alerts → SMS to `FOUNDER_ALERT_PHONE` + email to `FOUNDER_ALERT_EMAIL`
**Last updated:** 2026-04-24

If you are reading this during an active incident, jump to the section that matches what's broken. Don't read top-to-bottom.

---

## Quick triage (start here)

1. Open `/admin/health` in your browser → look for red cards on the fleet strip.
2. Check your phone for unread Build 2 founder alerts (SMS + email both fire on the same incident).
3. Open Vercel dashboard → Functions → check error rate spike.
4. Open Supabase dashboard → Database → Performance → check connection saturation.

If `/admin/health` itself is down: try the Supabase dashboard directly. If both are down: it's likely a Vercel or Supabase outage, not Ringo. Check status.vercel.com and status.supabase.com.

---

## Incident: Service-role key compromised

**Symptoms:** unexpected writes to your tables, alerts firing for tools you didn't trigger, suspicious entries in `alerts_log`, or the key visible somewhere it shouldn't be.

**Action — execute in this order, fast:**

1. **Rotate the key.** Supabase dashboard → Project Settings → API → "service_role" row → Reset.
2. **Update the new key in Vercel.** Vercel project → Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY` → edit → paste new value → Save. Trigger a redeploy from the latest commit.
3. **Update local `.env.local`** for your dev box.
4. **Restart cron jobs.** Vercel automatically picks up new env vars on next invocation, but if you want to force a clean state, manually trigger `/api/emails/daily-summary` and `/api/cron/silent-line-check` once with the `Bearer ${CRON_SECRET}` header to confirm the new key works.
5. **Audit `alerts_log`** for the past 7 days for anything weird, since the compromised key could have triggered alerts. Confirm nothing was deleted from `restaurants`, `orders`, `calls`.
6. **If PII may have been exposed:** within 72 hours, notify any restaurant whose data was potentially read (TCPA + state breach laws). Consult legal first.

**Files / configs touched:** Vercel env, `.env.local`, no code change.

---

## Incident: Need to force-logout every restaurant account

**Symptoms:** stolen credential alert from a restaurant owner, suspected session hijack, mid-rotation cleanup.

**Action:**

```sql
-- In Supabase SQL Editor:
DELETE FROM auth.sessions;
-- Optionally also revoke refresh tokens:
DELETE FROM auth.refresh_tokens;
```

This will force every authenticated user to log in again. They will keep their existing accounts and data — only the active session is invalidated.

To force-logout a single user instead:

```sql
DELETE FROM auth.sessions WHERE user_id = '<user-uuid>';
```

You can also do this through the Supabase dashboard → Authentication → Users → click user → "Sign out user."

---

## Incident: Need to export a point-in-time backup

**Use case:** a restaurant disputes an order, you need legal-quality evidence of state at a specific timestamp. Or your last migration trashed a table and you need to roll back.

**Action (requires Supabase Pro plan with PITR enabled — Build 4 criterion #4):**

1. Supabase dashboard → Database → Backups → Point-in-Time Recovery.
2. Click "Restore from PITR." Choose a target timestamp (UTC).
3. Restore destination: a new staging project, NOT production. Never restore over production unless you're explicitly rolling back.
4. Once the restore finishes (~5-30 min depending on database size), use Supabase's Studio to query the restored database.
5. For legal export: use `pg_dump` against the restored database with `--data-only` for the relevant tables, or query and CSV-export from the SQL Editor.

If PITR isn't available: rely on Supabase's daily logical backups (less granular — you get the database as-of midnight UTC). Same restore-into-staging flow.

---

## Incident: Twilio number went down (calls not coming in)

**Symptoms:** silent-line-check cron fires (Build 2 alert: `silent_line` failure type) for a restaurant during business hours; restaurant owner calls saying "my Ringo phone isn't ringing."

**Triage:**

1. Open Twilio Console → Phone Numbers → confirm the affected number is still active and correctly forwards to the Retell SIP trunk (`useringo-ai.pstn.twilio.com`).
2. Open Retell dashboard → Agents → confirm the agent attached to that number is still published and not in a Draft state.
3. Make a test call from your own phone to confirm what the caller actually hears.

**If Twilio routing is broken:** Twilio support phone is on the Twilio dashboard footer. Open a ticket — typical response 1-4h. Pro tip: tag with "Production Down" if you're paying for a support plan.

**If Retell agent is broken:** check if a Draft replaced the published version (this happened to Brain on 2026-04-24). Re-publish from the History sidebar.

---

## Incident: Square Payment Link API failing

**Symptoms:** Build 2 alert with `payment_link_failure` failure type. Restaurant's `finalize_payment` calls all 5xx.

**Triage:**

1. Check `https://status.squareup.com/` for an active Square API outage. If yes, wait it out — there's nothing to do on our end.
2. If only one restaurant is affected: open Supabase → `restaurants` table → row for that restaurant → confirm `square_access_token` and `square_location_id` are still set and not expired.
3. If many restaurants are affected and Square status is green: check Vercel function logs for the specific Square API error message. Common culprits: idempotency_key collision, location_id mismatch, expired token.

**If a restaurant's Square OAuth token has expired:** they need to re-authorize. Send the SMS handover (template in `~/Desktop/Brain Agent/pilot_onboarding_playbook.md`).

---

## Incident: Vercel deployment failing

**Symptoms:** push to `main` doesn't go green; Vercel shows build error.

**Action:**

1. Open Vercel dashboard → Deployments → click the failing deployment → read the build log.
2. Common causes: missing env var (Vercel does NOT inherit local `.env.local`); TypeScript error in a new file; import path typo.
3. Fix locally, commit, push. Don't try to "fix forward" by editing in Vercel directly.
4. If you need to revert: Vercel → Deployments → find the last green deployment → "Promote to Production." This is a 5-second rollback.

---

## Incident: Misael unreachable for >2h

**Defined as:** founder alert SMS bouncing (number disconnected) AND Misael's email auto-reply says "out of office" or no reply within 2h.

**Action:**

1. Builder Agent (or whoever is online) checks `/admin/health` for severity. If everything is green, no action — wait for Misael.
2. If something is red:
   - For database / auth incidents: Supabase support has 1-business-day SLA on the Pro plan. Open a ticket with description "Production database issue — need help while founder is unreachable." Email: `support@supabase.com`.
   - For Retell incidents: Retell support, `support@retellai.com`.
   - For Vercel: Vercel support is community-tier on free, paid-tier with response SLA.
   - DO NOT make changes that affect billing, account ownership, or DNS without Misael's explicit prior approval.
3. Document everything you do in this file under "Incident log" (append-only).

---

## Contact tree

| Service | Contact | Tier / SLA |
|---|---|---|
| Misael (incident commander) | (209) 312-0771 + rodriguezriverm@gmail.com | Always-on |
| Supabase support | support@supabase.com (Pro tier with 1-business-day SLA) | Pro plan |
| Twilio support | console.twilio.com → Help → Get Support | Per support plan |
| Retell support | support@retellai.com | Per Retell plan |
| Vercel support | vercel.com/help → file a ticket | Free tier = community-only |
| Stripe support | dashboard.stripe.com → Help → Contact us | 24h response |
| Square Developer support | developer.squareup.com → support | 1-2 business days |

---

## Incident log (append-only)

Every real production incident gets a one-paragraph entry here. Date, what happened, what we did, what we changed to prevent recurrence.

### 2026-04-24 — Build 4 audit baseline

No active incident. This file was committed as part of the pre-pilot security audit (Build 4). First real incident entry will follow.
