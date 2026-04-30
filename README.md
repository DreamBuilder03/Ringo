# OMRI

> The phone rings. OMRI handles it.

[![CI](https://github.com/DreamBuilder03/OMRI/actions/workflows/ci.yml/badge.svg)](https://github.com/DreamBuilder03/OMRI/actions/workflows/ci.yml)
[![Vercel](https://img.shields.io/badge/deployed-vercel-black)](https://www.joinomri.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Realtime-3ECF8E)](https://supabase.com)
[![Retell](https://img.shields.io/badge/Voice-Retell%20AI-blueviolet)](https://retellai.com)

OMRI is an AI voice agent that answers every inbound restaurant phone call 24/7. It takes orders, upsells add-ons, sends an SMS payment link, and **only after payment clears** pushes the order to the restaurant's POS. Every call is logged, transcribed, and tracked in a real-time dashboard.

Live at **[www.joinomri.com](https://www.joinomri.com)**.

---

## Why OMRI

The average independent restaurant misses **30%+ of inbound calls during dinner rush**. At an average ticket of $23, that's $1,000+ per day walking out the door for a single high-volume location. OMRI answers every call, so none of that revenue gets dropped.

Three things competitors don't have:
1. **Pay-Before-Prep** — kitchen ticket only fires after Square/Stripe confirms payment. No food made for no-shows.
2. **Handoff Mode** — works for franchises whose POS we can't push to (Caesar Vision, Domino Pulse, etc.) via a realtime tablet view that staff watches.
3. **Managed service** — when something breaks at 7pm Friday, the restaurant calls Misael directly, not a support ticket queue.

---

## Architecture (60-second tour)

```
                                 ┌─────────────────────────┐
                                 │  Customer phone call    │
                                 │  → Twilio number        │
                                 └────────────┬────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────┐
                              │  Twilio SIP trunk → Retell AI   │
                              │  (voice agent, prompt + tools)  │
                              └────────────┬────────────────────┘
                                           │  tool calls
                                           ▼
              ┌────────────────────────────────────────────────────────┐
              │  Next.js API routes (src/app/api/tools/*)              │
              │  lookup-item · add-to-order · confirm-order ·          │
              │  finalize-payment · etc.                                │
              │  Wrapped: rate-limit (Upstash) + Zod validation         │
              └──────────┬─────────────────────────────────┬───────────┘
                         │                                 │
                         ▼                                 ▼
              ┌──────────────────────┐         ┌────────────────────────┐
              │  Supabase (Postgres  │         │  Square Payment Link   │
              │  + RLS + Realtime)   │         │  → SMS to customer     │
              │  restaurants, orders,│         └─────────┬──────────────┘
              │  menu_items, calls,  │                   │
              │  handoff_orders, …   │                   ▼
              └──────┬───────────────┘     ┌──────────────────────────┐
                     │                     │  Square webhook          │
                     │                     │  marks order paid →      │
                     │                     │  branches on pos_mode:   │
                     │                     │   direct_api → POS push  │
                     │                     │   handoff_tablet → row   │
                     │                     │      in handoff_orders   │
                     │                     └────────┬─────────────────┘
                     │                              │
                     ▼                              ▼
       ┌───────────────────────┐     ┌─────────────────────────────────┐
       │  /(dashboard)/*       │     │  /(dashboard)/handoff           │
       │  Owner sees calls,    │     │  Tablet view, Realtime channel, │
       │  orders, menu, ROI    │     │  chime on new paid order        │
       └───────────────────────┘     └─────────────────────────────────┘

           ┌───────────────────────┐
           │  Founder pager        │  ← src/lib/alerts.ts
           │  Twilio SMS +         │     fired by Retell webhook errors
           │  Resend email         │     + tool-route 5xx + silent-line cron
           │  (FOUNDER_ALERT_*)    │
           └───────────────────────┘
```

---

## Tech stack

- **Frontend / SSR:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Database:** Supabase (Postgres + Row-Level Security + Realtime)
- **Voice agent:** Retell AI (English/Spanish bilingual auto-detect)
- **Telephony:** Twilio SIP trunk → Retell
- **Payments:** Square Payment Links (customer payments) + Stripe (OMRI billing tiers)
- **POS integrations:** Square, Toast, Clover, SpotOn (direct API push) + Handoff Mode for proprietary POSes
- **Hosting:** Vercel (auto-deploy from `main`)
- **Rate limiting:** Upstash Redis (`@upstash/ratelimit`)
- **Input validation:** Zod schemas (`src/lib/schemas/*`)
- **Error tracking:** Sentry
- **CRM (per-restaurant):** GoHighLevel (every caller becomes a contact)
- **Email transactional:** Resend
- **CI:** GitHub Actions (`.github/workflows/ci.yml`)

---

## Quickstart

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full local-setup walkthrough.

```bash
git clone https://github.com/DreamBuilder03/OMRI.git
cd OMRI
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                   # http://localhost:3000
```

---

## Where to find things

| Looking for... | Path |
|---|---|
| Public landing pages | `src/app/(marketing)/` |
| Owner dashboard | `src/app/(dashboard)/dashboard/` |
| Admin Ops panel + fleet health | `src/app/(dashboard)/admin/` + `/admin/health` |
| Handoff tablet view (proprietary-POS franchisees) | `src/app/(dashboard)/handoff/` |
| Web demo flow | `src/app/demo/` |
| Customer pay link | `src/app/pay/[id]/` |
| Retell tool routes (called during live calls) | `src/app/api/tools/*` |
| Webhooks (Retell, Square, Stripe) | `src/app/api/webhooks/*` |
| Database migrations | `supabase/migrations/` |
| Security audit (9-item P0 pilot gate) | `docs/security-audit-2026-04-24.md` |
| Key rotation runbook | `docs/security/key-rotation.md` |
| OWASP API Top 10 review | `docs/security/owasp-api-top-10.md` |
| Incident response runbook | `docs/incident-response.md` |
| Bilingual Retell setup | `docs/handoff/bilingual-retell-config.md` |

---

## Status

- **Production:** live at [www.joinomri.com](https://www.joinomri.com)
- **Pre-pilot security gate:** 8 of 9 items green ([audit doc](./docs/security-audit-2026-04-24.md)). Last item (Supabase Pro $25/mo + PITR) is parked until first paying client signs.
- **Pilot #1:** prep complete. Awaiting franchisee signature.

---

## License

Proprietary — © 2026 Launchly / Misael Rodriguez Rivera. All rights reserved.
