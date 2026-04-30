# Agent Escalation — Operator Manual (C-4)

**Status:** shipped 2026-04-30 (C-4 of the AI smarter arc).
**Code:** `src/app/api/tools/request-handoff/route.ts`, `src/lib/schemas/tools.ts`.
**Schema:** `supabase/migrations/2026_04_30_handoff_requests.sql`.
**Pager:** `src/lib/alerts.ts` — adds new `handoff_requested` failure type.

When the agent isn't sure it can handle a call, it calls a tool that pages
the founder/owner via SMS + email and tells the caller "someone will call you
back." This is the safety net that prevents stranded callers — the agent
doesn't have to be perfect, it just has to know when it's out of its depth.

---

## How it fires at runtime

1. Caller says something the agent can't handle (allergy question, complaint, request for a manager, third failed `lookup_item`, etc.).
2. Agent calls the `request_handoff` tool with `reason` + `summary`.
3. Route inserts a row in `handoff_requests` and fires `sendFounderAlert({ failureType: 'handoff_requested', ... })`. The alerts library handles dedupe + per-restaurant hourly cap, so a chatty agent can't carpet-bomb your phone.
4. Route returns: *"Got it — I'll have someone from the team call you back in just a few minutes. Is there anything else I can help with right now?"*
5. Owner gets the SMS within ~5 seconds. Body includes restaurant name, reason label, the agent's summary, caller's number, Retell call ID.
6. Owner calls the customer back.

The route always returns 200 with a speakable string, even on validation failure or DB error — Retell goes silent on non-2xx. The agent never gets stuck on this tool.

---

## Reason taxonomy

The `reason` enum is fixed in the migration. Don't invent new values without
updating the CHECK constraint.

| reason | trigger | examples |
|---|---|---|
| `menu_confusion` | 3+ failed `lookup_item` calls in the same conversation, or repeated "no, I don't see that" | "I want a Chicago deep-dish but you don't seem to have it" |
| `allergy_request` | caller mentions allergy, dietary restriction, or asks about ingredients | "Is the marinara nut-free?" "I have a celiac issue" |
| `complaint` | caller is upset about food, service, prior order | "My last order was burnt" "Driver was rude" |
| `refund_request` | caller wants money back | "I want a refund for last night's order" |
| `caller_request` | caller explicitly asked to speak with a human | "Can I talk to the manager?" |
| `large_order` | catering / unusually large quantity | "I need 80 sandwiches for Friday" |
| `agent_uncertainty` | model's own self-rated confidence drops below threshold (when available) | LLM emits `uncertainty_score: 0.4` |
| `other` | anything else worth escalating | rare — write a clear `summary` |

When in doubt, escalate. The cost of a false positive (one extra SMS to the owner) is much smaller than the cost of a stranded caller.

---

## Retell tool schema

Paste this into Retell's tool config for both production agents (English and Spanish). The `result` field returned by our route is what the agent will read back to the caller.

```json
{
  "type": "custom",
  "name": "request_handoff",
  "description": "Call this when you cannot handle the caller's request and need a human from the restaurant to call them back. Use for complaints, allergy questions, refund requests, large catering orders, or any time the caller explicitly asks to speak to a person. After calling this tool, tell the caller 'someone from the team will call you back in a few minutes.'",
  "url": "https://www.joinomri.com/api/tools/request-handoff",
  "speak_during_execution": false,
  "parameters": {
    "type": "object",
    "properties": {
      "reason": {
        "type": "string",
        "enum": [
          "menu_confusion",
          "allergy_request",
          "complaint",
          "refund_request",
          "caller_request",
          "large_order",
          "agent_uncertainty",
          "other"
        ],
        "description": "The category of escalation. Pick the closest fit."
      },
      "summary": {
        "type": "string",
        "description": "One-sentence summary of why you are escalating. The owner reads this in an SMS, so be specific. Example: 'Caller wants to know if the marinara contains tree nuts; I do not have that info.'"
      },
      "uncertainty_score": {
        "type": "number",
        "description": "OPTIONAL. Your confidence that you cannot handle this, from 0 (totally sure you can't) to 1 (totally sure you can but escalating anyway)."
      },
      "callback_phone": {
        "type": "string",
        "description": "OPTIONAL. The caller's number if you have a corrected version. Otherwise we use the call's from_number."
      }
    },
    "required": ["reason", "summary"]
  }
}
```

---

## Prompt template block

Add this block to the system prompt of every production agent. Place it after the order-taking rules and before the closing/farewell rules.

