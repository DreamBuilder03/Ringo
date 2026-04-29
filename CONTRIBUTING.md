# Contributing to OMRI

Welcome. This is the playbook for making changes to the OMRI platform without breaking restaurant phones in the middle of dinner rush.

If you're reading this for the first time, **read the whole thing once**. After that, treat it as the rulebook — when something here conflicts with what feels easier, the rulebook wins.

---

## What OMRI is in 60 seconds

OMRI is an AI voice agent that answers inbound restaurant phone calls 24/7. It takes orders, upsells, sends an SMS payment link, and — only after payment clears — pushes the order to the restaurant's POS. Real customer phones, real money, every minute.

This means: **shipping a bug at 7pm on a Friday is the same as shutting down a restaurant's order line during their busiest hour.** Code accordingly.

---

## Local setup (one-time, ~5 minutes)

You need: Node 20.x, npm 10+, git.

```bash
# 1. Clone
git clone https://github.com/DreamBuilder03/OMRI.git
cd OMRI

# 2. Install
npm install

# 3. Env vars — copy the template and ask Misael for the real values
cp .env.example .env.local
# Then fill in .env.local. Production values live in Vercel.

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

If the dev server boots and `http://localhost:3000` renders the landing page, you're good.

---

## Branching strategy — trunk-based with PR review

We use a single long-lived branch (`main`) and short-lived feature branches.

- **`main`** is what's live in production on `www.omriapp.com`. Every commit on main auto-deploys to Vercel within ~2 minutes. **Never push directly to main.** Branch protection enforces this.
- **Feature branches** branch from `main`, get one or more commits, then open a PR back to `main`. Naming: `<type>/<short-description>`. Examples:
  - `feat/handoff-tablet-printer`
  - `fix/lookup-item-stopwords`
  - `chore/upgrade-next-15`
  - `docs/security-audit-q3`
