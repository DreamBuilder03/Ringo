# OMRI POS Coverage Architecture

OMRI is built to work with **every restaurant**, regardless of which POS they run. Different POS systems get different integration fidelity — but no restaurant should ever hear "sorry, we don't support your POS." This doc is the canonical reference for what's at which tier, what code lives where, and what's needed to promote a tier.

If this doc disagrees with the code, the code is right and this doc is stale — open a PR.

---

## The four tiers

| Tier | Customer experience | Operator experience | Onboard time |
|------|---------------------|---------------------|---------------|
| **1 — Native** | Calls → voice agent → SMS pay link → order in their POS automatically | Zero touch. Kitchen ticket fires the moment the customer pays. | 24–48 hours once POS partner agreement is in place |
| **2 — Tablet handoff** | Same call → SMS pay → order appears on a tablet at the counter | Staff reads the structured order off the tablet and types it into their POS. Single re-entry step. | 24 hours — just need the tablet and `/handoff` URL |
| **3 — Print/text handoff** | Same call → SMS pay → kitchen ticket prints OR staff phone receives text | Staff reads the printed/texted order, manually enters into POS. | 24 hours — works with any kitchen printer or any staff phone |
| **4 — Voice-only** | Same call → voice agent → summary SMS to operator | No POS push at all. Operator handles order via the text. | Same day |

The voice flow (call answering, order taking, upsell, Pay-Before-Prep gate, payment SMS) is **identical across all four tiers.** Only the order-delivery mechanism differs. That's the architectural keystone — voice is the product, POS is the adapter.

---

## What's at which tier today

