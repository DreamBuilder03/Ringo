# Thermal Printer Integration — Design Doc (B1 of LC Sprint, deferred from Build 1)

**Status:** Design only · NOT YET BUILT.
**Owner:** next session.
**Estimated effort:** 1-2 hours after architectural decision below.

The Brain Agent sprint spec asks for "ESC/POS to TCP port 9100 within 3 seconds of payment confirmation, retry every 15s for 3 min, fall back to GHL contact tag." That's the **end-state behavior**. The reason this isn't already done is the spec assumes a network reachability that doesn't exist in production restaurants.

This doc lays out the three real architectural options, recommends one, and writes the acceptance criteria + work breakdown so the next session implements without re-deciding.

---

## The reachability problem

> "Open a TCP socket from Vercel to 192.168.1.42:9100 and write ESC/POS bytes."

This **does not work** because:

1. The kitchen printer at a Little Caesars sits on a private LAN behind NAT (Spectrum Business / AT&T / Comcast home-grade router). Its IP is 192.168.x.x — unroutable from the public internet.
2. Even if the franchisee port-forwarded TCP 9100 to the printer, exposing a kitchen printer to the open internet is a security disaster (DoS, spam printing, ransomware vector).
3. Dynamic IPs and ISP rotation mean the public IP changes; we'd need DDNS per location.

So we need a **relay**: something on the restaurant's local network that we can talk to via the public internet, that then talks to the printer locally.

---

## Three options

### Option A — PrintNode (cloud relay, paid SaaS)

**How:** Restaurant installs the PrintNode agent on any always-on PC/Mac/RaspPi on the local network. The agent connects to PrintNode's cloud, registers the local printer, and waits for jobs. We POST a print job to PrintNode's API; they relay to the agent; the agent prints.

**Pros:**
- 30-min wiring. PrintNode has a clean REST API and an npm SDK.
- Reliable. Used by thousands of POS startups.
- Supports the entire ESC/POS spec out of the box; no byte-level coding.
- Built-in retry, queueing, status tracking, multi-printer per location.

**Cons:**
- $5–10/mo per location. At pilot #1 = trivial. At 100 LC stores = $500–1000/mo OPEX. We'd absorb it (still a fraction of our $799/mo per location).
- Vendor lock-in. If PrintNode goes down or rugs us, we have a Build-It-Ourselves migration.
- Requires the franchisee install + maintain the agent on a local PC.

**Cost model:** $5–10/mo per location → built into the plan_tier pricing.

### Option B — Star Micronics CloudPRNT (printer-side cloud)

**How:** Buy Star CloudPRNT-capable printers (TSP143IIIW, TSP100IV-CLOUDPRNT). The printer itself polls our server every N seconds asking "any jobs?" — no agent, no LAN access from us, the printer initiates the TCP connection outbound.

**Pros:**
- No restaurant-side software install. Just plug the printer in + give it Wi-Fi credentials.
- No SaaS vendor in the path — printer talks directly to our server.
- Cleanest long-term architecture.

**Cons:**
- Only works with Star CloudPRNT printers (~$300 each, vs ~$150 for a generic ESC/POS network printer).
- We'd require franchisees to either own the right printer model OR buy one. Friction.
- Polling latency: printer polls every 10s by default, so payment-to-print is up to 10s (above the 3s spec).

**Cost model:** $300 hardware per location. Pay once, then $0/mo.

### Option C — Print-via-tablet (piggyback the existing /handoff Realtime channel)

**How:** The /handoff tablet view already exists (Build 1) and receives every paid order via Supabase Realtime. Add a small "Print" button on each order card that calls a native iOS/Android Bluetooth printer SDK. Staff taps Print, the tablet prints over Bluetooth to a printer paired with the tablet.

**Pros:**
- No new server-side infra. We already have the tablet view + realtime channel.
- No SaaS cost.
- Works with cheap Bluetooth ESC/POS printers ($50-100).

**Cons:**
- Requires staff tap. Not autonomous "fires within 3 seconds of payment" per spec.
- Needs a small native iOS/Android app or a PWA with WebBluetooth (PWA WebBluetooth has device-permission UX issues on iOS).
- Doesn't cleanly automate retries.

**Cost model:** $50-100 hardware per location, no recurring.

---

## Recommendation: Option A (PrintNode) for V1, Option B (CloudPRNT) for V2 at scale