- **Hotfix branches** are feature branches with extra urgency. Same flow, just faster review. Name: `hotfix/<what-broke>`.
- **Tags** mark releases. We tag the state of `main` at meaningful checkpoints (`v1.0-pre-pilot`, `v1.1-first-paying-client`, etc.) so we always have named, restorable versions. See [Tagging](#tagging) below.

We do NOT use Git Flow's `develop` branch. Trunk-based is faster for a small team and Vercel's preview deployments give us per-PR staging URLs for free.

---

## Commit messages — Conventional Commits

Format: `<type>(<scope>): <imperative summary>`

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ops`.

Good examples (from recent history):
- `fix(book): add /book route that 307-redirects to DEMO_BOOKING_URL`
- `B2: wire Upstash rate-limit + Zod into tool routes + key public routes`
- `ops: silent-line-check cron daily for Hobby tier (restore */30 on Pro)`

Bad examples (don't do this):
- `update stuff`
- `fix bug`
- `wip`

The body of the commit (after a blank line) is where you put the *why*, the context, and any callouts. Future-you reading `git log` six months from now will thank present-you.

---

## Pull request flow

1. Create branch from latest main: `git checkout main && git pull && git checkout -b feat/your-thing`
2. Make changes, commit using the Conventional Commits format above.
3. Push: `git push -u origin feat/your-thing`
4. Open a PR on GitHub. The [PR template](.github/pull_request_template.md) auto-loads — fill it in honestly.
5. Wait for **CI to go green** (the `build (gating)` check is required to pass).
6. Get a review from a CODEOWNER (today: `@DreamBuilder03`). Once collaborators join, the assignment is automatic via [`.github/CODEOWNERS`](.github/CODEOWNERS).
7. Merge using **Squash and merge** (keeps `main` history linear and readable).
8. Delete the branch after merge (GitHub does this automatically if you check the box).

---

## CI — what runs and what blocks

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs three jobs in parallel on every push to main and every PR:

| Job | Status | Behavior |
|---|---|---|
| `build` | **gating** | Fails the workflow. Must pass before merge. Mirrors what Vercel runs. |
| `test` | non-gating | Runs `npm test`. Reports pass/fail in PR checks but doesn't block merge — too many pre-existing failures (10 of 94) to gate today. Will be promoted to gating once the harness is fully green (see [CI ratcheting plan](#ci-ratcheting-plan)). |
| `lint` | non-gating | Runs `npm run lint`. Same logic — 128 pre-existing errors. Promoted to gating after cleanup. |

### CI ratcheting plan

Today: only `build` blocks. Plan to promote each non-gating job to gating once it's clean:

- **`test` → gating** when failing test count reaches 0. Tracked under tasks #51 and others.
- **`lint` → gating** when error count reaches 0. Mostly unused imports + `any` usages — quickest cleanup.
- **`typecheck` (new gating job)** to be added once `next.config.mjs`'s `typescript.ignoreBuildErrors` flag can be turned off (which requires fixing the existing TS errors in `mock-data.ts` and a few other files).

Don't merge a PR that *increases* the failing test count or lint error count, even if CI lets you (because non-gating). The point of ratcheting is to drive the count down, not let it grow.

---

## Database migrations

Migrations live in `supabase/migrations/` named `YYYY_MM_DD_<description>.sql`.

**Rules:**
1. Migrations are **idempotent** — every `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY` uses `IF NOT EXISTS` (or wrapped in a `DO $$ BEGIN ... END $$` block for things like policies that don't natively support `IF NOT EXISTS`). This means a migration can be safely re-run.
2. Migrations are **additive only** unless you have a very good reason. Don't `DROP COLUMN` or `DROP TABLE` casually — old deploys may still be reading the schema you're about to remove.
3. Always **enable RLS + write a service-role-only INSERT policy + tenant-scoped SELECT/UPDATE policies** for any new table that holds restaurant data. See `2026_04_27_handoff_mode.sql` for the canonical example.
4. Run the migration on a **Supabase staging clone first** if it touches a table with >1k rows. Misael keeps a clone for this.
5. After production run, **paste the SQL into the relevant docs/audit doc** so the audit trail is intact.

---

## Environment variables

Production env vars live in **Vercel** (project Settings → Environment Variables). They are NOT in the repo.

When adding a new env var:
1. Add the runtime usage in code: `process.env.YOUR_NEW_VAR`.
2. Add a placeholder line to `.env.example` with a comment explaining what it is.
3. Add the real value to Vercel for **Production AND Preview** (and Development if needed). Mark **Sensitive** if it's a secret.
4. Add it to [`docs/security/key-rotation.md`](docs/security/key-rotation.md) under the relevant provider section.
5. Trigger a Vercel redeploy — env var changes do NOT auto-redeploy. (Or push a new commit, which auto-deploys and picks up the new var.)

If the env var is absent at runtime, the code should **fail gracefully** with a clear log message rather than crash the route. Pattern: see `src/lib/rate-limit-upstash.ts` (no-ops when Upstash vars missing).

---

## Critical paths — extra care required

These code paths run during a live restaurant phone call. A bug here = a real customer hearing dead air.

- `src/app/api/tools/*` — Retell agent tool routes. **Must always return HTTP 200 with a speakable `result` field**, even on internal errors. Retell goes silent on non-2xx. Use `validateRetellBody()` from `src/lib/with-retell-validation.ts`.
- `src/app/api/webhooks/retell/route.ts` — Retell call lifecycle webhook. Drives founder pager + alerts.
- `src/app/api/webhooks/square/route.ts` — Payment confirmation. Must idempotently mark orders paid and either push to POS or insert handoff_orders depending on `restaurants.pos_mode`.
- `src/app/api/finalize-payment/*` — Sends the SMS payment link. Money path.
- `src/app/(dashboard)/handoff/page.tsx` — Realtime tablet view for franchisees on `handoff_tablet` mode.

Touching these = high-risk PR. Tag the PR `risk: high` and tap a second reviewer before merging.

---

## Tagging

Tag `main` whenever a meaningful release ships. Format: `vMAJOR.MINOR-<descriptor>`. Examples:
- `v1.0-pre-pilot` — last commit before the LC franchisee work
- `v1.1-first-paying-client` — when pilot #1 goes live
- `v1.2-handoff-mode-shipped`

```bash
# After merging a release-worthy PR to main:
git checkout main && git pull
git tag -a v1.X-<descriptor> -m "Description of what's in this release"
git push origin v1.X-<descriptor>
```

Vercel automatically deploys every tag too — useful for quickly visiting a past version.

---

## Rolling back

Two options, in order of preference:

1. **Vercel Promote to Production** (fastest, ~5 sec). Vercel → Deployments → click the last green deployment before the bad one → ⋯ menu → Promote to Production. Done. The bad commit stays in git but is no longer serving traffic.
2. **Git revert + push** (slower but keeps git and Vercel in sync). `git revert <bad-sha> && git push origin main`. Vercel auto-deploys the revert.

Use option 1 for an active outage (faster). Use option 2 once the immediate fire is out and you want git history to reflect reality.

---

## Project structure cheat sheet

```
omri/
├── .github/
│   ├── workflows/ci.yml           CI workflow (build/test/lint)
│   ├── pull_request_template.md   PR template
│   └── CODEOWNERS                 Review assignment rules
├── docs/
│   ├── handoff/                   Handoff Mode docs (bilingual Retell, etc)
│   ├── security/                  Security docs (key rotation, OWASP review)
│   ├── security-audit-2026-04-24.md   The 9-item P0 pilot gate
│   └── incident-response.md       What to do when something breaks at 7pm Friday
├── src/
│   ├── app/
│   │   ├── (marketing)/           Public landing pages
│   │   ├── (dashboard)/           Authenticated dashboard + /handoff
│   │   ├── api/                   API routes (tools, webhooks, admin, etc)
│   │   ├── book/                  /book → DEMO_BOOKING_URL redirect
│   │   ├── demo/                  Public web-call demo flow
│   │   └── pay/[id]/              Customer payment page
│   ├── components/                Reusable UI components
│   ├── lib/                       Shared logic
│   │   ├── rate-limit-upstash.ts  Upstash Ratelimit + per-tier LIMITS catalog
│   │   ├── with-validation.ts     Standard route wrapper (rate-limit + Zod)
│   │   ├── with-retell-validation.ts   Voice-tool wrapper (200 + speakable on error)
│   │   ├── schemas/               Zod schemas — one file per route family
│   │   ├── alerts.ts              Founder pager (SMS + email)
│   │   └── supabase/              Supabase clients (server + service-role)
│   └── types/                     Shared TypeScript types
├── supabase/migrations/           SQL migrations, YYYY_MM_DD_*.sql
├── scripts/                       One-off ops scripts (smoke tests, etc)
├── jest.config.ts                 Test config
├── jest.setup.ts                  Loads @testing-library/jest-dom
├── next.config.mjs                Next.js + Sentry config
├── tailwind.config.ts             Brand tokens (obsidian/coal/bone/etc)
└── vercel.json                    Cron schedule + Vercel project hints
```

---

## Quick reference

| Need to... | Do... |
|---|---|
| Add a new API route | Add Zod schema in `src/lib/schemas/<family>.ts`, wrap handler with `withValidation()` (or `validateRetellBody()` for voice tool routes), pick a `LIMITS` tier, add route to OWASP doc inventory |
| Add a new env var | See [Environment variables](#environment-variables) above |
| Add a new database table | See [Database migrations](#database-migrations) above |
| Test a Retell prompt change | Use Retell's Test LLM panel + run regression scenarios from `~/Desktop/Brain Agent/prompt_regression_scenarios.md` BEFORE publishing |
| Roll back a bad deploy | See [Rolling back](#rolling-back) above |
| Investigate a failed webhook | `docs/incident-response.md` → relevant section |

---

## Help

If you're stuck, the fastest path is: read the most-relevant doc above, look at how a similar recent change was made (`git log -p src/app/api/<similar-route>/route.ts`), then ask Misael.
