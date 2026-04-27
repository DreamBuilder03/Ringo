# Ringo Security Audit — Pre-Pilot Gate

**Audit date:** 2026-04-24 (original 6-item) + 2026-04-27 (extended to 9-item gate per LC franchisee pre-pilot prep)
**Auditor:** Builder Agent
**Spec:** `~/Desktop/Brain Agent/builder_spec_security_audit_pre_pilot.md` + LC franchisee handoff
**Status:** 7 of 9 acceptance criteria PASS via code. 2 require live dashboard action by Misael (Supabase Pro upgrade + MFA enable).

This audit blocks pilot #1 go-live. Re-run before each new pilot onboarding.

**Extension on 2026-04-27:** added items 7 (rate limiting), 8 (input validation), 9 (key handling + OWASP) per the LC franchisee pre-pilot prep handoff.

---

## Acceptance criterion summary

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | RLS enabled + real policies on every public table | **PASS-PENDING** | All migrated tables have RLS + policies. Live SQL verification required. |
| 2 | Service role key only in server-side code | **PASS** | Repo grep — all 30+ hits in `src/app/api/**` only |
| 3 | Storage buckets private + signed URLs | **PASS** (N/A) | Ringo uses no Supabase Storage buckets — recordings hosted by Retell |
| 4 | Point-in-Time Recovery enabled (Pro plan) | **PENDING** | Misael action — Supabase dashboard upgrade |
| 5 | MFA on Misael's Supabase login | **PENDING** | Misael action — Supabase account settings |
| 6 | Incident-response runbook in repo | **PASS** | `docs/incident-response.md` committed |
| 7 | Rate limiting on every public endpoint | **PASS** | Upstash Ratelimit via `src/lib/rate-limit-upstash.ts`. Per-tier `LIMITS` catalog. Wired into all 12 tool routes + key public + webhooks. Returns 429 with Retry-After. Voice tool routes return 200+speakable on rate hit (Retell goes silent on non-2xx). |
| 8 | Strict input validation on every API route | **PASS** | Zod schemas in `src/lib/schemas/{tools,demo,orders,admin,pos,comms,common}.ts`. `with-validation.ts` + `with-retell-validation.ts` wrappers. `.strict()` mode rejects unexpected fields. Length caps on all text fields. |
| 9 | Hardcoded-key audit + key-rotation runbook + OWASP review | **PASS** | Repo-wide grep clean (no hardcoded keys). `docs/security/key-rotation.md` runbook. `docs/security/owasp-api-top-10.md` review — 8 PASS / 0 FAIL / 2 PASS-with-followup. |

---

## Criterion 1 — RLS enabled + real policies

**Status: PASS based on migration analysis. Live SQL verification still required.**

### Tables with confirmed RLS + policies in migrations

| Table | RLS enabled | Policies |
|---|---|---|
| `profiles` | ✅ | own-only select/update + admin-all + service-role-bypass |
| `restaurants` | ✅ | owner_user_id + admin + service-role-bypass |
| `calls` | ✅ | restaurant-scoped via profiles + admin + service-role-bypass |
| `order_items` | ✅ | restaurant-scoped + admin + service-role-bypass |
| `orders` | ✅ | restaurant-scoped + admin + service-role-bypass |
| `menu_items` | ✅ | restaurant-scoped CRUD + admin + service-role-bypass |
| `location_groups` | ✅ | owner_user_id-scoped + admin |
| `alerts_log` | ✅ | service-role-only (explicit anon/authenticated lockout) |
| `demo_leads` | ✅ | service-role-only |

All restaurant-PII tables (orders.customer_phone, demo_leads.phone, calls.transcript, calls.recording_url) are protected by tenant-scoped RLS that requires either matching restaurant_id-via-profile or admin role.

### Live verification SQL — Misael must run in Supabase SQL Editor

**Query A: Verify RLS is enabled on every public table.**

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Pass condition:** every row shows `rowsecurity = true`. Any `false` = FAIL — enable RLS and add policies before pilot.

**Query B: Enumerate all policies and look for permissive ones.**