**Reasoning:**
- Option A meets the spec's autonomy requirement (no staff tap, fires within 3s).
- Wiring effort is 1-2 hours not days.
- $5-10/mo/location is invisible at our price point.
- Option C is a fine fallback safety net (the staff can always print from the tablet manually if the PrintNode agent is down).
- Option B becomes the better answer once we have 30+ LC locations and the per-month PrintNode cost matters; switching is a 1-day migration because both speak ESC/POS over a network at the application layer.

**Plan:** ship Option A in the next session. Park Option B as a Phase 3 cost-optimization. Keep Option C as the "agent unreachable → staff tap from tablet" manual fallback.

---

## Acceptance criteria for V1 (Option A · PrintNode)

When a paid order is created in a restaurant where `restaurants.printer_provider = 'printnode'`:

1. **Within 3 seconds** of `orders.status` transition to `paid`, the print job appears in PrintNode's queue.
2. The kitchen printer prints a receipt with: order number (last 6 of order id), customer name + last 4 of phone, items with sizes/mods/qty, subtotal/tax/total paid, special notes, print timestamp.
3. **If the PrintNode agent is offline** (printer unreachable):
   - Founder pager fires `tool_call_failure: printer offline at <restaurant>` SMS within 60 seconds.
   - The order remains visible on the /handoff tablet view (Option C fallback).
   - PrintNode auto-retries every 15s for 3 minutes.
   - If still failing after 3 minutes, the order is tagged in GHL CRM as `URGENT — manual order` for the owner's manual outreach.
4. The print job is stored in a new `print_jobs` table for forensic audit (status, retry_count, last_error).
5. **Toggle per restaurant.** A restaurant with `printer_provider = null` skips the print path entirely (back to Handoff tablet only). Migration default: `null`.

---

## Work breakdown (1-2 hours next session)

1. **Migration** — Add `printer_provider TEXT NULL` + `printer_meta JSONB DEFAULT '{}'` to `restaurants`. Create `print_jobs` table (id, restaurant_id, order_id, status, retry_count, last_error, created_at, last_attempted_at). RLS + indexes.
2. **PrintNode SDK** — `npm i printnode-node` (or hand-roll fetch — their REST API is small). Add `PRINTNODE_API_KEY` env var.
3. **Render template** — `src/lib/printer-templates.ts` with a `renderEscPosOrder(order, restaurant)` function returning a base64-encoded ESC/POS payload (PrintNode accepts base64 raw bytes via the `contentType: 'raw_base64'` print job type).
4. **Trigger** — In `src/app/api/webhooks/square/route.ts`, after the order is marked paid, branch on `restaurants.printer_provider`. If `printnode`, fire-and-forget print job + insert print_jobs row.
5. **Retry cron** — `src/app/api/cron/printer-retry/route.ts` running every 15 seconds (Vercel Hobby limits to 1/min, so use Pro tier OR poll PrintNode for status changes via webhook).
6. **GHL fallback** — After 3 min of retries failing, tag the GHL contact via existing `/api/sms` GHL routing.
7. **Tests** — Unit test `renderEscPosOrder()` matches the spec format. Integration test the trigger fires on paid status with mocked PrintNode.
8. **Doc** — Update `lc_onboarding_runbook.md` with PrintNode agent install instructions for franchisees.

---

## What to ship to the franchisee BEFORE this is wired

For now, every LC location runs `pos_mode = handoff_tablet` with NO printer. Staff sees orders on the iPad and writes the ticket by hand into Caesar Vision Cloud. That's the LC sprint's currently-acceptable failure mode.

When the V1 PrintNode integration ships:
1. Mail the franchisee a $50 ESC/POS network printer (Epson TM-T20III is the workhorse).
2. Mail PrintNode setup instructions: install agent on existing kitchen iPad/PC, link printer.
3. We toggle `printer_provider = 'printnode'` and `printer_meta = {"printer_id": <PrintNode ID>}` in their restaurant row.
4. Next paid order auto-prints. Tablet view stays available as backup.

---

## Why we can ship the LC pilot WITHOUT this

The LC franchisee Misael is talking to right now is operating on a proprietary POS (Caesar Vision Cloud) that we cannot drive directly anyway. The Handoff tablet view (already built, /handoff page) plus staff manually transcribing into Caesar Vision is the current state and will remain the state for the first 1-2 LC pilots while we observe whether the printer integration is the right next investment, or whether we should instead invest in **Caesar Vision API access** (which would let us push directly to LC's POS and skip both the tablet AND the printer).

Decision deferred to: after first 30 days of pilot data.
