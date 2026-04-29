# Per-Restaurant Prompt Overrides

Each restaurant can customize what their Retell agent says — without changing code, without redeploying, without needing a separate prompt per restaurant — by setting key→string pairs on `restaurants.prompt_overrides`. The inbound webhook injects these as Retell dynamic variables on every call.

**Wired and live as of 2026-04-29.**

---

## Why this exists

Without this, every restaurant tweak (different upsell line, brand-specific sign-off, today's special) requires either:
- Editing the agent's system prompt in Retell dashboard (manual, easy to forget on multi-agent restaurants), OR
- Maintaining N agents with N copy-pasted prompts that drift over time.

With this, the prompt template stays the same across restaurants. Restaurants override the bits that matter via SQL (today) or a dashboard UI (future).

---

## How it works

```
┌────────────────────────────────────────────────────────────────┐
│  Restaurant row in Supabase:                                    │
│  prompt_overrides = {                                           │
│    "upsell_focus": "Push the new garlic knots — $4.99",        │
│    "special_notice": "Closed Sunday May 4 for inventory."      │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
       Customer dials → Retell calls /api/retell/inbound
                            │
                            ▼
       Webhook reads prompt_overrides + returns dynamic_variables:
       {
         is_returning: false,                    ← from C-1 logic
         upsell_focus: "Push the new garlic knots — $4.99",
         special_notice: "Closed Sunday May 4 for inventory."
       }
                            │
                            ▼
       Retell injects {{upsell_focus}} and {{special_notice}}
       into the prompt → agent uses them naturally on the call
```

---

## Conventional keys

These are the recommended keys. Restaurants can use any keys they want — these are just the patterns the prompt template knows how to use.

| Key | Purpose | Example value |
|---|---|---|
| `greeting_addition` | Extra line appended after default greeting | `"We're under new management as of April 1 — welcome!"` |
| `upsell_focus` | What to push today | `"Push the Crazy Bread + Crazy Sauce combo for $5.99"` |
| `special_notice` | Temporary notice, hours, closures | `"Closed for renovations May 1-3. Reopening May 4."` |
| `tone_modifier` | Personality tweak | `"Extra warm and chatty. Use lots of 'awesome' and 'absolutely'."` |
| `brand_signoff` | Closing line on every call | `"Thank you for choosing Sal's. Have a great evening."` |
| `dialect_notes` | Pronunciation guidance | `"Say 'Cae-sars' with a hard C, not 'See-zers'."` |

---

## Sanitization (the webhook drops these silently)

The webhook caps overrides to defend against runaway data:

- **Strings only.** Booleans, numbers, arrays, nested objects all dropped.
- **500 chars per value max.** Anything longer is dropped.
- **20 keys max.** After 20, additional keys are dropped.
- **Safe key shape only.** Keys must match `^[a-zA-Z_][a-zA-Z0-9_]*$` (letters, digits, underscores; can't start with a digit). Anything with spaces, dashes, dots, etc. is dropped.
- **Reserved keys blocked.** These are owned by C-1 returning-customer recognition and cannot be overridden:
  - `is_returning`
  - `customer_name`
  - `total_orders`
  - `total_spent`
  - `last_order_summary`

If you need a custom key that collides with a reserved name, prefix it (e.g. `caller_customer_name` instead of `customer_name`).

---

## Setting overrides (today: SQL; later: dashboard)

Until the dashboard editor ships, owners or Misael set overrides via the Supabase SQL Editor:

```sql
UPDATE public.restaurants
SET prompt_overrides = '{
  "upsell_focus": "Push the new garlic knots — $4.99",
  "special_notice": "Closed Sunday May 4 for inventory.",
  "brand_signoff": "Thank you for choosing Sal''s. Have a great evening."
}'::jsonb
WHERE id = '<restaurant-uuid>';
```

(Note the doubled `''` for the apostrophe in `Sal's` — that's SQL escaping, not a typo.)

To MERGE additional keys without losing existing ones:

```sql
UPDATE public.restaurants
SET prompt_overrides = prompt_overrides || '{"tone_modifier": "Extra warm"}'::jsonb
WHERE id = '<restaurant-uuid>';
```

To REMOVE a key:

```sql
UPDATE public.restaurants
SET prompt_overrides = prompt_overrides - 'special_notice'
WHERE id = '<restaurant-uuid>';
```

To RESET to empty:

```sql
UPDATE public.restaurants
SET prompt_overrides = '{}'::jsonb
WHERE id = '<restaurant-uuid>';
```

The change takes effect on the **next** inbound call (no caching layer in front of the webhook).

---

## Updating the agent prompt to use overrides

Add the relevant `{{key}}` placeholders to the system prompt. Example block:

```text
═══════════════════════════════════════════════════════════════════════
RESTAURANT-SPECIFIC INSTRUCTIONS (set per-restaurant in OMRI dashboard)
═══════════════════════════════════════════════════════════════════════
{{greeting_addition}}

If today there's a special notice the customer should know about:
{{special_notice}}

Today's upsell focus (push this when customer is open to it):
{{upsell_focus}}

Tone & personality guidance for this restaurant:
{{tone_modifier}}

Always close the call with this line (only after order is locked in):
{{brand_signoff}}

If pronunciation matters for this restaurant:
{{dialect_notes}}
═══════════════════════════════════════════════════════════════════════
```

**Important:** if a key is empty (the restaurant didn't set it), Retell substitutes empty string. The prompt block above is written so empty strings are harmless — `If today there's a special notice...` followed by an empty value reads fine. Don't write prompt blocks that produce awkward sentences when a variable is empty.

---

## Apply this when

- A franchisee asks "can you push the new combo this week?" (set `upsell_focus`)
- Hours change for a holiday or closure (set `special_notice`, then unset after)
- A new restaurant has a unique pronunciation (set `dialect_notes`)
- An owner wants the agent to say their tagline at the end of every call (set `brand_signoff`)

---

## What this doesn't do (yet)

- **Dashboard UI to edit overrides.** Today: SQL. Tomorrow: an admin dashboard form. Out of scope for C-2; track as a Phase-3 polish task.
- **Override expiration / auto-clear.** A `special_notice` set today still fires next year unless an owner remembers to remove it. Add a `clear_after` timestamp pattern in a future iteration.
- **Per-language overrides.** A restaurant with a Spanish agent gets the same overrides for both languages. If the Spanish agent should say something different, that's an additional `dialect_notes_es` convention or a separate agent. Defer until requested.
- **Validation in the dashboard at edit time.** Today's sanitization happens at webhook-read time, so a 600-char value is silently truncated-by-rejection on the call. The future dashboard editor should warn at entry time.

---

## Failure mode

If `prompt_overrides` is malformed JSON (shouldn't happen — JSONB column refuses bad input at write time), the inbound webhook treats it as `{}` and continues with returning-customer-only data. Calls never break because of override config.

If the restaurants row doesn't have a `prompt_overrides` column yet (pre-migration), the SELECT returns `null` and the webhook treats it as `{}`. Migration `2026_04_29_prompt_overrides.sql` adds the column with a default of `'{}'::jsonb` so this should never happen on a migrated DB.
