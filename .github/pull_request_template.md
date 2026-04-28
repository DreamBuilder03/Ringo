<!--
Keep this short. The point is shared context, not paperwork.
Delete sections that don't apply.
-->

## What changed

<!-- One sentence. e.g. "Adds /handoff page + handoff_orders table for proprietary-POS franchisees." -->

## Why

<!-- Link the spec, issue, memory, or status email that motivated this. e.g.
- LC franchisee handoff spec, 2026-04-27
- Builds on `project_handoff_mode_parked_2026_04_21.md`
-->

## How I tested

<!-- Tick what you did. Be honest — empty boxes are better than fake ticks. -->

- [ ] `npm run build` passes locally
- [ ] `npm test` — same pass count as main (or improved)
- [ ] Hit the changed routes manually and confirmed expected behavior
- [ ] Tested the unhappy path (bad input, network error, missing env var)
- [ ] If migration: ran on a Supabase staging clone first
- [ ] If new env var: documented in CONTRIBUTING.md or docs/security/key-rotation.md

## Risk + rollback

<!--
Tier the risk so the reviewer knows what they're approving:
  - low      = docs/comments/tests only
  - medium   = single isolated route or feature flag
  - high     = touches webhook, payment, auth, or migration
-->

**Risk:** low | medium | high

**Rollback plan:** <!-- e.g. "Vercel → Deployments → previous green → Promote to Production. <30 sec." -->

## Anything reviewer should look at first

<!-- "The validation in src/lib/foo.ts is the heart of this PR — everything else is plumbing." -->