| POS | Tier | Status | Notes |
|-----|------|--------|-------|
| **Square** | 1 — Native | ✅ Live in production | OAuth per-restaurant. Payment via Square Payment Links API. Webhook fires on `payment.completed` → kitchen ticket pushes via `/api/pos/square`. |
| **Clover** | 1 — Native | ✅ Live (no partner program needed) | OAuth per-restaurant. Payment via Clover Hosted Checkout (`/invoicingcheckoutservice/v1/checkouts`). Webhook handler at `/api/webhooks/clover` matches order by `payment_intent_id = checkoutSessionId`. |
| **Toast** | 1 — Native | ⏳ Built, awaits partner approval | Toast Integration Partner Application submitted 2026-05-13 (up to 30-day response window). Currently runs in **MOCK mode** — same code paths, deterministic canned responses. Flips to LIVE the moment `TOAST_MODE=live` + `TOAST_CLIENT_ID` + `TOAST_CLIENT_SECRET` are set in Vercel. Tier 3 Handoff Mode is the bridge product for Toast restaurants until partner approval lands. |
| **SpotOn** | 1 — Native | Stub | OAuth route exists, order push stub exists. Promote by applying to SpotOn partner program + filling in payment-link generation. Loman recently added them; we should follow. |
| **Any cloud POS** | 2 — Tablet | ✅ Live | `/handoff` page (336 LOC, shipped 2026-04-27) — Supabase Realtime push. Works for any POS that runs on a tablet or computer. |
| **Proprietary corporate POS** (Little Caesars Caesar Vision Cloud, Domino's PULSE, Wingstop, Papa John's, Jet's) | 3 — Print/text | Designed, parked | Build trigger: pilot #3 OR a pilot asks for proprietary-POS support OR LC corporate warm intro. See `~/Desktop/Brain Agent/builder_handoff_pilot_readiness.md` for the build spec. |
| **No POS at all** | 4 — Voice | Works by default | Voice agent + SMS summary to operator. Works for ghost kitchens, food trucks, mom-and-pops on paper. |

---

## Code map

```
Voice flow (shared across all tiers)
└── /api/tools/lookup-item        — menu read, branches on pos_type
└── /api/tools/add-to-order       — order item add, branches on pos_type
└── /api/tools/confirm-order      — order confirmation, branches on pos_type
└── /api/tools/finalize-payment   — payment link generation, branches on pos_type
└── /api/tools/cancel-order       — order void
└── /api/tools/get-modifiers      — modifier groups
└── /api/tools/request-handoff    — escalate to human

Tier 1 — Native (per-POS adapter pattern)
├── Square
│   ├── /api/pos/square/route.ts        — OAuth callback + order push
│   ├── /api/webhooks/square/route.ts   — payment.completed handler
│   └── finalize-payment Square branch  — Square Payment Links API
├── Clover
│   ├── /api/pos/clover/route.ts        — OAuth callback + order push
│   ├── /api/webhooks/clover/route.ts   — CHECKOUT.COMPLETED handler
│   ├── /lib/clover/webhook-utils.ts    — pure helpers (event matcher + ID extractor)
│   └── finalize-payment Clover branch  — Clover Hosted Checkout
├── Toast
│   ├── /api/pos/toast/route.ts         — order push + B4 guest sync
│   ├── /api/webhooks/toast/route.ts    — payment.cleared handler
│   ├── /api/pos/toast/authorize/route.ts — manual credential save (Toast doesn't OAuth standard)
│   ├── /api/toast/menu/route.ts        — admin probe / menu snapshot view
│   ├── /lib/toast/toast-client.ts      — mock-first API client (MOCK/LIVE mode)
│   ├── /lib/toast/toast-availability.ts — pure helpers (isOpenNow, findItem, validatePickupTime)
│   └── finalize-payment Toast branch   — Toast customer payment URL
└── SpotOn
    ├── /api/pos/spoton/route.ts        — order push stub
    └── /api/pos/spoton/authorize/route.ts — credential save stub

Tier 2 — Tablet handoff
├── /handoff page (336 LOC)              — Supabase Realtime tablet view
├── /api/webhooks/square handoff branch  — writes handoff_orders row when pos_mode='handoff_tablet'
└── handoff_orders table (migration 2026_04_27_handoff_mode.sql)

Tier 3 — Print/text handoff
└── Parked — spec in ~/Desktop/Brain Agent/builder_handoff_pilot_readiness.md

Tier 4 — Voice-only
└── No POS push needed. The voice flow already produces transcripts +
    summaries that get emailed to the operator via the missed-call alert
    template and Square webhook order-paid email path. Operator handles
    via SMS or the dashboard.

Shared cache + alerts
├── /lib/restaurant-cache.ts            — Upstash 5-min menu cache (Square + Toast namespaces)
├── /lib/alerts.ts                      — founder pager (SMS + email)
└── alerts_log table                    — alert dedupe + sync-event logging
```

---

## How to promote a tier

### Tier 2 → Tier 1 (for a POS we already have an adapter for)

This is the **Toast post-partner-approval path** today.

1. Make sure the OAuth flow is wired (Toast: requires partner credentials; Square + Clover: already wired).
2. Set the LIVE-mode env vars in Vercel (e.g. `TOAST_MODE=live`, `TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET`).
3. On the restaurant row, set `pos_type='toast'` + the POS-specific identifier (`toast_restaurant_guid`, `clover_merchant_id`, `square_location_id`).
4. Configure the POS-side webhook URL in the POS partner dashboard:
   - Square: already configured
   - Clover: `https://joinomri.com/api/webhooks/clover` + set `CLOVER_WEBHOOK_SECRET` in Vercel
   - Toast: `https://joinomri.com/api/webhooks/toast` + set `TOAST_WEBHOOK_SECRET` in Vercel
5. Run a test order end-to-end before flipping a restaurant to production. Use the regression-test scenarios in `~/Desktop/Brain Agent/prompt_regression_scenarios.md`.

### Tier 3 → Tier 1 (proprietary POS, new POS adapter)

1. Apply to the POS partner program.
2. Once partner-approved, build a new POS adapter following the Square pattern:
   - `/api/pos/{posname}/route.ts` (OAuth + order push)
   - `/api/webhooks/{posname}/route.ts` (payment event handler)
   - Branch in `/api/tools/finalize-payment` to use the POS's payment-link API
3. Add per-restaurant columns for the POS's credentials (`{posname}_access_token`, `{posname}_merchant_id`, etc.).
4. Add a `pos_type='{posname}'` to the `restaurants.pos_type` check constraint.

### Tier 4 → Tier 3 (light upgrade for non-POS restaurants)

1. Set the restaurant's `pos_mode='handoff_tablet'` and provision the `/handoff` URL on a tablet at the counter.
2. Or: provision a kitchen printer integration via PrintNode (spec parked in `~/Desktop/Brain Agent/builder_handoff_pilot_readiness.md`).

---

## Competitive positioning

Every other AI voice product in the restaurant space (Loman, Slang, Hostie, SoundHound, Incept) is gated on **single-POS-partner status.** They can't onboard a Toast restaurant until their Toast partner agreement signs, and they have nothing to offer in the meantime.

OMRI's multi-tier architecture means:

1. A Toast restaurant can be live on OMRI tomorrow via Tier 3 Handoff Mode while we wait for Toast partner approval.
2. A Little Caesars or Domino's franchisee — who literally cannot use most AI voice products because of corporate-mandated proprietary POS — can use OMRI via Tier 3 Print/text handoff.
3. A Square or Clover restaurant gets Tier 1 native integration today, with the same voice product.

That's the moat. Voice is the product. POS is the adapter. The architecture makes that real.

---

## Maintenance rules

1. **Voice flow stays POS-agnostic.** Every tool route (`lookup-item`, `add-to-order`, `confirm-order`, `finalize-payment`) branches on `restaurant.pos_type`. The voice agent itself has zero POS knowledge.
2. **Mock-first for partner-gated POS.** Any POS that requires partner approval (Toast, SpotOn) gets a mock client first, with MOCK/LIVE mode detection via env vars. Real API integration only after partner approval lands. See `src/lib/toast/toast-client.ts` for the canonical pattern.
3. **Webhook handlers are signature-verified.** Soft-fail when the secret env var is unset (dev / pre-deploy), strict once set. See `verifyToastSignature`, `verifyCloverSignature`, `verifyTwilioSignature`.
4. **Every payment-clearance failure pages the founder.** P0 — the customer has paid and the kitchen ticket won't fire without manual intervention. See `sendFounderAlert` calls in webhook handlers.
5. **Pay-Before-Prep is non-negotiable.** No POS adapter is allowed to fire the kitchen ticket before the customer has actually paid. This is the differentiator vs every other AI voice product.

---

## Open questions

- **Toast Online Ordering partner program** — separate from the integration partner agreement we submitted on 2026-05-13. Required for native Toast customer-payment-link generation. Apply once we have one paying Toast restaurant.
- **PrintNode integration for Tier 3 Print Handoff** — spec parked. Build trigger is pilot #3 OR a franchisee asks for proprietary-POS support.
- **Multi-location Toast accounts** — `toast_management_group_guid` column exists. The architecture supports it but no code path exercises it yet. Add when a multi-location operator signs.

---

*Last updated: 2026-05-14. Update when promoting tiers, adding new POS adapters, or moving Toast / SpotOn from pending to live.*