```
=== HUMAN HANDOFF ===

You will sometimes encounter calls you cannot handle. In those cases, do NOT
guess or make something up. Call the request_handoff tool and tell the caller
someone will call them back.

ALWAYS escalate when:
- Caller mentions an allergy or asks about specific ingredients you don't know
  (reason: allergy_request)
- Caller is upset about a previous order, the food quality, or the service
  (reason: complaint)
- Caller wants a refund or to dispute a charge (reason: refund_request)
- Caller explicitly asks to speak with a person, manager, or owner
  (reason: caller_request)
- Caller wants to place a catering or unusually large order (>20 items, or
  asks about catering pricing) (reason: large_order)

ESCALATE WHEN STUCK:
- If you have called lookup_item three times for the same item without finding
  a match, stop guessing — call request_handoff with reason: menu_confusion
- If you genuinely don't know what to do next, call request_handoff with
  reason: agent_uncertainty

WHAT TO SAY AFTER ESCALATING:
After request_handoff returns, the caller will hear: "Got it — I'll have
someone from the team call you back in just a few minutes. Is there anything
else I can help with right now?"

You can take a simple order or answer a quick question after that, but do not
attempt the original difficult task again. Wrap up the call kindly.

REASON SLUG quick guide (pick exactly one):
- menu_confusion / allergy_request / complaint / refund_request /
  caller_request / large_order / agent_uncertainty / other
```

---

## SQL recipes

### See unresolved handoffs across all restaurants

```sql
SELECT
  h.created_at AT TIME ZONE 'America/Los_Angeles' AS created_pt,
  r.name        AS restaurant,
  h.reason,
  h.from_number,
  h.summary
FROM handoff_requests h
JOIN restaurants r ON r.id = h.restaurant_id
WHERE h.resolved_at IS NULL
ORDER BY h.created_at DESC
LIMIT 50;
```

### Mark resolved with a note

```sql
UPDATE handoff_requests
   SET resolved_at = now(),
       resolution_notes = 'Called customer back, took catering order over the phone.'
 WHERE id = '<handoff-id>';
```

### Reason breakdown for the last 30 days

```sql
SELECT
  reason,
  COUNT(*)                                                      AS total,
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)               AS resolved,
  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60.0)::numeric, 1) AS avg_resolve_minutes
FROM handoff_requests
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY reason
ORDER BY total DESC;
```

### Top 10 callers triggering escalations

```sql
SELECT from_number, COUNT(*) AS n
FROM handoff_requests
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY from_number
HAVING COUNT(*) > 1
ORDER BY n DESC
LIMIT 10;
```

(Repeat callers triggering escalations are signal — investigate whether the
agent has a blind spot for that customer's needs.)

---

## Anti-patterns

- **Don't escalate for normal "uhh I'm not sure" moments.** The threshold should be: agent has tried and genuinely can't proceed, OR the topic is on the always-escalate list (allergies, complaints, refunds, large orders, manager requests). A confused agent that escalates every time it stumbles will train the owner to ignore the SMS pager.
- **Don't put PII in the `summary` field beyond what's needed for the callback.** Phone number is fine. Card numbers, SSNs, addresses are not — those should never be on the call in the first place.
- **Don't loop.** If the agent calls `request_handoff` and then the caller asks something else difficult, the agent should NOT call `request_handoff` again on the same call. The `sendFounderAlert` dedupe will swallow it (5-min window on identical reasons), but it wastes tool budget and confuses the agent's state.

---

## Phase 2 follow-ups

1. **Hard handoff (call transfer).** Currently the SMS pager is the entire escalation path — the owner has to call back. A natural upgrade is to use Retell's `transfer_call` API to bridge the active call to a staff phone. Requires (a) `staff_phone_number` column on restaurants, (b) wiring `transfer_call` from the agent prompt, (c) busy/no-answer fallback. Spec ~1 day of work.
2. **Owner dashboard.** A `/dashboard/handoffs` page that lists unresolved escalations with one-click "mark resolved" + transcript link. The RLS policies + indexes are already in place — it's just a Next.js page.
3. **Auto-resolve on callback.** When a caller's number appears in a subsequent paid order within 24h of the escalation, mark the handoff resolved automatically.
4. **Per-restaurant escalation routing.** Some restaurants will want allergies → kitchen manager and complaints → owner. Add a `handoff_routing` JSONB column on restaurants that maps `reason` → `staff_phone`.

---

## Operator quick-reference

| Action | How |
|---|---|
| See pending escalations | SQL query above, or check the SMS pager phone |
| Mark one resolved | `UPDATE handoff_requests SET resolved_at = now(), resolution_notes = '...' WHERE id = '...'` |
| Add a new reason category | Update CHECK constraint on `handoff_requests.reason`, the `requestHandoffSchema` enum, the Retell tool schema, the prompt template, and `reasonLabel()` in the route |
| Disable escalations for a restaurant | Set `restaurants.alerts_enabled = false` — kills both call-failure alerts and handoff pager (rebuild needed for granular control) |