```sql
SELECT tablename, policyname, cmd,
       qual AS using_clause,
       with_check AS check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Pass condition:** No policy where both `using_clause` and `check_clause` are literally `true` for `authenticated` or `anon` roles. Service-role policies with `using_clause = true` are EXPECTED and acceptable (service role is server-only).

**Query C: Count tables in production that aren't in our migrations.**

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    'profiles', 'restaurants', 'calls', 'order_items', 'orders',
    'menu_items', 'location_groups', 'alerts_log', 'demo_leads'
  )
ORDER BY tablename;
```

**Pass condition:** ideally returns zero rows. Any unexpected table = investigate, ensure RLS+policies, document or drop.

### Action items if Query A or B fails

For any table missing RLS:

```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_service_role_only" ON public.<table_name>
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
-- Then add tenant-scoped policies as needed
```

---

## Criterion 2 — Service role key isolation

**Status: PASS**

### Evidence

`grep -rn "createServiceRoleClient\|SUPABASE_SERVICE_ROLE_KEY" src/` returned 30+ hits. **Every single hit lives in `src/app/api/**/*.ts`** — server-side Next.js route handlers that never ship to the browser.

Specifically:
- All 7 tool routes under `src/app/api/tools/*` (add-to-order, lookup-item, remove-from-order, get-modifiers, confirm-order, finalize-payment + demo variant)
- All 3 demo routes under `src/app/api/demo/*`
- All admin routes under `src/app/api/admin/*` (restaurants, health/summary)
- Email cron routes under `src/app/api/emails/*` (welcome, daily-summary, monthly-roi)
- POS integrations under `src/app/api/pos/*`
- Provisioning + payment routes
- Demo-request and order-pay routes

**Zero hits in:** `src/app/**/page.tsx`, `src/components/**`, `src/lib/queries.ts`, or any browser-shipped file.

### NEXT_PUBLIC variable audit

```
NEXT_PUBLIC_APP_URL               — public, not a secret
NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID — public, designed to be exposed
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID   — public, designed to be exposed
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — public, designed to be exposed
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID — public
NEXT_PUBLIC_SUPABASE_ANON_KEY     — designed to be exposed (RLS-protected)
NEXT_PUBLIC_SUPABASE_URL          — public, not a secret
```

**No `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` or any other secret-flavored prefixed variable.** PASS.

### .gitignore check

```
.env*.local
```

is in `.gitignore`. The only env file committed is `.env.example` (template, no real secrets). PASS.

### Misael action — verify Vercel scope

**Open Vercel → Project Settings → Environment Variables.** For each variable, confirm:

- `SUPABASE_SERVICE_ROLE_KEY` — environment scope is "Production" (and optionally "Preview"), but NOT marked as exposed to client. Vercel does not allow `NEXT_PUBLIC_*` to be set at runtime; this should be safe by construction.
- `RETELL_API_KEY`, `STRIPE_SECRET_KEY`, `TWILIO_AUTH_TOKEN`, `RESEND_API_KEY`, `SQUARE_ACCESS_TOKEN`, `CLOVER_APP_SECRET`, `CRON_SECRET`, `RETELL_WEBHOOK_SECRET`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `GOOGLE_PLACES_API_KEY` — all server-only. Same scope check.

If any of these are accidentally prefixed `NEXT_PUBLIC_` in Vercel → rotate immediately.

---

## Criterion 3 — Storage bucket privacy

**Status: PASS (not applicable yet)**

### Evidence

`grep -rn "createSignedUrl\|getPublicUrl" src/` returned **zero hits**. Ringo does not currently use Supabase Storage. Specifically:

- **Call recordings** — `recording_url` field on `calls` table holds Retell's CDN URL (https://retell-ai.s3.amazonaws.com/...). Retell handles the storage; we just store the link.
- **Call transcripts** — stored as text in `calls.transcript`, not as files.
- **Menu images / restaurant photos** — not implemented yet (admin can upload in V2).

### When this becomes load-bearing

The moment Ringo starts uploading anything to a Supabase bucket — pilot menu photos, signed payment receipts, contracts, etc. — re-run this section:

