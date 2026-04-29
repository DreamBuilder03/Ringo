# Returning-Customer Recognition

When a returning customer calls — recognized by their phone number matching past paid orders — the Retell agent greets them by name and offers their last order. Conversion lift is real: "Hi Maria, want your usual?" is faster, friendlier, and converts higher than starting from scratch every time.

This is wired end-to-end as of 2026-04-29. To enable it on a restaurant's agent, two things must be configured.

---

## How it works

```
Caller dials Twilio number
        │
        ▼
Twilio SIP trunk → Retell  (call setup begins)
        │
        ▼
Retell calls /api/retell/inbound  (BEFORE the prompt locks)
   sends: { agent_id, from_number, to_number }
        │
        ▼
Ringo backend:
   1. Look up restaurant by agent_id
   2. Aggregate orders WHERE restaurant_id + customer_phone match
   3. If 0 orders → return { is_returning: false }
   4. If ≥1 paid order → return:
      {
        is_returning: true,
        customer_name: "Maria Garcia",
        total_orders: 7,
        total_spent: "164.32",
        last_order_summary: "12-inch pepperoni and a Coke"
      }
        │
        ▼
Retell injects these as dynamic variables into the system prompt
        │
        ▼
Agent greets caller using {{is_returning}}, {{customer_name}},
{{last_order_summary}} placeholders
```

The whole pre-call lookup adds ~30-80ms to call setup. Caller does not perceive a delay.

---

## Step 1 — Configure Retell agent

In the Retell dashboard for the restaurant's agent (English agent and Spanish agent if both exist):

1. Open the agent → **Voice** tab → scroll to **Inbound Webhook**.
2. Set **Inbound Dynamic Variables Webhook URL** to:

   ```
   https://www.useringo.ai/api/retell/inbound
   ```

3. Save. No header configuration needed — the endpoint authenticates by matching agent_id back to a real restaurant in our DB.

Verify it's wired correctly: place a test call from a phone number that has a past paid order on this restaurant. Check the Retell call log → "Dynamic Variables" panel should show `is_returning: true` plus the customer's name and last order.

---

## Step 2 — Update the agent prompt

Add this block to the **system prompt**, near the top, right after the personality and role description:

```text
═══════════════════════════════════════════════════════════════════════
RETURNING CUSTOMER (auto-detected from phone number)
═══════════════════════════════════════════════════════════════════════
{{is_returning}} indicates whether this caller has past paid orders.

If {{is_returning}} is true:
  - Greet by name: "Hi {{customer_name}}! Welcome back to {{restaurant_name}}."
  - Offer their usual: "Want your usual — {{last_order_summary}} — or
    something different today?"
  - If they say "the usual," confirm: "Got it, {{last_order_summary}}.
    Anything else with that?"
  - If they say "something different," proceed with normal ordering flow.

If {{is_returning}} is false (or this is a first call):
  - Greet generically: "Hi, thanks for calling {{restaurant_name}}.
    What can I get started for you?"
  - Do NOT mention any name or past orders — the caller has none.

NEVER guess or fabricate past orders. If {{last_order_summary}} is empty
or {{customer_name}} is empty, treat the caller as new even if
{{is_returning}} is true.
═══════════════════════════════════════════════════════════════════════
```

Two notes:

1. **Preserve the empty-string fallback.** If for some reason `customer_name` or `last_order_summary` is blank (corner case: the customer placed past orders but never gave a name), the prompt must NOT say "Hi  !" with an awkward gap. The block above handles this with the explicit "NEVER guess" rule.

2. **Bilingual restaurants** (per `docs/handoff/bilingual-retell-config.md`) translate the same block into Spanish and add it parallel. The dynamic variables themselves are language-agnostic.

---

## Apply this when

- A new restaurant is onboarded.
- An existing restaurant requests "personalized greetings" or "remember my regulars."
- Pilot data shows agent transcripts where the caller has obvious order history but the agent treats them as new.

---

## What it doesn't do (yet)

- **Owner corrections to a customer's name** — the system reads the most recent non-empty `customer_name` from the orders table. If the dashboard has a place to edit a customer's display name (it currently doesn't), corrections would flow through automatically because the orders update touches that field. Track as a follow-up if owners ask.
- **Per-language `last_order_summary`** — the summary is generated from menu item names as stored. A bilingual restaurant where menu items have English-only names will sound English even when the customer is Spanish-speaking. Acceptable for pilot; revisit when we have a Spanish menu seed convention.
- **Order frequency-aware suggestions** — "We haven't seen you in a while" or "you usually order on Fridays" — both deferred to Phase 3 personalization. Track in `~/Desktop/Brain Agent/phase3_personalization_spec.md` (does not exist yet — create when we have data to motivate it).

---

## Failure modes

The webhook is on the live-call critical path. If Ringo's endpoint is slow or down, Retell falls back to the agent's default greeting after a short timeout. Worst case: the caller is treated as new even if they're a regular. The call still connects. We don't strand customers on a Ringo outage.

To check the webhook is healthy: hit `https://www.useringo.ai/api/retell/inbound` with a sample payload (see implementation comments in `src/app/api/retell/inbound/route.ts` for the request shape) and confirm a 200 with a `call_inbound.dynamic_variables` envelope.