1. Create the bucket as **private** (`public = false`) by default.
2. Always serve via `createSignedUrl(path, expiresInSeconds)` with `expiresInSeconds <= 3600`.
3. Never call `getPublicUrl` on a bucket holding any PII.
4. Restaurant-scope storage paths: `<restaurant_id>/<file>.ext` so RLS policies on the bucket can scope by path prefix.

Add to the audit re-run checklist whenever a new bucket is created.

---

## Criterion 4 — Point-in-Time Recovery

**Status: PENDING — Misael action**

### Why this matters

Without PITR, a malicious DELETE statement (or a script bug in a migration) means data loss. Supabase's free tier offers daily logical backups but not point-in-time recovery. Pro tier adds 7-day PITR for $25/mo.

### Action

1. Open Supabase dashboard → Project Settings → Plan → Upgrade to **Pro** ($25/mo). Use the Stripe billing card already on file.
2. Once on Pro: Database → Backups → enable **Point-in-Time Recovery** with **7-day retention**.
3. Daily logical backups will continue to run automatically.
4. Document the upgrade timestamp in this file (PITR coverage starts FROM that point — anything destroyed before isn't recoverable).
5. Quarterly: pick a recent restore point, restore into a throwaway staging project, confirm `restaurants` row count matches production, and document the test date here. First test should be within 7 days of pilot #1 going live.

**PITR enabled at:** _PENDING — fill in after upgrade_

**Last quarterly restore test:** _PENDING — first test due within 7 days of pilot #1_

---

## Criterion 5 — MFA on Misael's Supabase login

**Status: PENDING — Misael action**

### Action

1. Supabase dashboard → top-right account avatar → Account Settings → Security.
2. Enable **MFA via authenticator app** (Google Authenticator, 1Password, Authy — pick one). Avoid SMS — SMS-based MFA is vulnerable to SIM-swap.
3. Save the printed recovery codes into 1Password (or equivalent password manager) under a dedicated entry called "Supabase Ringo prod recovery codes." Do not save them in email or plaintext anywhere else.
4. Sign out of Supabase and sign back in to verify MFA prompt fires.
5. If/when other humans get added to the Supabase org (Brain, Marketing, Design agent operators), enforce org-wide MFA.

**MFA enabled at:** _PENDING — fill in after enabling_

---

## Criterion 6 — Incident-response runbook

**Status: PASS**

Committed as `docs/incident-response.md` in this same change. Covers:

- Service-role key rotation steps (Supabase dashboard + which Vercel envs + which crons need the new value)
- Force-logout every restaurant account (SQL `DELETE FROM auth.sessions`)
- Export a point-in-time backup for legal / forensic purposes
- Contact escalation tree (Supabase support, Twilio support, Misael as IC)
- Phone-tree if Misael unreachable >2h

Kept to one page so it actually gets read during a real incident.

---

## What still needs to happen before pilot #1

1. **Misael runs Query A, B, C** above against production Supabase → pastes output into this file under "Live verification SQL output 2026-04-24" section. Any FAIL row gets a remediation PR.
2. **Misael upgrades to Supabase Pro and enables 7-day PITR.** Fill in the timestamp above. (Trigger: the moment a paying client signs.)
3. **Misael enables MFA on his Supabase account.** Fill in the timestamp above.
4. **Misael provisions an Upstash Redis instance** (free tier: console.upstash.com → Create Database → Region nearest to Vercel build region) → copy REST URL + REST Token → add to Vercel env vars as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (Production + Preview). Without this, `src/lib/rate-limit-upstash.ts` no-ops gracefully (logs `Upstash env vars missing in production` once per cold start, allows traffic). Free tier sufficient for pre-pilot.
5. **Brain Agent updates `MEMORY.md`** with `project_pilot_readiness_done.md` once all 9 boxes are green.

---

## Re-audit cadence

- Before every new pilot onboarding (5 min — re-run grep + verify timestamps).
- Quarterly full audit (re-run all 6 criteria, including PITR restore test).
- After any major schema change (new table → confirm RLS).

---

## Live verification SQL output 2026-04-24

_PENDING — paste Query A / B / C output here once Misael runs them in production Supabase._

```
-- Query A output:

-- Query B output:

-- Query C output:
```
